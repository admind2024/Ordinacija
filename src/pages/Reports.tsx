import { useState, useMemo, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, CreditCard, FileText } from 'lucide-react';
import Card from '../components/ui/Card';
import { useCalendar } from '../contexts/CalendarContext';

import { supabase } from '../lib/supabase';
import { APPOINTMENT_STATUS_COLORS } from '../types';

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

    supabase.from('notifications')
      .select('id', { count: 'exact' })
      .eq('tip', 'potvrda')
      .eq('status', 'sent')
      .gte('datum_slanja', `${dateFrom}T00:00:00`)
      .lte('datum_slanja', `${dateTo}T23:59:59`)
  }, [dateFrom, dateTo]);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Izvjestaji</h2>
          <p className="text-sm text-gray-500 mt-1">Statistika, finansije i performanse</p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
        </div>
      </div>

      {/* Sumarne metrike */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Termini</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-gray-500">Realizovano</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.revenue.toFixed(0)} EUR</p>
              <p className="text-xs text-gray-500">Prihod (realizovano)</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.allRevenue.toFixed(0)} EUR</p>
              <p className="text-xs text-gray-500">Ukupno zakazano</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.uniquePatients}</p>
              <p className="text-xs text-gray-500">Pacijenata</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{examCount}</p>
              <p className="text-xs text-gray-500">Pregleda</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Realizacija + prosjecna vrijednost */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-sm text-gray-500 mb-1">Stopa realizacije</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-gray-900">{stats.realizationRate}%</p>
            <div className="flex-1 bg-gray-200 rounded-full h-3 mb-2">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: `${stats.realizationRate}%` }} />
            </div>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 mb-1">Prosjecna vrijednost termina</p>
          <p className="text-3xl font-bold text-gray-900">{stats.avgValue} EUR</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 mb-1">Otkazano / No-show</p>
          <p className="text-3xl font-bold text-red-600">{stats.cancelled} <span className="text-gray-400 text-lg">/</span> {stats.noShow}</p>
        </Card>
      </div>

      {/* Top usluge */}
      {topServices.length > 0 && (
        <Card padding={false} className="mb-6">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Top usluge po prihodu</h3>
          </div>
          <div className="divide-y divide-border">
            {topServices.map((svc, i) => (
              <div key={svc.naziv} className="px-6 py-3 flex items-center gap-4">
                <span className="text-sm font-bold text-gray-400 w-6">{i + 1}.</span>
                <span className="text-sm font-medium text-gray-900 flex-1">{svc.naziv}</span>
                <span className="text-xs text-gray-500">{svc.count}x</span>
                <span className="text-sm font-bold text-purple-700">{svc.revenue.toFixed(0)} EUR</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Komparativna tabela ljekara */}
      <Card padding={false} className="mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Komparativni izvjestaj — ljekari</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ljekar</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Termini</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Realizovano</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Prihod (EUR)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Zakazano (EUR)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Prosj. (EUR)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Realizacija</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Otkazano</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">No-show</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Pacijenata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {doctorStats.map((row) => (
                <tr key={row.doctor.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.doctor.boja }} />
                      <span className="font-medium text-gray-900">
                        {row.doctor.titula} {row.doctor.ime} {row.doctor.prezime}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.total}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{row.completed}</td>
                  <td className="px-4 py-3 text-right font-bold text-purple-700">{row.revenue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{row.allRevenue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.avgValue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${row.realizationRate >= 80 ? 'text-green-600' : row.realizationRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {row.realizationRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-red-500">{row.cancelled}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{row.noShow}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.uniquePatients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Status breakdown */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Raspodjela statusa termina</h3>
        <div className="flex gap-4 flex-wrap">
          {[
            { status: 'zavrsen', label: 'Zavrseni', count: stats.completed },
            { status: 'otkazan', label: 'Otkazani', count: stats.cancelled },
            { status: 'nije_dosao', label: 'No-show', count: stats.noShow },
            { status: 'zakazan', label: 'Zakazani', count: stats.total - stats.completed - stats.cancelled - stats.noShow },
          ].map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[item.status as keyof typeof APPOINTMENT_STATUS_COLORS] }}
              />
              <span className="text-sm text-gray-600">{item.label}:</span>
              <span className="text-sm font-medium text-gray-900">{item.count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
