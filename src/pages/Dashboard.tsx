import { useMemo, useState, useEffect } from 'react';
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import { CalendarDays, Users, CreditCard, TrendingUp, Printer, Eye, FileText, Banknote, CheckCircle, XCircle, Receipt, AlertTriangle, Tag, Sun, CloudSun, Moon, Smartphone } from 'lucide-react';
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

    // Ucitaj uplate + fiskalne detalje iz payments tabele
    supabase
      .from('payments')
      .select('appointment_id, fiskalni_status, fiskalni_broj, fic, iic, qr_code_url')
      .then(({ data }) => {
        const ids = new Set((data || []).map((p: any) => p.appointment_id).filter(Boolean));
        setPaidAppointmentIds(ids);

        // Fiskalna data po appointment_id za exam-ove koji su fiskalizovani
        const map: Record<string, FiscalResult> = {};
        for (const p of data || []) {
          const pp: any = p;
          if (pp.fiskalni_status === 'success' && pp.appointment_id) {
            map[pp.appointment_id] = {
              success: true,
              fic: pp.fic,
              iic: pp.iic,
              invoiceNumber: pp.fiskalni_broj,
              qrCodeUrl: pp.qr_code_url,
            };
          }
        }
        setFiscalByAppointment(map);
      });
  }, [patients, doctors]);

  function handlePrintExam(exam: ExamWithDetails) {
    if (!exam.patient || !exam.doctor) return;
    // Pokusaj iz state-a (freski fiskal) ILI iz baze (perzistovani po appointment_id)
    const fd = fiscalData[exam.id] || (exam.appointment_id ? fiscalByAppointment[exam.appointment_id] : undefined);
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
  // Fiskalni podaci perzistovani u bazi — ucitavaju se po appointment_id
  const [fiscalByAppointment, setFiscalByAppointment] = useState<Record<string, FiscalResult>>({});
  // Appointment IDs koji imaju uplate u payments tabeli (iz baze, ne memorije)
  const [paidAppointmentIds, setPaidAppointmentIds] = useState<Set<string>>(new Set());

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
    const alreadyFiscalized = fiscalData[exam.id]?.success
      || (exam.appointment_id ? fiscalByAppointment[exam.appointment_id]?.success : false);
    if (alreadyFiscalized) {
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

    // Ako treba fiskalizacija — wrap u try/catch da payment uvijek snimi
    let fiscalResultData: FiscalResult | null = null;
    if (payFiskalizuj) {
      if (!payExam.appointmentServices || payExam.appointmentServices.length === 0) {
        setFiscalResult({ id: payExam.id, result: { success: false, error: 'Nema usluga za fiskalizaciju' } });
        setPaySaving(false);
        return;
      }

      setFiscalizing(payExam.id);
      try {
        await loadTeconioCertificate();

        const items: FiscalItem[] = payExam.appointmentServices.map((svc: any) => ({
          name: svc.naziv,
          unit: 'kom',
          quantity: Number(svc.kolicina) || 1,
          unitPriceWithVAT: Number(svc.ukupno) / (Number(svc.kolicina) || 1),
          vatRate: 21,
        }));

        const fiscalMethod = payMethod === 'kartica' ? 'CARD' : 'BANKNOTE';
        fiscalResultData = await fiscalizeInvoice(items, [
          { method: fiscalMethod, amount: payAmount },
        ]);
      } catch (e: any) {
        console.error('Fiskalizacija greska:', e);
        fiscalResultData = { success: false, error: e?.message || 'Greska pri fiskalizaciji' };
      }

      setFiscalResult({ id: payExam.id, result: fiscalResultData });
      setFiscalizing(null);

      if (fiscalResultData.success) {
        setFiscalData((prev) => ({ ...prev, [payExam.id]: fiscalResultData! }));
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
                fic: fiscalResultData!.fic,
                iic: fiscalResultData!.iic,
                invoiceNumber: fiscalResultData!.invoiceNumber,
                qrCodeUrl: fiscalResultData!.qrCodeUrl,
                totalWithoutVAT: fiscalResultData!.totals?.totalWithoutVAT,
                totalVAT: fiscalResultData!.totals?.totalVAT,
                totalPrice: fiscalResultData!.totals?.totalPrice,
              },
            });
          }, 500);
        }
      }
      setTimeout(() => setFiscalResult(null), 8000);
    }

    // Snimi uplatu u payments tabelu — UVIJEK, cak i ako fiskalizacija faila
    // (fiskalni_status biljezi rezultat; CHECK constraint dozvoljava: pending/success/failed/offline)
    const fiskalOK = !!fiscalResultData?.success;
    const paymentMethod = payFiskalizuj
      ? (payMethod === 'kartica' ? 'kartica_fiskalni' : 'gotovina_fiskalni')
      : (payMethod === 'kartica' ? 'kartica' : 'gotovina');

    if (payExam.appointment_id) {
      const { error: payError } = await supabase.from('payments').insert({
        appointment_id: payExam.appointment_id,
        iznos: payAmount,
        metoda: paymentMethod,
        napomena: payNapomena || null,
        datum: new Date().toISOString(),
        fiskalni_status: payFiskalizuj ? (fiskalOK ? 'success' : 'failed') : null,
        fiskalni_broj: fiscalResultData?.invoiceNumber || null,
        fic: fiscalResultData?.fic || null,
        iic: fiscalResultData?.iic || null,
        qr_code_url: fiscalResultData?.qrCodeUrl || null,
      });

      if (payError) {
        console.error('Greska pri snimanju uplate:', payError);
        alert(`Greska pri snimanju uplate: ${payError.message}`);
      } else {
        // Azuriraj lokalni set za instant prikaz
        setPaidAppointmentIds((prev) => new Set([...prev, payExam.appointment_id!]));
      }
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

  const todayUniquePatients = new Set(todayAppointments.map((a) => a.patient_id)).size;

  // Greeting po dobu dana
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Dobro jutro' : hour < 18 ? 'Dobar dan' : 'Dobro veče';
  const GreetIcon = hour < 12 ? Sun : hour < 18 ? CloudSun : Moon;

  // Mini kalendar — 7 dana tekuće sedmice
  const [selectedCalDay, setSelectedCalDay] = useState<Date>(new Date());
  const weekDays = useMemo(() => {
    const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, []);

  const selectedDayApts = useMemo(() =>
    appointments
      .filter((a) => isSameDay(new Date(a.pocetak), selectedCalDay))
      .sort((a, b) => new Date(a.pocetak).getTime() - new Date(b.pocetak).getTime()),
    [appointments, selectedCalDay],
  );

  // Osoblje danas sa terminima
  const todayStaff = useMemo(() =>
    doctors
      .filter((d) => todayAppointments.some((a) => a.doctor_id === d.id))
      .map((d) => ({
        ...d,
        aptCount: todayAppointments.filter((a) => a.doctor_id === d.id).length,
        revenue: todayAppointments
          .filter((a) => a.doctor_id === d.id)
          .reduce((s, a) => s + (a.services?.reduce((ss, svc) => ss + svc.ukupno, 0) || 0), 0),
      })),
    [doctors, todayAppointments],
  );

  return (
    <div className="space-y-6">
      {/* ====== GREETING ====== */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="fluid-title font-bold text-gray-900 flex items-center gap-2">
            <span className="truncate">{greeting}</span>
            <GreetIcon size={20} className="text-accent-500 shrink-0" />
          </h2>
          <p className="fluid-small text-gray-500 mt-0.5 md:mt-1 line-clamp-1">
            Pregled za {format(new Date(), 'EEEE, dd. MMMM yyyy.', { locale: sr })}
          </p>
        </div>
        <div className="px-2.5 xs:px-3 md:px-4 py-1.5 md:py-2 bg-primary-50 border border-primary-100 rounded-xl shrink-0 text-center">
          <p className="fluid-small font-semibold text-primary-700 whitespace-nowrap">{format(new Date(), 'd. MMM', { locale: sr })}</p>
          <p className="text-[9px] md:text-[10px] text-primary-500 uppercase tracking-wider">{format(new Date(), 'EEEE', { locale: sr })}</p>
        </div>
      </div>

      {/* ====== KPI KARTICE ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard icon={<CalendarDays size={22} />} label="Termini danas" value={todayAppointments.length} bg="bg-primary-50" iconColor="text-primary-600" />
        <KpiCard icon={<Users size={22} />} label="Pacijenata" value={todayUniquePatients} bg="bg-primary-50" iconColor="text-primary-600" />
        <KpiCard icon={<CreditCard size={22} />} label="Prihod danas" value={`${(todayRevenue || todayExamsTotal).toFixed(0)} €`} bg="bg-accent-50" iconColor="text-accent-600" />
        <KpiCard icon={<TrendingUp size={22} />} label="Realizacija" value={`${realizationRate}%`} bg="bg-primary-50" iconColor="text-primary-600" />
      </div>

      {/* ====== TWO-COL: Termini + Mini kalendar ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Današnji termini sa timeline */}
        <Card padding={false}>
          <div className="px-4 md:px-5 py-3 md:py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Današnji termini</h3>
            <span className="text-xs text-gray-400">{todayAppointments.length} termina</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {todayAppointments.length === 0 ? (
              <p className="px-5 py-10 text-sm text-gray-400 text-center">Nema termina za danas</p>
            ) : (
              <div className="divide-y divide-border">
                {todayAppointments.map((apt) => {
                  const patient = patients.find((p) => p.id === apt.patient_id);
                  const doctor = doctors.find((d) => d.id === apt.doctor_id);
                  const svcTotal = apt.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0;
                  const t = new Date(apt.pocetak);
                  return (
                    <div key={apt.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      {/* Timeline dot + line */}
                      <div className="flex flex-col items-center shrink-0 w-1">
                        <div className="w-2 h-2 rounded-full bg-primary-500" />
                        <div className="w-0.5 flex-1 bg-primary-100" />
                      </div>
                      {/* Time */}
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-sm font-bold text-gray-900">{format(t, 'HH:mm')}</p>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {patient ? `${patient.ime} ${patient.prezime}` : '—'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {doctor ? `${doctor.titula ? doctor.titula + ' ' : ''}${doctor.ime} ${doctor.prezime.charAt(0)}.` : ''}
                          {apt.services?.[0] && ` · ${apt.services[0].naziv}`}
                        </p>
                      </div>
                      {/* Status + amount */}
                      <div className="flex items-center gap-2 shrink-0">
                        {svcTotal > 0 && <span className="text-xs font-semibold text-gray-600">{svcTotal.toFixed(0)} €</span>}
                        {apt.confirmed_source === 'patient_link' && (
                          <span
                            title="Pacijent potvrdio dolazak preko linka"
                            className="flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white"
                          >
                            <Smartphone size={10} strokeWidth={3} />
                          </span>
                        )}
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{
                            backgroundColor: (APPOINTMENT_STATUS_COLORS[apt.status] || '#888') + '20',
                            color: APPOINTMENT_STATUS_COLORS[apt.status] || '#888',
                          }}
                        >
                          {APPOINTMENT_STATUS_LABELS[apt.status]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Mini kalendar + termini odabranog dana */}
        <Card padding={false}>
          <div className="px-4 md:px-5 py-3 md:py-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {isSameDay(selectedCalDay, new Date())
                  ? `Danas, ${format(selectedCalDay, 'dd. MMM', { locale: sr })}`
                  : format(selectedCalDay, 'EEEE, dd. MMM', { locale: sr })}
              </h3>
            </div>
            {/* 7 dana */}
            <div className="flex gap-1.5 justify-between">
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedCalDay);
                const hasApts = appointments.some((a) => isSameDay(new Date(a.pocetak), day));
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedCalDay(day)}
                    className={`flex-1 py-2 rounded-xl text-center transition-all ${
                      isSelected
                        ? 'bg-primary-600 text-white shadow-md'
                        : isToday
                          ? 'bg-primary-50 text-primary-700'
                          : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <p className="text-[10px] uppercase">{format(day, 'EEE', { locale: sr })}</p>
                    <p className={`text-lg font-bold ${isSelected ? 'text-white' : ''}`}>{format(day, 'd')}</p>
                    {hasApts && !isSelected && <div className="w-1 h-1 rounded-full bg-primary-500 mx-auto mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Termini za odabrani dan */}
          <div className="max-h-[300px] overflow-y-auto">
            {selectedDayApts.length === 0 ? (
              <p className="px-5 py-10 text-sm text-gray-400 text-center">Nema termina</p>
            ) : (
              <div className="divide-y divide-border">
                {selectedDayApts.map((apt) => {
                  const patient = patients.find((p) => p.id === apt.patient_id);
                  const t = new Date(apt.pocetak);
                  const k = new Date(apt.kraj);
                  return (
                    <div key={apt.id} className="px-5 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-10 rounded-full bg-primary-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {apt.services?.[0]?.naziv || 'Termin'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(t, 'HH:mm')} - {format(k, 'HH:mm')} · {patient ? `${patient.ime} ${patient.prezime}` : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ====== ZAVRŠENI PREGLEDI DANAS ====== */}
      {todayExams.length > 0 && (
        <div>
          <Card padding={false}>
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-green-600 shrink-0" />
                <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider truncate">Zavrseni pregledi danas</h3>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm shrink-0">
                <span className="font-semibold text-gray-900">{todayExamsTotal.toFixed(2)} EUR</span>
                <span className="text-gray-400">{todayExams.length} pr.</span>
              </div>
            </div>
            <div className="divide-y divide-border md:max-h-[500px] md:overflow-y-auto">
              {todayExams.map((exam) => {
                const isPaid = !!fiscalData[exam.id]?.success || (exam.appointment_id ? paidAppointmentIds.has(exam.appointment_id) : false);
                const hasAmount = (exam.appointmentTotal || 0) > 0;
                const needsPayment = hasAmount && !isPaid;

                return (
                  <div
                    key={exam.id}
                    className={`px-3 md:px-6 py-3 transition-colors ${
                      needsPayment ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    <div className="flex items-start md:items-center gap-3">
                      {/* Status bar */}
                      <div className={`w-1 h-10 rounded-full shrink-0 ${isPaid ? 'bg-green-500' : needsPayment ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {exam.patient ? `${exam.patient.ime} ${exam.patient.prezime}` : '—'}
                        </p>
                        <p className="text-[11px] md:text-xs text-gray-500 truncate">
                          {exam.doctor ? `${exam.doctor.titula || 'Dr'} ${exam.doctor.ime} ${exam.doctor.prezime}` : ''}
                          {exam.appointmentServices && exam.appointmentServices.length > 0
                            ? ` — ${exam.appointmentServices.map((s: any) => s.naziv).join(', ')}`
                            : ''}
                        </p>
                      </div>

                      {/* Iznos — desktop inline desno; mobilno ostaje tu (kompaktnije) */}
                      {hasAmount && (
                        <div className="shrink-0 text-right">
                          <span className={`text-xs md:text-sm font-bold px-2 py-1 rounded ${
                            isPaid
                              ? 'text-green-700 bg-green-50'
                              : 'text-amber-800 bg-amber-100'
                          }`}>
                            {exam.appointmentTotal?.toFixed(2)} €
                          </span>
                          {!isPaid && (
                            <p className="text-[9px] text-amber-600 font-semibold mt-0.5 uppercase tracking-wider">Nije naplaceno</p>
                          )}
                        </div>
                      )}

                      {/* Akcije — desktop inline */}
                      <div className="hidden md:flex gap-1 shrink-0">
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
                        {isPaid ? (
                          <span className="p-2 text-green-600 bg-green-50 rounded-lg" title={`FIC: ${fiscalData[exam.id]?.fic || (exam.appointment_id ? fiscalByAppointment[exam.appointment_id]?.fic : '') || ''}`}>
                            <CheckCircle size={16} />
                          </span>
                        ) : (
                          <button
                            className="p-2 rounded-lg transition-colors text-amber-600 bg-amber-50 hover:bg-amber-100 animate-pulse"
                            title="Naplata — nije realizovano!"
                            onClick={() => openPayment(exam)}
                          >
                            <Banknote size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Akcije — mobile: puno-sirina dugmad ispod (tap-friendly) */}
                    <div className="md:hidden flex gap-2 mt-3 pl-4">
                      <button
                        onClick={() => setViewExam(exam)}
                        className="flex-1 py-2 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye size={14} /> Nalaz
                      </button>
                      <button
                        onClick={() => handlePrintExam(exam)}
                        className="flex-1 py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Printer size={14} /> Stampa
                      </button>
                      {isPaid ? (
                        <span className="flex-1 py-2 text-xs font-medium text-green-700 bg-green-100 rounded-lg flex items-center justify-center gap-1.5">
                          <CheckCircle size={14} /> Placeno
                        </span>
                      ) : (
                        <button
                          onClick={() => openPayment(exam)}
                          className="flex-1 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Banknote size={14} /> Naplati
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ====== OSOBLJE DANAS — horizontalni scroll ====== */}
      {todayStaff.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Osoblje danas</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {todayStaff.map((d) => (
              <div key={d.id} className="bg-white border border-border rounded-xl p-4 min-w-[160px] flex flex-col items-center text-center shrink-0">
                {d.slika ? (
                  <img src={d.slika} alt={d.ime} className="w-14 h-14 rounded-full object-cover mb-2" />
                ) : (
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold mb-2" style={{ backgroundColor: d.boja }}>
                    {d.ime.charAt(0)}{d.prezime.charAt(0)}
                  </div>
                )}
                <p className="text-sm font-semibold text-gray-900 truncate w-full">
                  {d.titula ? `${d.titula} ` : ''}{d.ime} {d.prezime.charAt(0)}.
                </p>
                <p className="text-xs text-gray-500">{d.aptCount} termina</p>
                {d.revenue > 0 && <p className="text-xs text-primary-700 font-semibold mt-0.5">{d.revenue.toFixed(0)} €</p>}
              </div>
            ))}
          </div>
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

function KpiCard({ icon, label, value, bg, iconColor }: {
  icon: React.ReactNode; label: string; value: string | number; bg: string; iconColor: string;
}) {
  return (
    <div className="bg-white border border-border rounded-xl px-2.5 xs:px-3 md:px-5 py-2.5 xs:py-3 md:py-4 flex items-center gap-2 md:gap-4">
      <div className={`w-9 h-9 xs:w-10 xs:h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center ${bg} ${iconColor} shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="fluid-h2 font-bold text-gray-900 truncate leading-tight">{value}</p>
        <p className="text-[10px] xs:text-[11px] md:text-xs text-gray-500 truncate">{label}</p>
      </div>
    </div>
  );
}
