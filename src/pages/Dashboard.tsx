import { useMemo, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Users, CreditCard, TrendingUp, Printer, Eye, FileText, Banknote, CheckCircle, XCircle, Receipt, AlertTriangle, Tag } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { openPrintReport, type FiscalPrintData } from '../components/examinations/PrintReport';
import { fiscalizeInvoice, loadTeconioCertificate, type FiscalItem, type FiscalResult } from '../lib/fiscalService';
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
            aptServices = (svcData || []).map((s: any) => ({ ...s, ukupno: Number(s.ukupno) || 0, cijena: Number(s.cijena) || 0, kolicina: Number(s.kolicina) || 1 }));
            aptTotal = aptServices.reduce((sum: number, s: any) => sum + s.ukupno, 0);
          }
          // Fallback: ako nema usluga iz appointment_services, probaj iz appointments
          if (aptTotal === 0 && exam.appointment_id) {
            const apt = appointments.find((a) => a.id === exam.appointment_id);
            if (apt?.services && apt.services.length > 0) {
              aptServices = apt.services;
              aptTotal = apt.services.reduce((sum, s) => sum + s.ukupno, 0);
            }
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
    const fd = fiscalData[exam.id];
    const fiscal: FiscalPrintData | undefined = fd?.success ? {
      fic: fd.fic,
      iic: fd.iic,
      invoiceNumber: fd.invoiceNumber,
      qrCodeUrl: fd.qrCodeUrl,
      totalWithoutVAT: fd.totals?.totalWithoutVAT,
      totalVAT: fd.totals?.totalVAT,
      totalPrice: fd.totals?.totalPrice,
    } : undefined;
    openPrintReport({
      examination: exam,
      patient: exam.patient,
      doctor: exam.doctor,
      establishment,
      services: exam.appointmentServices as any,
      fiscal,
    });
  }

  // Fiskalizacija
  const [, setFiscalizing] = useState<string | null>(null);
  const [fiscalResult, setFiscalResult] = useState<{ id: string; result: FiscalResult } | null>(null);
  const [fiscalData, setFiscalData] = useState<Record<string, FiscalResult>>({});

  // Payment modal state
  const [payExam, setPayExam] = useState<ExamWithDetails | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<'gotovina' | 'kartica'>('gotovina');
  const [payFiskalizuj, setPayFiskalizuj] = useState(false);
  const [payNapomena, setPayNapomena] = useState('');
  const [paySaving, setPaySaving] = useState(false);
  const [payPopust, setPayPopust] = useState(0);

  // Bruto (bez popusta) i za naplatu (sa popustom) za trenutni payExam
  const payBruto = payExam?.appointmentServices
    ? payExam.appointmentServices.reduce((s: number, svc: any) => s + (Number(svc.cijena) * (Number(svc.kolicina) || 1)), 0)
    : 0;
  const payPopustIznos = payBruto * (payPopust / 100);
  const payZaNaplatu = Math.max(0, payBruto - payPopustIznos);

  function openPayment(exam: ExamWithDetails) {
    if (fiscalData[exam.id]?.success) {
      setFiscalResult({ id: exam.id, result: { success: false, error: 'Ovaj pregled je vec fiskalizovan!' } });
      setTimeout(() => setFiscalResult(null), 4000);
      return;
    }
    setPayExam(exam);
    // Auto-primijeni stalni popust pacijenta ako ga ima
    const pPopust = exam.patient?.popust || 0;
    setPayPopust(pPopust);
    const bruto = (exam.appointmentServices || []).reduce((s: number, svc: any) => s + (Number(svc.cijena) * (Number(svc.kolicina) || 1)), 0);
    setPayAmount(Math.max(0, bruto * (1 - pPopust / 100)));
    setPayMethod('gotovina');
    setPayFiskalizuj(false);
    setPayNapomena('');
  }

  async function handlePaySubmit() {
    if (!payExam || payAmount <= 0) return;
    setPaySaving(true);

    // Sinhronizuj popust u appointment_services ako se promijenio
    if (payExam.appointmentServices && payExam.appointmentServices.length > 0) {
      for (const svc of payExam.appointmentServices as any[]) {
        const cijena = Number(svc.cijena) || 0;
        const kolicina = Number(svc.kolicina) || 1;
        const novoUkupno = cijena * kolicina * (1 - payPopust / 100);
        await supabase
          .from('appointment_services')
          .update({ popust: payPopust, ukupno: novoUkupno })
          .eq('id', svc.id);
      }
    }

    // Od sada total = payZaNaplatu (bruto - popust)
    const examTotal = payZaNaplatu;
    const remaining = examTotal - payAmount;
    const willCreateDebt = remaining > 0.01;

    // Ako treba fiskalizacija
    if (payFiskalizuj) {
      if (!payExam.appointmentServices || payExam.appointmentServices.length === 0) {
        setFiscalResult({ id: payExam.id, result: { success: false, error: 'Nema usluga za fiskalizaciju' } });
        setPaySaving(false);
        return;
      }

      setFiscalizing(payExam.id);
      await loadTeconioCertificate();

      const items: FiscalItem[] = payExam.appointmentServices.map((svc: any) => ({
        name: svc.naziv,
        unit: 'kom',
        quantity: Number(svc.kolicina) || 1,
        unitPriceWithVAT: Number(svc.ukupno) / (Number(svc.kolicina) || 1),
        vatRate: 21,
      }));

      const fiscalMethod = payMethod === 'kartica' ? 'CARD' : 'BANKNOTE';
      const result = await fiscalizeInvoice(items, [
        { method: fiscalMethod, amount: payAmount },
      ]);

      setFiscalResult({ id: payExam.id, result });
      setFiscalizing(null);

      if (result.success) {
        setFiscalData((prev) => ({ ...prev, [payExam.id]: result }));
        // Stampaj nakon uspjesne fiskalizacije
        if (payExam.patient && payExam.doctor) {
          setTimeout(() => {
            openPrintReport({
              examination: payExam,
              patient: payExam.patient!,
              doctor: payExam.doctor!,
              establishment,
              services: payExam.appointmentServices as any,
              fiscal: {
                fic: result.fic,
                iic: result.iic,
                invoiceNumber: result.invoiceNumber,
                qrCodeUrl: result.qrCodeUrl,
                totalWithoutVAT: result.totals?.totalWithoutVAT,
                totalVAT: result.totals?.totalVAT,
                totalPrice: result.totals?.totalPrice,
              },
            });
          }, 500);
        }
      }
      setTimeout(() => setFiscalResult(null), 8000);
    }

    // Kreiranje dugovanja ako je placeno manje
    if (willCreateDebt && payExam.patient) {
      const serviceNames = payExam.appointmentServices?.map((s: any) => s.naziv).join(', ') || 'Usluge';
      await supabase.from('dugovanja').insert({
        patient_id: payExam.patient.id,
        iznos: examTotal,
        preostalo: remaining,
        opis: `${serviceNames} — placeno ${payAmount.toFixed(0)}e od ${examTotal.toFixed(0)}e`,
        datum_nastanka: new Date().toISOString().slice(0, 10),
        status: 'aktivan',
        napomena: payNapomena || null,
      });
    }

    setPaySaving(false);
    setPayExam(null);
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
                    {fiscalData[exam.id]?.success ? (
                      <span className="p-2 text-green-600 bg-green-50 rounded-lg" title={`FIC: ${fiscalData[exam.id]?.fic}`}>
                        <CheckCircle size={16} />
                      </span>
                    ) : (
                      <button
                        className="p-2 rounded-lg transition-colors text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                        title="Naplata"
                        onClick={() => openPayment(exam)}
                      >
                        <Banknote size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Fiscal rezultat toast */}
      {fiscalResult && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl shadow-lg border ${
          fiscalResult.result.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {fiscalResult.result.success ? (
              <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${fiscalResult.result.success ? 'text-green-800' : 'text-red-800'}`}>
                {fiscalResult.result.success ? 'Fiskalizacija uspjesna!' : 'Fiskalizacija neuspjesna'}
              </p>
              {fiscalResult.result.fic && (
                <p className="text-xs text-green-600 mt-1">FIC: {fiscalResult.result.fic}</p>
              )}
              {fiscalResult.result.invoiceNumber && (
                <p className="text-xs text-green-600">Racun: {fiscalResult.result.invoiceNumber}</p>
              )}
              {fiscalResult.result.error && (
                <p className="text-xs text-red-600 mt-1">{fiscalResult.result.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {payExam && (
        <Modal isOpen onClose={() => setPayExam(null)} title="Naplata" size="md">
          <div className="space-y-4">
            {/* Pacijent */}
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900 text-base">
                {payExam.patient ? `${payExam.patient.ime} ${payExam.patient.prezime}` : 'Pacijent'}
              </p>
              {payExam.patient?.popust && payExam.patient.popust > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                  Stalni popust {payExam.patient.popust}%
                </span>
              )}
            </div>

            {/* Sumarni pregled sa inline popust kontrolom */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl divide-y divide-gray-200">
              {/* Stavke */}
              <div className="px-4 py-3 space-y-1 text-sm">
                {payExam.appointmentServices?.map((svc: any) => (
                  <div key={svc.id} className="flex justify-between text-gray-600">
                    <span className="truncate pr-2">{svc.naziv} {svc.kolicina > 1 ? `x${svc.kolicina}` : ''}</span>
                    <span className="tabular-nums shrink-0">{(Number(svc.cijena) * (Number(svc.kolicina) || 1)).toFixed(2)} EUR</span>
                  </div>
                ))}
              </div>

              {/* Osnovica */}
              <div className="px-4 py-2 flex justify-between text-sm text-gray-600">
                <span>Osnovica</span>
                <span className="tabular-nums">{payBruto.toFixed(2)} EUR</span>
              </div>

              {/* Popust row — subtilan inline input */}
              <div className="px-4 py-2 flex items-center justify-between text-sm group">
                <div className="flex items-center gap-2 text-gray-600">
                  <Tag size={12} className="text-gray-400" />
                  <span>Popust</span>
                  <div className="relative w-14">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={payPopust}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        setPayPopust(val);
                        setPayAmount(Math.max(0, payBruto * (1 - val / 100)));
                      }}
                      className="w-full px-1.5 py-0.5 pr-4 text-right text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 tabular-nums"
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 pointer-events-none">%</span>
                  </div>
                  {payExam.patient?.popust && payExam.patient.popust > 0 && payPopust !== payExam.patient.popust && (
                    <button
                      type="button"
                      onClick={() => {
                        const val = payExam.patient!.popust;
                        setPayPopust(val);
                        setPayAmount(Math.max(0, payBruto * (1 - val / 100)));
                      }}
                      className="text-[10px] text-primary-600 hover:text-primary-700 underline"
                    >
                      stalni {payExam.patient.popust}%
                    </button>
                  )}
                </div>
                <span className={`tabular-nums ${payPopust > 0 ? 'text-emerald-700 font-medium' : 'text-gray-400'}`}>
                  {payPopust > 0 ? `−${payPopustIznos.toFixed(2)} EUR` : '—'}
                </span>
              </div>

              {/* Za naplatu */}
              <div className="px-4 py-3 flex justify-between items-center bg-white rounded-b-xl">
                <span className="text-sm font-semibold text-gray-700">Za naplatu</span>
                <span className="text-lg font-bold text-gray-900 tabular-nums">{payZaNaplatu.toFixed(2)} EUR</span>
              </div>
            </div>

            {/* Iznos uplate */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Koliko pacijent placa</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 pr-12 border border-gray-300 rounded-lg text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">EUR</span>
              </div>
            </div>

            {/* Nacin placanja — smirenije */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nacin placanja</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayMethod('gotovina')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all
                    ${payMethod === 'gotovina'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                >
                  Gotovina
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('kartica')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all
                    ${payMethod === 'kartica'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                >
                  Kartica
                </button>
              </div>
            </div>

            {/* Fiskalizacija — kompaktniji toggle */}
            <div
              onClick={() => setPayFiskalizuj(!payFiskalizuj)}
              className={`flex items-center justify-between px-4 py-2.5 rounded-lg border cursor-pointer transition-all
                ${payFiskalizuj
                  ? 'border-amber-300 bg-amber-50/60'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
            >
              <div className="flex items-center gap-2.5">
                <Receipt size={16} className={payFiskalizuj ? 'text-amber-600' : 'text-gray-400'} />
                <div>
                  <p className={`text-sm font-medium ${payFiskalizuj ? 'text-amber-900' : 'text-gray-700'}`}>
                    Fiskalizacija
                  </p>
                  <p className="text-[11px] text-gray-400">Izdaj fiskalni racun</p>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${payFiskalizuj ? 'bg-amber-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${payFiskalizuj ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </div>

            {/* Upozorenje za dug */}
            {payAmount < payZaNaplatu - 0.01 && payAmount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    Preostaje dug: {(payZaNaplatu - payAmount).toFixed(2)} EUR
                  </p>
                  <p className="text-[11px] text-red-600 mt-0.5">
                    Kreirace se dugovanje za {payExam.patient?.ime} {payExam.patient?.prezime}.
                  </p>
                </div>
              </div>
            )}

            {/* Napomena */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Napomena (opciono)</label>
              <textarea
                value={payNapomena}
                onChange={(e) => setPayNapomena(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                placeholder="Opciona biljeska..."
              />
            </div>

            {/* Dugmad */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setPayExam(null)}>Otkazi</Button>
              <Button onClick={handlePaySubmit} disabled={paySaving || payAmount <= 0}>
                {paySaving ? 'Obrada...' : `Naplati ${payAmount.toFixed(2)} EUR`}
              </Button>
            </div>
          </div>
        </Modal>
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
