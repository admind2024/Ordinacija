import { useState, useMemo, useEffect } from 'react';
import {
  Calendar, TrendingUp, CreditCard, Users, FileText, Package,
  Printer, Download, Receipt, ReceiptText, Wallet,
} from 'lucide-react';
import Card from '../components/ui/Card';
import { useCalendar } from '../contexts/CalendarContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid,
} from 'recharts';

import { supabase } from '../lib/supabase';
import { APPOINTMENT_STATUS_LABELS } from '../types';
import { exportToExcel, printToPdf, type ReportExport } from '../lib/exportReport';

// Brand boje za grafikone
const CHART_COLORS = {
  primary: '#2BA5A5',
  primaryLight: '#66D1D1',
  accent: '#C4956F',
  accentLight: '#E4B890',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F97316',
  gray: '#9CA3AF',
};

// ============================================================
// Reports — smireni monohromatski stil + materijali sekcija
// Jedna akcentna boja (primary) za highlights. Sve ostalo neutralno.
// ============================================================

interface MaterialStat {
  material_id: string;
  naziv: string;
  jedinica: string;
  kolicina: number;
  cijena: number;   // nabavna
  vrijednost: number; // kolicina * cijena
}

export default function Reports() {
  const { appointments, doctors } = useCalendar();

  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  // Filtrirani termini po datumu i ljekaru
  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const d = new Date(a.pocetak);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dateStr < dateFrom || dateStr > dateTo) return false;
      if (selectedDoctor !== 'all' && a.doctor_id !== selectedDoctor) return false;
      return true;
    });
  }, [appointments, selectedDoctor, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter((a) => a.status === 'zavrsen').length;
    const cancelled = filtered.filter((a) => a.status === 'otkazan').length;
    const noShow = filtered.filter((a) => a.status === 'nije_dosao').length;
    const revenue = filtered
      .filter((a) => a.status === 'zavrsen')
      .reduce((sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0);
    const allRevenue = filtered
      .reduce((sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0);
    const realizationRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
    const avgValue = completed > 0 ? (revenue / completed).toFixed(2) : '0';
    const uniquePatients = new Set(filtered.map((a) => a.patient_id)).size;

    return { total, completed, cancelled, noShow, revenue, allRevenue, realizationRate, avgValue, uniquePatients };
  }, [filtered]);

  // Fiskalizovani pregledi u periodu
  const [examCount, setExamCount] = useState(0);

  useEffect(() => {
    supabase.from('examinations')
      .select('id', { count: 'exact' })
      .eq('status', 'zavrsen')
      .gte('datum', dateFrom)
      .lte('datum', dateTo)
      .then(({ count }) => setExamCount(count || 0));
  }, [dateFrom, dateTo]);

  // Payments u periodu — podjela fiskal vs bez fiskala
  const [paymentsAgg, setPaymentsAgg] = useState({
    total: 0, count: 0,
    fiskalTotal: 0, fiskalCount: 0,
    neFiskalTotal: 0, neFiskalCount: 0,
    dug: 0, duznika: 0,
  });

  useEffect(() => {
    (async () => {
      const fromTs = `${dateFrom}T00:00:00`;
      const toTs = `${dateTo}T23:59:59`;
      const [{ data: pays }, { data: debts }] = await Promise.all([
        supabase.from('payments').select('iznos, metoda, fiskalni_status').gte('datum', fromTs).lte('datum', toTs),
        supabase.from('dugovanja').select('preostalo, patient_id').eq('status', 'aktivan'),
      ]);
      let total = 0, count = 0, fiskalTotal = 0, fiskalCount = 0, neFiskalTotal = 0, neFiskalCount = 0;
      for (const p of pays || []) {
        const iznos = Number(p.iznos) || 0;
        const metoda = p.metoda || '';
        const isFiskal = metoda.endsWith('_fiskalni') || p.fiskalni_status === 'success' || p.fiskalni_status === 'done';
        total += iznos; count++;
        if (isFiskal) { fiskalTotal += iznos; fiskalCount++; }
        else { neFiskalTotal += iznos; neFiskalCount++; }
      }
      const dug = (debts || []).reduce((s, d) => s + Number(d.preostalo || 0), 0);
      const duznika = new Set((debts || []).map((d) => d.patient_id)).size;
      setPaymentsAgg({ total, count, fiskalTotal, fiskalCount, neFiskalTotal, neFiskalCount, dug, duznika });
    })();
  }, [dateFrom, dateTo]);

  // Materijali iz material_usage u izabranom periodu
  const [materialStats, setMaterialStats] = useState<MaterialStat[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setMaterialLoading(true);
      let q = supabase
        .from('material_usage')
        .select('material_id, kolicina, ljekar_id, datum, material:materials(naziv, jedinica_mjere, nabavna_cijena)')
        .gte('datum', dateFrom)
        .lte('datum', dateTo);
      if (selectedDoctor !== 'all') q = q.eq('ljekar_id', selectedDoctor);

      const { data } = await q;
      const map = new Map<string, MaterialStat>();
      for (const u of (data || []) as any[]) {
        const mid = u.material_id;
        const mat = u.material;
        if (!mid || !mat) continue;
        const kolicina = Number(u.kolicina) || 0;
        const cijena = Number(mat.nabavna_cijena) || 0;
        const existing = map.get(mid);
        if (existing) {
          existing.kolicina += kolicina;
          existing.vrijednost += kolicina * cijena;
        } else {
          map.set(mid, {
            material_id: mid,
            naziv: mat.naziv || '—',
            jedinica: mat.jedinica_mjere || 'kom',
            kolicina,
            cijena,
            vrijednost: kolicina * cijena,
          });
        }
      }
      setMaterialStats(Array.from(map.values()).sort((a, b) => b.vrijednost - a.vrijednost));
      setMaterialLoading(false);
    })();
  }, [dateFrom, dateTo, selectedDoctor]);

  const materialTotals = useMemo(() => ({
    ukupnoStavki: materialStats.length,
    ukupnoVrijednost: materialStats.reduce((s, m) => s + m.vrijednost, 0),
    ukupnoKolicina: materialStats.reduce((s, m) => s + m.kolicina, 0),
  }), [materialStats]);

  // Po ljekaru
  const doctorStats = useMemo(() => {
    return doctors.map((doctor) => {
      const docApts = filtered.filter((a) => a.doctor_id === doctor.id);
      const completed = docApts.filter((a) => a.status === 'zavrsen').length;
      const revenue = docApts
        .filter((a) => a.status === 'zavrsen')
        .reduce((sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0);
      const allRevenue = docApts
        .reduce((sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0);
      const uniquePatients = new Set(docApts.map((a) => a.patient_id)).size;

      return {
        doctor,
        total: docApts.length,
        completed,
        cancelled: docApts.filter((a) => a.status === 'otkazan').length,
        noShow: docApts.filter((a) => a.status === 'nije_dosao').length,
        revenue,
        allRevenue,
        avgValue: completed > 0 ? revenue / completed : 0,
        realizationRate: docApts.length > 0 ? (completed / docApts.length) * 100 : 0,
        uniquePatients,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [doctors, filtered]);

  // Chart data: status breakdown (pie)
  const statusChartData = useMemo(() => [
    { name: 'Završeni',  value: stats.completed, color: CHART_COLORS.primary },
    { name: 'Zakazani',  value: Math.max(0, stats.total - stats.completed - stats.cancelled - stats.noShow), color: CHART_COLORS.primaryLight },
    { name: 'Otkazani',  value: stats.cancelled, color: CHART_COLORS.warning },
    { name: 'No-show',   value: stats.noShow,    color: CHART_COLORS.danger },
  ].filter((d) => d.value > 0), [stats]);

  // Chart data: dnevni prihod (area)
  const dailyRevenueData = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of filtered) {
      if (a.status !== 'zavrsen') continue;
      const d = new Date(a.pocetak);
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      const rev = (a.services || []).reduce((s, svc) => s + svc.ukupno, 0);
      map.set(key, (map.get(key) || 0) + rev);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([datum, prihod]) => ({ datum, prihod: Math.round(prihod) }));
  }, [filtered]);

  // Chart data: prihod po ljekaru (bar)
  const doctorBarData = useMemo(() =>
    doctorStats
      .filter((r) => r.revenue > 0)
      .map((r) => ({
        ime: `${r.doctor.titula || ''} ${r.doctor.ime} ${r.doctor.prezime.charAt(0)}.`.trim(),
        prihod: Math.round(r.revenue),
        zakazano: Math.round(r.allRevenue),
      })),
    [doctorStats],
  );

  // Top usluge
  const topServices = useMemo(() => {
    const map: Record<string, { naziv: string; count: number; revenue: number }> = {};
    for (const apt of filtered) {
      for (const svc of (apt.services || [])) {
        if (!map[svc.naziv]) map[svc.naziv] = { naziv: svc.naziv, count: 0, revenue: 0 };
        map[svc.naziv].count += svc.kolicina;
        map[svc.naziv].revenue += svc.ukupno;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filtered]);

  // Build export payload sa svim dostupnim sheet-ovima za PDF/Excel
  function buildReportExport(): ReportExport {
    const doctorLabel = selectedDoctor === 'all'
      ? 'Svi ljekari'
      : (() => {
          const d = doctors.find((x) => x.id === selectedDoctor);
          return d ? `${d.titula || ''} ${d.ime} ${d.prezime}`.trim() : '—';
        })();
    const subtitle = `Period: ${dateFrom} — ${dateTo}  |  Ljekar: ${doctorLabel}`;

    return {
      title: 'Izvjestaj — Ministry of Aesthetics',
      subtitle,
      sheets: [
        // 1. Sumarni pregled
        {
          name: 'Sumarni pregled',
          columns: [
            { key: 'metric', label: 'Metrika' },
            { key: 'value', label: 'Vrijednost', format: 'number' },
          ],
          rows: [
            { metric: 'Ukupno termina',              value: stats.total },
            { metric: 'Realizovano (zavrseno)',      value: stats.completed },
            { metric: 'Otkazano',                    value: stats.cancelled },
            { metric: 'No-show',                     value: stats.noShow },
            { metric: 'Prihod (realizovano) EUR',    value: Number(stats.revenue.toFixed(2)) },
            { metric: 'Ukupno zakazano EUR',         value: Number(stats.allRevenue.toFixed(2)) },
            { metric: 'Jedinstvenih pacijenata',     value: stats.uniquePatients },
            { metric: 'Pregleda (examinations)',     value: examCount },
            { metric: 'Stopa realizacije %',         value: Number(stats.realizationRate) },
            { metric: 'Prosjecna vrijednost termina EUR', value: Number(stats.avgValue) },
            { metric: 'Materijali (broj stavki)',    value: materialTotals.ukupnoStavki },
            { metric: 'Materijali (vrijednost EUR)', value: Number(materialTotals.ukupnoVrijednost.toFixed(2)) },
          ],
        },
        // 2. Top usluge
        {
          name: 'Top usluge',
          columns: [
            { key: 'rank',    label: '#' },
            { key: 'naziv',   label: 'Usluga' },
            { key: 'count',   label: 'Kolicina', format: 'number' },
            { key: 'revenue', label: 'Prihod (EUR)', format: 'currency' },
          ],
          rows: topServices.map((s, i) => ({
            rank: i + 1,
            naziv: s.naziv,
            count: s.count,
            revenue: Number(s.revenue.toFixed(2)),
          })),
        },
        // 3. Ljekari (komparativni)
        {
          name: 'Ljekari komparativno',
          columns: [
            { key: 'ime',          label: 'Ljekar' },
            { key: 'total',        label: 'Termini', format: 'number' },
            { key: 'completed',    label: 'Realizovano', format: 'number' },
            { key: 'revenue',      label: 'Prihod (EUR)', format: 'currency' },
            { key: 'allRevenue',   label: 'Zakazano (EUR)', format: 'currency' },
            { key: 'avgValue',     label: 'Prosjek (EUR)', format: 'currency' },
            { key: 'realization',  label: 'Realizacija %', format: 'percent' },
            { key: 'cancelled',    label: 'Otkazano', format: 'number' },
            { key: 'noShow',       label: 'No-show', format: 'number' },
            { key: 'patients',     label: 'Pacijenata', format: 'number' },
          ],
          rows: doctorStats.map((r) => ({
            ime: `${r.doctor.titula || ''} ${r.doctor.ime} ${r.doctor.prezime}`.trim(),
            total: r.total,
            completed: r.completed,
            revenue: Number(r.revenue.toFixed(2)),
            allRevenue: Number(r.allRevenue.toFixed(2)),
            avgValue: Number(r.avgValue.toFixed(2)),
            realization: Number(r.realizationRate.toFixed(1)),
            cancelled: r.cancelled,
            noShow: r.noShow,
            patients: r.uniquePatients,
          })),
        },
        // 4. Materijali (NOVO)
        {
          name: 'Materijali',
          columns: [
            { key: 'naziv',      label: 'Materijal' },
            { key: 'kolicina',   label: 'Kolicina', format: 'number' },
            { key: 'jedinica',   label: 'Jedinica' },
            { key: 'cijena',     label: 'Nabavna cijena', format: 'currency' },
            { key: 'vrijednost', label: 'Vrijednost (EUR)', format: 'currency' },
          ],
          rows: materialStats.map((m) => ({
            naziv: m.naziv,
            kolicina: Number(m.kolicina.toFixed(2)),
            jedinica: m.jedinica,
            cijena: Number(m.cijena.toFixed(2)),
            vrijednost: Number(m.vrijednost.toFixed(2)),
          })),
        },
        // 5. Detaljan spisak termina
        {
          name: 'Detalji termina',
          columns: [
            { key: 'datum',    label: 'Datum' },
            { key: 'vrijeme',  label: 'Vrijeme' },
            { key: 'pacijent', label: 'Pacijent' },
            { key: 'ljekar',   label: 'Ljekar' },
            { key: 'usluge',   label: 'Usluge' },
            { key: 'status',   label: 'Status' },
            { key: 'iznos',    label: 'Iznos (EUR)', format: 'currency' },
          ],
          rows: filtered.map((a) => {
            const d = new Date(a.pocetak);
            const doc = doctors.find((x) => x.id === a.doctor_id);
            const patient = a.patient as any;
            return {
              datum: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}.`,
              vrijeme: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
              pacijent: patient ? `${patient.ime || ''} ${patient.prezime || ''}`.trim() : '—',
              ljekar: doc ? `${doc.titula || ''} ${doc.ime} ${doc.prezime}`.trim() : '—',
              usluge: (a.services || []).map((s) => s.naziv).join(', ') || '—',
              status: APPOINTMENT_STATUS_LABELS[a.status] || a.status,
              iznos: Number(((a.services || []).reduce((sum, s) => sum + s.ukupno, 0)).toFixed(2)),
            };
          }),
        },
      ],
    };
  }

  function handleExportExcel() {
    exportToExcel(buildReportExport());
  }

  function handlePrintPdf() {
    printToPdf(buildReportExport());
  }

  return (
    <div>
      {/* Filters + Export */}
      <div className="flex items-center justify-end mb-6 flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap items-center">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="all">Svi ljekari</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.titula} {d.ime} {d.prezime}</option>
            ))}
          </select>
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            title="Stampaj izvjestaj kao PDF"
          >
            <Printer size={13} /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            title="Preuzmi izvjestaj kao Excel"
          >
            <Download size={13} /> Excel
          </button>
        </div>
      </div>

      {/* Sumarne metrike — primary teal + accent peach iz brand palete */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiTile icon={<Calendar size={18} />}   label="Termini"         value={stats.total}                              variant="primary" />
        <KpiTile icon={<TrendingUp size={18} />} label="Realizovano"     value={stats.completed}                          variant="primary" />
        <KpiTile icon={<CreditCard size={18} />} label="Prihod"          value={`${stats.revenue.toFixed(0)} €`}          variant="accent"  />
        <KpiTile icon={<Calendar size={18} />}   label="Ukupno zakazano" value={`${stats.allRevenue.toFixed(0)} €`}       variant="primary" />
        <KpiTile icon={<Users size={18} />}      label="Pacijenata"      value={stats.uniquePatients}                     variant="primary" />
        <KpiTile icon={<FileText size={18} />}   label="Pregleda"        value={examCount}                                variant="primary" />
      </div>

      {/* Realizacija + prosjek + materijali ukupno */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Stopa realizacije</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-gray-900">{stats.realizationRate}%</p>
          </div>
          <div className="w-full bg-primary-50 rounded-full h-1.5 mt-2">
            <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${stats.realizationRate}%` }} />
          </div>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Prosj. vrijednost termina</p>
          <p className="text-2xl font-bold text-primary-700">{stats.avgValue} €</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Otkazano / No-show</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.cancelled} <span className="text-gray-300 font-normal">/</span> {stats.noShow}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Materijali (vrijednost)</p>
          <p className="text-2xl font-bold text-accent-600">{materialTotals.ukupnoVrijednost.toFixed(0)} €</p>
          <p className="text-[11px] text-gray-400 mt-1">{materialTotals.ukupnoStavki} stavki</p>
        </Card>
      </div>

      {/* ====== NAPLATA: Fiskal / Bez fiskala / Dug ====== */}
      <div className="mb-6">
        <h3 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Naplata u periodu</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3">
          {/* Ukupno naplaceno */}
          <div className="bg-white border border-border rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={14} className="text-green-500" />
              <p className="text-[10px] xs:text-xs text-gray-500 uppercase tracking-wider">Naplaceno</p>
            </div>
            <p className="fluid-h2 font-bold text-green-600 leading-tight">{paymentsAgg.total.toFixed(0)} €</p>
            <p className="text-[10px] xs:text-xs text-gray-400 mt-0.5">{paymentsAgg.count} uplata</p>
          </div>

          {/* Fiskalizovano */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt size={14} className="text-emerald-600" />
              <p className="text-[10px] xs:text-xs text-emerald-700 uppercase tracking-wider font-medium">Fiskalizovano</p>
            </div>
            <p className="fluid-h2 font-bold text-emerald-700 leading-tight">{paymentsAgg.fiskalTotal.toFixed(0)} €</p>
            <p className="text-[10px] xs:text-xs text-emerald-600/70 mt-0.5">{paymentsAgg.fiskalCount} uplata</p>
          </div>

          {/* Bez fiskala */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <ReceiptText size={14} className="text-amber-600" />
              <p className="text-[10px] xs:text-xs text-amber-700 uppercase tracking-wider font-medium">Bez fiskala</p>
            </div>
            <p className="fluid-h2 font-bold text-amber-700 leading-tight">{paymentsAgg.neFiskalTotal.toFixed(0)} €</p>
            <p className="text-[10px] xs:text-xs text-amber-600/70 mt-0.5">{paymentsAgg.neFiskalCount} uplata</p>
          </div>

          {/* Dug */}
          <div className="bg-white border border-border rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={14} className="text-red-500" />
              <p className="text-[10px] xs:text-xs text-gray-500 uppercase tracking-wider">Dug (aktuelni)</p>
            </div>
            <p className="fluid-h2 font-bold text-red-600 leading-tight">{paymentsAgg.dug.toFixed(0)} €</p>
            <p className="text-[10px] xs:text-xs text-gray-400 mt-0.5">{paymentsAgg.duznika} duznika</p>
          </div>
        </div>

        {/* Proporcije fiskal/bez */}
        {paymentsAgg.total > 0 && (
          <div className="mt-3 bg-white border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-gray-500 uppercase tracking-wider">Udio fiskalizacije</span>
              <span className="text-xs font-semibold text-gray-900">
                {((paymentsAgg.fiskalTotal / paymentsAgg.total) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-amber-100">
              <div
                className="bg-emerald-500"
                style={{ width: `${(paymentsAgg.fiskalTotal / paymentsAgg.total) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-gray-400">
              <span>fiskalno</span>
              <span>bez fiskala</span>
            </div>
          </div>
        )}
      </div>

      {/* ====== GRAFIKONI ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Pie: Status termina */}
        <Card>
          <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Raspodjela statusa</h4>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  stroke="none"
                >
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} termina`, '']} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">Nema podataka</div>
          )}
        </Card>

        {/* Bar: Prihod po ljekaru */}
        <Card>
          <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Prihod po ljekaru</h4>
          {doctorBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={doctorBarData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="ime" tick={{ fontSize: 11, fill: '#555' }} width={90} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${value} €`, '']} />
                <Bar dataKey="prihod" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} barSize={16} name="Realizovano" />
                <Bar dataKey="zakazano" fill={CHART_COLORS.primaryLight} radius={[0, 4, 4, 0]} barSize={16} opacity={0.4} name="Zakazano" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">Nema podataka</div>
          )}
        </Card>

        {/* Area: Dnevni prihod */}
        <Card>
          <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Dnevni prihod (EUR)</h4>
          {dailyRevenueData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyRevenueData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(value) => [`${value} €`, 'Prihod']} />
                <Area type="monotone" dataKey="prihod" stroke={CHART_COLORS.primary} fill="url(#areaGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : dailyRevenueData.length === 1 ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-700">{dailyRevenueData[0].prihod} €</p>
                <p className="text-xs text-gray-500 mt-1">{dailyRevenueData[0].datum}</p>
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">Nema podataka</div>
          )}
        </Card>
      </div>

      {/* Top usluge */}
      {topServices.length > 0 && (
        <Card padding={false} className="mb-6">
          <div className="px-6 py-4 border-b border-border bg-primary-50/30">
            <h3 className="text-sm font-semibold text-primary-700 uppercase tracking-wider">Top usluge po prihodu</h3>
          </div>
          <div className="divide-y divide-border">
            {topServices.map((svc, i) => (
              <div key={svc.naziv} className="px-6 py-3 flex items-center gap-4">
                <span className={`text-xs font-bold w-6 ${i < 3 ? 'text-primary-600' : 'text-gray-400'}`}>{i + 1}.</span>
                <span className="text-sm font-medium text-gray-900 flex-1 truncate">{svc.naziv}</span>
                <span className="text-xs text-gray-500 whitespace-nowrap">{svc.count}x</span>
                <span className="text-sm font-bold text-primary-700 whitespace-nowrap tabular-nums">{svc.revenue.toFixed(0)} €</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Materijali (NOVO) */}
      <Card padding={false} className="mb-6">
        <div className="px-6 py-4 border-b border-border bg-accent-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-accent-600" />
            <h3 className="text-sm font-semibold text-accent-700 uppercase tracking-wider">Utroseni materijali</h3>
          </div>
          <span className="text-xs text-gray-500">
            Ukupno: <strong className="text-accent-700">{materialTotals.ukupnoVrijednost.toFixed(2)} €</strong> · {materialTotals.ukupnoStavki} stavki
          </span>
        </div>
        {materialLoading ? (
          <div className="px-6 py-8 text-center text-xs text-gray-400">Ucitavanje materijala...</div>
        ) : materialStats.length === 0 ? (
          <div className="px-6 py-8 text-center text-xs text-gray-400">
            Nema utrosenih materijala u izabranom periodu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Materijal</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Kolicina</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Jedinica</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Cijena (EUR)</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Vrijednost (EUR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {materialStats.map((m) => (
                  <tr key={m.material_id} className="hover:bg-accent-50/30">
                    <td className="px-4 py-3 text-gray-900 font-medium">{m.naziv}</td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{m.kolicina.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.jedinica}</td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{m.cijena.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-accent-700 font-semibold tabular-nums">{m.vrijednost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-accent-50/40 border-t border-accent-100">
                  <td className="px-4 py-3 text-[10px] uppercase tracking-wider text-accent-700 font-semibold" colSpan={4}>Ukupno</td>
                  <td className="px-4 py-3 text-right text-accent-700 font-bold tabular-nums">{materialTotals.ukupnoVrijednost.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Komparativna tabela ljekara */}
      <Card padding={false} className="mb-6">
        <div className="px-6 py-4 border-b border-border bg-primary-50/30">
          <h3 className="text-sm font-semibold text-primary-700 uppercase tracking-wider">Komparativni izvjestaj — ljekari</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Ljekar</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Termini</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Realizovano</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Prihod (EUR)</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Zakazano (EUR)</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Prosjek (EUR)</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Realizacija</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Otkazano</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">No-show</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pacijenata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {doctorStats.map((row) => (
                <tr key={row.doctor.id} className="hover:bg-primary-50/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-500" />
                      <span className="font-medium text-gray-900">
                        {row.doctor.titula} {row.doctor.ime} {row.doctor.prezime}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{row.total}</td>
                  <td className="px-4 py-3 text-right text-primary-700 font-medium tabular-nums">{row.completed}</td>
                  <td className="px-4 py-3 text-right text-primary-700 font-bold tabular-nums">{row.revenue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{row.allRevenue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{row.avgValue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={`font-semibold ${row.realizationRate >= 80 ? 'text-primary-700' : row.realizationRate >= 60 ? 'text-accent-600' : 'text-gray-400'}`}>
                      {row.realizationRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{row.cancelled}</td>
                  <td className="px-4 py-3 text-right text-gray-400 tabular-nums">{row.noShow}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{row.uniquePatients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// KPI tile — brand boje (primary teal ili accent peach)
// ============================================================
function KpiTile({ icon, label, value, variant = 'primary' }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant?: 'primary' | 'accent';
}) {
  const styles = variant === 'accent'
    ? {
        iconBg: 'bg-accent-50',
        iconText: 'text-accent-600',
        valueText: 'text-accent-700',
        border: 'border-accent-100',
      }
    : {
        iconBg: 'bg-primary-50',
        iconText: 'text-primary-600',
        valueText: 'text-primary-700',
        border: 'border-primary-100',
      };

  return (
    <div className={`bg-white border ${styles.border} rounded-xl px-4 py-3 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-lg ${styles.iconBg} ${styles.iconText} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold truncate">{label}</p>
        <p className={`text-xl font-bold ${styles.valueText} truncate`}>{value}</p>
      </div>
    </div>
  );
}
