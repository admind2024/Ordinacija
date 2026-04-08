import { useMemo, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Users, CreditCard, TrendingUp, Printer, Eye, FileText, Banknote } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { openPrintReport } from '../components/examinations/PrintReport';
import { useCalendar } from '../contexts/CalendarContext';
import { usePatients } from '../contexts/PatientsContext';
import { supabase } from '../lib/supabase';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from '../types';
import type { Examination, Patient, Doctor, Establishment } from '../types';

function isLocalToday(isoStr: string): boolean {
  const d = new Date(isoStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function Dashboard() {
  const { appointments, doctors } = useCalendar();
  const { patients } = usePatients();

  const todayAppointments = useMemo(
    () => appointments
      .filter((a) => isLocalToday(a.pocetak))
      .sort((a, b) => new Date(a.pocetak).getTime() - new Date(b.pocetak).getTime()),
    [appointments]
  );

  // Prihod: iz danasnih zavrsenih termina + iz zavrsenih pregleda danas
  const todayCompletedApts = useMemo(
    () => todayAppointments.filter((a) => a.status === 'zavrsen'),
    [todayAppointments]
  );

  const todayRevenue = useMemo(
    () => todayCompletedApts.reduce((sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0),
    [todayCompletedApts]
  );

  const totalRevenue = useMemo(
    () => appointments
      .filter((a) => a.status === 'zavrsen')
      .reduce((sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0),
    [appointments]
  );

  const realizationRate = useMemo(() => {
    const total = todayAppointments.length;
    const completed = todayCompletedApts.length;
    return total > 0 ? ((completed / total) * 100).toFixed(0) : '0';
  }, [todayAppointments, todayCompletedApts]);

  // Zavrseni pregledi danas — za sestre
  type ExamWithDetails = Examination & { patient?: Patient; doctor?: Doctor; appointmentServices?: any[]; appointmentTotal?: number };
  const [todayExams, setTodayExams] = useState<ExamWithDetails[]>([]);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [viewExam, setViewExam] = useState<ExamWithDetails | null>(null);

  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    supabase.from('examinations')
      .select('*')
      .eq('status', 'zavrsen')
      .gte('datum', todayStr)
      .lte('datum', todayStr)
      .order('updated_at', { ascending: false })
      .then(async ({ data }) => {
        if (!data) return;
        const enriched = await Promise.all(data.map(async (exam: any) => {
          let aptServices: any[] = [];
          let aptTotal = 0;
          if (exam.appointment_id) {
            const { data: svcData } = await supabase
              .from('appointment_services')
              .select('*')
              .eq('appointment_id', exam.appointment_id);
            aptServices = svcData || [];
            aptTotal = aptServices.reduce((sum: number, s: any) => sum + Number(s.ukupno || 0), 0);
          }
          return {
            ...exam,
            patient: patients.find((p) => p.id === exam.patient_id),
            doctor: doctors.find((d) => d.id === exam.doctor_id),
            appointmentServices: aptServices,
            appointmentTotal: aptTotal,
          };
        }));
        setTodayExams(enriched);
      });
    supabase.from('establishments').select('*').limit(1).single()
      .then(({ data }) => { if (data) setEstablishment(data as Establishment); });
  }, [patients, doctors]);

  function handlePrintExam(exam: ExamWithDetails) {
    if (!exam.patient || !exam.doctor) return;
    openPrintReport({ examination: exam, patient: exam.patient, doctor: exam.doctor, establishment });
  }

  // Ukupno za naplatu danas iz zavrsenih pregleda
  const todayExamsTotal = todayExams.reduce((sum, e) => sum + (e.appointmentTotal || 0), 0);

  const stats = [
    { label: 'Termini danas', value: String(todayAppointments.length), icon: CalendarDays, color: 'text-primary-600 bg-primary-100' },
    { label: 'Ukupno pacijenata', value: String(patients.length), icon: Users, color: 'text-green-600 bg-green-100' },
    { label: 'Prihod danas (EUR)', value: todayRevenue > 0 ? todayRevenue.toFixed(0) : todayExamsTotal.toFixed(0), icon: CreditCard, color: 'text-purple-600 bg-purple-100' },
    { label: 'Realizacija danas', value: `${realizationRate}%`, icon: TrendingUp, color: 'text-orange-600 bg-orange-100' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pregled poslovanja — {format(new Date(), 'dd.MM.yyyy.')}
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
                const aptTime = new Date(apt.pocetak);
                const svcTotal = apt.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0;
                return (
                  <div key={apt.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="w-14 text-center shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {String(aptTime.getHours()).padStart(2, '0')}:{String(aptTime.getMinutes()).padStart(2, '0')}
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
                    {svcTotal > 0 && (
                      <span className="text-xs font-medium text-gray-600 shrink-0">{svcTotal.toFixed(0)} EUR</span>
                    )}
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
              const docRevenue = docApts.reduce((sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0);
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
                    <p className="text-sm font-semibold text-gray-900">{docApts.length} termina</p>
                    {docRevenue > 0 && <p className="text-xs text-green-600">{docRevenue.toFixed(0)} EUR</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Zavrseni pregledi danas — za sestre */}
      {todayExams.length > 0 && (
        <div className="mt-6">
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-green-600" />
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Zavrseni pregledi danas</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">{todayExamsTotal.toFixed(2)} EUR ukupno</span>
                <span className="text-xs text-gray-400">{todayExams.length} pregleda</span>
              </div>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {todayExams.map((exam) => (
                <div key={exam.id} className="px-6 py-3 flex items-center gap-4">
                  <div className="w-1 h-10 rounded-full bg-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {exam.patient ? `${exam.patient.ime} ${exam.patient.prezime}` : '—'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {exam.doctor ? `${exam.doctor.titula || 'Dr'} ${exam.doctor.ime} ${exam.doctor.prezime}` : ''}
                      {exam.appointmentServices && exam.appointmentServices.length > 0
                        ? ` — ${exam.appointmentServices.map((s: any) => s.naziv).join(', ')}`
                        : ''}
                    </p>
                  </div>
                  {(exam.appointmentTotal || 0) > 0 && (
                    <span className="text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded shrink-0">
                      {exam.appointmentTotal?.toFixed(2)} EUR
                    </span>
                  )}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setViewExam(exam)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Pogledaj nalaz"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handlePrintExam(exam)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Stampaj nalaz"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Naplati"
                      onClick={() => setViewExam(exam)}
                    >
                      <Banknote size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Modal za pregled nalaza + naplata */}
      {viewExam && (
        <Modal isOpen onClose={() => setViewExam(null)} title="Nalaz pregleda" size="lg">
          <div className="space-y-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-900">
                {viewExam.patient ? `${viewExam.patient.ime} ${viewExam.patient.prezime}` : ''}
              </p>
              <p className="text-xs text-gray-500">
                {viewExam.doctor ? `${viewExam.doctor.titula || 'Dr'} ${viewExam.doctor.ime} ${viewExam.doctor.prezime}` : ''}
                {viewExam.datum ? ` — ${format(parseISO(viewExam.datum), 'dd.MM.yyyy.')}` : ''}
              </p>
            </div>

            {/* Usluge i cijena */}
            {viewExam.appointmentServices && viewExam.appointmentServices.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Usluge — za naplatu</p>
                {viewExam.appointmentServices.map((svc: any) => (
                  <div key={svc.id} className="flex justify-between text-sm">
                    <span className="text-blue-800">{svc.naziv} {svc.kolicina > 1 ? `x${svc.kolicina}` : ''}</span>
                    <span className="font-medium text-blue-900">{Number(svc.ukupno).toFixed(2)} EUR</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t border-blue-200 pt-1 mt-2 text-sm">
                  <span className="text-blue-800">Ukupno za naplatu</span>
                  <span className="text-blue-900">{viewExam.appointmentTotal?.toFixed(2)} EUR</span>
                </div>
              </div>
            )}

            {viewExam.razlog_dolaska && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Razlog dolaska</p>
                <p className="text-gray-700 whitespace-pre-wrap">{viewExam.razlog_dolaska}</p>
              </div>
            )}
            {viewExam.nalaz && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Nalaz / Procedura</p>
                <p className="text-gray-700 whitespace-pre-wrap">{viewExam.nalaz}</p>
              </div>
            )}
            {viewExam.terapija && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Terapija</p>
                <p className="text-gray-700 whitespace-pre-wrap">{viewExam.terapija}</p>
              </div>
            )}
            {viewExam.preporuke && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Preporuke</p>
                <p className="text-gray-700 whitespace-pre-wrap">{viewExam.preporuke}</p>
              </div>
            )}
            {viewExam.kontrolni_pregled && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Kontrolni pregled</p>
                <p className="text-gray-700">{viewExam.kontrolni_pregled}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => { setViewExam(null); handlePrintExam(viewExam); }}>
                <Printer size={16} /> Stampaj
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
