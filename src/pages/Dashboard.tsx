import { useMemo } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { CalendarDays, Users, CreditCard, TrendingUp } from 'lucide-react';
import Card from '../components/ui/Card';
import { useCalendar } from '../contexts/CalendarContext';
import { usePatients } from '../contexts/PatientsContext';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from '../types';

export default function Dashboard() {
  const { appointments, doctors } = useCalendar();
  const { patients } = usePatients();

  const todayAppointments = useMemo(
    () => appointments
      .filter((a) => isToday(parseISO(a.pocetak)))
      .sort((a, b) => parseISO(a.pocetak).getTime() - parseISO(b.pocetak).getTime()),
    [appointments]
  );

  const completedRevenue = useMemo(
    () => appointments
      .filter((a) => a.status === 'zavrsen')
      .reduce((sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0),
    [appointments]
  );

  const realizationRate = useMemo(() => {
    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === 'zavrsen').length;
    return total > 0 ? ((completed / total) * 100).toFixed(0) : '0';
  }, [appointments]);

  const stats = [
    { label: 'Termini danas', value: String(todayAppointments.length), icon: CalendarDays, color: 'text-primary-600 bg-primary-100' },
    { label: 'Ukupno pacijenata', value: String(patients.length), icon: Users, color: 'text-green-600 bg-green-100' },
    { label: 'Prihod (EUR)', value: completedRevenue.toFixed(0), icon: CreditCard, color: 'text-purple-600 bg-purple-100' },
    { label: 'Stopa realizacije', value: `${realizationRate}%`, icon: TrendingUp, color: 'text-orange-600 bg-orange-100' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pregled poslovanja — {format(new Date(), 'EEEE, dd.MM.yyyy.')}
        </p>
      </div>

      {/* Statistike */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Danasnji termini */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Danasnji termini</h3>
            <span className="text-xs text-gray-400">{todayAppointments.length} termina</span>
          </div>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {todayAppointments.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">Nema termina za danas</p>
            ) : (
              todayAppointments.map((apt) => {
                const patient = patients.find((p) => p.id === apt.patient_id);
                const doctor = doctors.find((d) => d.id === apt.doctor_id);
                return (
                  <div key={apt.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="w-14 text-center shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {format(parseISO(apt.pocetak), 'HH:mm')}
                      </p>
                    </div>
                    <div
                      className="w-1 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[apt.status] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {patient ? `${patient.ime} ${patient.prezime}` : '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {doctor ? `${doctor.titula} ${doctor.ime} ${doctor.prezime.charAt(0)}.` : ''}
                        {apt.services?.[0] && ` · ${apt.services[0].naziv}`}
                      </p>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={{
                        backgroundColor: APPOINTMENT_STATUS_COLORS[apt.status] + '20',
                        color: APPOINTMENT_STATUS_COLORS[apt.status],
                      }}
                    >
                      {APPOINTMENT_STATUS_LABELS[apt.status]}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Pregled ljekara */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Ljekari — danas</h3>
          </div>
          <div className="divide-y divide-border">
            {doctors.map((doctor) => {
              const docApts = todayAppointments.filter((a) => a.doctor_id === doctor.id);
              return (
                <div key={doctor.id} className="px-6 py-3 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: doctor.boja }}
                  >
                    {doctor.ime.charAt(0)}{doctor.prezime.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {doctor.titula} {doctor.ime} {doctor.prezime}
                    </p>
                    <p className="text-xs text-gray-400">{doctor.specijalizacija}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{docApts.length}</p>
                    <p className="text-xs text-gray-400">termina</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
