import { useState, useMemo, useEffect } from 'react';
import {
  Calendar, TrendingUp, CreditCard, Users, FileText, Package,
  Printer, Download,
} from 'lucide-react';
import Card from '../components/ui/Card';
import { useCalendar } from '../contexts/CalendarContext';

import { supabase } from '../lib/supabase';
import { APPOINTMENT_STATUS_LABELS } from '../types';
import { exportToExcel, printToPdf, type ReportExport } from '../lib/exportReport';

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Izvjestaji</h2>
          <p className="text-sm text-gray-500 mt-1">Statistika, finansije i performanse</p>
        </div>
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
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            title="Preuzmi izvjestaj kao Excel"
          >
            <Download size={13} /> Excel
          </button>
        </div>
      </div>

      {/* Sumarne metrike — neutralno, samo linija + tekst */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiTile icon={<Calendar size={16} />}   label="Termini"            value={stats.total} />
        <KpiTile icon={<TrendingUp size={16} />} label="Realizovano"        value={stats.completed} />
        <KpiTile icon={<CreditCard size={16} />} label="Prihod"             value={`${stats.revenue.toFixed(0)} €`} accent />
        <KpiTile icon={<Calendar size={16} />}   label="Ukupno zakazano"    value={`${stats.allRevenue.toFixed(0)} €`} />
        <KpiTile icon={<Users size={16} />}      label="Pacijenata"         value={stats.uniquePatients} />
        <KpiTile icon={<FileText size={16} />}   label="Pregleda"           value={examCount} />
      </div>

      {/* Realizacija + prosjek + materijali ukupno */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Stopa realizacije</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-gray-900">{stats.realizationRate}%</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div className="bg-gray-700 h-1.5 rounded-full" style={{ width: `${stats.realizationRate}%` }} />
          </div>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Prosj. vrijednost termina</p>
          <p className="text-2xl font-bold text-gray-900">{stats.avgValue} €</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Otkazano / No-show</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.cancelled} <span className="text-gray-300 font-normal">/</span> {stats.noShow}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Materijali (vrijednost)</p>
          <p className="text-2xl font-bold text-gray-900">{materialTotals.ukupnoVrijednost.toFixed(0)} €</p>
          <p className="text-[11px] text-gray-400 mt-1">{materialTotals.ukupnoStavki} stavki</p>
        </Card>
      </div>

      {/* Top usluge */}
      {topServices.length > 0 && (
        <Card padding={false} className="mb-6">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Top usluge po prihodu</h3>
          </div>
          <div className="divide-y divide-border">
            {topServices.map((svc, i) => (
              <div key={svc.naziv} className="px-6 py-3 flex items-center gap-4">
                <span className="text-xs font-semibold text-gray-400 w-6">{i + 1}.</span>
                <span className="text-sm font-medium text-gray-900 flex-1 truncate">{svc.naziv}</span>
                <span className="text-xs text-gray-500 whitespace-nowrap">{svc.count}x</span>
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{svc.revenue.toFixed(0)} €</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Materijali (NOVO) */}
      <Card padding={false} className="mb-6">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Utroseni materijali</h3>
          </div>
          <span className="text-xs text-gray-500">
            Ukupno: <strong className="text-gray-900">{materialTotals.ukupnoVrijednost.toFixed(2)} €</strong> · {materialTotals.ukupnoStavki} stavki
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
                  <tr key={m.material_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{m.naziv}</td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{m.kolicina.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.jedinica}</td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{m.cijena.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold tabular-nums">{m.vrijednost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-border">
                  <td className="px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500 font-semibold" colSpan={4}>Ukupno</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-bold tabular-nums">{materialTotals.ukupnoVrijednost.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Komparativna tabela ljekara */}
      <Card padding={false} className="mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Komparativni izvjestaj — ljekari</h3>
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
                <tr key={row.doctor.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      <span className="font-medium text-gray-900">
                        {row.doctor.titula} {row.doctor.ime} {row.doctor.prezime}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{row.total}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium tabular-nums">{row.completed}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-semibold tabular-nums">{row.revenue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{row.allRevenue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{row.avgValue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={`font-medium ${row.realizationRate >= 80 ? 'text-gray-900' : row.realizationRate >= 60 ? 'text-gray-500' : 'text-gray-400'}`}>
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
// KPI tile — neutralna jednoredna kartica
// Akcent je samo jedna tanka linija ispod vrijednosti kad je accent=true
// ============================================================
function KpiTile({ icon, label, value, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        {icon}
        <p className="text-[11px] uppercase tracking-wider font-semibold truncate">{label}</p>
      </div>
      <p className={`text-xl font-bold truncate ${accent ? 'text-gray-900' : 'text-gray-800'}`}>{value}</p>
      {accent && <div className="h-0.5 w-8 bg-gray-900 rounded-full mt-1.5" />}
    </div>
  );
}
