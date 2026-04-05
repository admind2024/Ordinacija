import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';
import Card from '../components/ui/Card';
import { demoDoctors, generateDemoAppointments } from '../data/demo';
import { APPOINTMENT_STATUS_COLORS } from '../types';

const appointments = generateDemoAppointments();

export default function Reports() {
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');

  const stats = useMemo(() => {
    const filtered = selectedDoctor === 'all'
      ? appointments
      : appointments.filter((a) => a.doctor_id === selectedDoctor);

    const total = filtered.length;
    const completed = filtered.filter((a) => a.status === 'zavrsen').length;
    const cancelled = filtered.filter((a) => a.status === 'otkazan').length;
    const noShow = filtered.filter((a) => a.status === 'nije_dosao').length;
    const revenue = filtered
      .filter((a) => a.status === 'zavrsen')
      .reduce((sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0);
    const realizationRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
    const avgValue = completed > 0 ? (revenue / completed).toFixed(2) : '0';

    return { total, completed, cancelled, noShow, revenue, realizationRate, avgValue };
  }, [selectedDoctor]);

  // Per-doctor table data
  const doctorStats = useMemo(() => {
    return demoDoctors.map((doctor) => {
      const docApts = appointments.filter((a) => a.doctor_id === doctor.id);
      const completed = docApts.filter((a) => a.status === 'zavrsen').length;
      const revenue = docApts
        .filter((a) => a.status === 'zavrsen')
        .reduce((sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0);
      const newPatients = new Set(
        docApts.map((a) => a.patient_id)
      ).size;

      return {
        doctor,
        total: docApts.length,
        completed,
        cancelled: docApts.filter((a) => a.status === 'otkazan').length,
        noShow: docApts.filter((a) => a.status === 'nije_dosao').length,
        revenue,
        avgValue: completed > 0 ? revenue / completed : 0,
        realizationRate: docApts.length > 0 ? (completed / docApts.length) * 100 : 0,
        newPatients,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Izvjestaji</h2>
          <p className="text-sm text-gray-500 mt-1">Statistika ljekara, finansije i performanse</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Svi ljekari</option>
            {demoDoctors.map((d) => (
              <option key={d.id} value={d.id}>{d.titula} {d.ime} {d.prezime}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sumarne metrike */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Ukupno termina</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.realizationRate}%</p>
              <p className="text-xs text-gray-500">Stopa realizacije</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.revenue.toFixed(0)}</p>
              <p className="text-xs text-gray-500">Prihod (EUR)</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.avgValue}</p>
              <p className="text-xs text-gray-500">Prosj. vrijednost (EUR)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Komparativna tabela ljekara */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Komparativni izvjestaj — svi ljekari
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ljekar</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Termini</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Realizovano</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Prihod (EUR)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Prosj. (EUR)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Realizacija %</th>
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
                  <td className="px-4 py-3 text-right text-gray-600">{row.completed}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{row.revenue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.avgValue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${row.realizationRate >= 80 ? 'text-green-600' : row.realizationRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {row.realizationRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-red-500">{row.cancelled}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{row.noShow}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.newPatients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Status breakdown */}
      <div className="mt-6">
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
    </div>
  );
}
