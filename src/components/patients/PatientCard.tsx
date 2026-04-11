import { useMemo, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import {
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Calendar,
  Clock, FileText, Wallet, AlertCircle, Printer, Plus,
  Activity, Pill, ClipboardList, History, CreditCard,
} from 'lucide-react';
import type { Patient, Appointment } from '../../types';
import { useCalendar } from '../../contexts/CalendarContext';
import { usePatients } from '../../contexts/PatientsContext';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '../../types';
import { supabase } from '../../lib/supabase';

interface PatientCardProps {
  patient: Patient;
  appointments: Appointment[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

type NavKey = 'istorija' | 'dijagnoze' | 'terapija' | 'finansije' | 'dugovanja' | 'napomene';

interface DebtRow {
  id: string;
  iznos: number;
  preostalo: number;
  opis: string | null;
  datum_nastanka: string;
  status: string;
  napomena: string | null;
}

interface ExamRow {
  id: string;
  datum: string;
  doctor_id: string;
  dijagnoza: string | null;
  terapija: string | null;
  appointment_id: string | null;
}

const NAV_ITEMS: { id: NavKey; label: string; icon: typeof History; dot: string }[] = [
  { id: 'istorija',   label: 'Istorija posjeta', icon: History,       dot: 'bg-blue-400' },
  { id: 'dijagnoze',  label: 'Dijagnoze',        icon: ClipboardList, dot: 'bg-indigo-400' },
  { id: 'terapija',   label: 'Terapija',         icon: Pill,          dot: 'bg-amber-400' },
  { id: 'finansije',  label: 'Finansije',        icon: Activity,      dot: 'bg-emerald-400' },
  { id: 'dugovanja',  label: 'Dugovanja',        icon: Wallet,        dot: 'bg-red-400' },
  { id: 'napomene',   label: 'Napomene',         icon: FileText,      dot: 'bg-gray-400' },
];

/** Boja + labela za status termina (badge u karticama istorije). */
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  zavrsen:    { label: 'Završen',   cls: 'bg-emerald-50  text-emerald-700' },
  potvrdjen:  { label: 'Potvrđen',  cls: 'bg-blue-50     text-blue-700' },
  zakazan:    { label: 'Zakazan',   cls: 'bg-sky-50      text-sky-700' },
  otkazan:    { label: 'Otkazan',   cls: 'bg-gray-100    text-gray-600' },
  nijedosao:  { label: 'Nije došao',cls: 'bg-red-50      text-red-700' },
};

export default function PatientCard({ patient, appointments, onBack, onEdit, onDelete }: PatientCardProps) {
  const { doctors, rooms } = useCalendar();
  const { debtsByPatient, paidByPatient } = usePatients();
  const [nav, setNav] = useState<NavKey>('istorija');
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const patientAppointments = useMemo(() =>
    appointments
      .filter((a) => a.patient_id === patient.id)
      .sort((a, b) => parseISO(b.pocetak).getTime() - parseISO(a.pocetak).getTime()),
    [appointments, patient.id],
  );

  const totalUsluga = useMemo(() =>
    patientAppointments.reduce(
      (sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0,
    ),
    [patientAppointments],
  );

  const brojPosjeta = patientAppointments.filter((a) => a.status === 'zavrsen').length;
  const brojZakazanih = patientAppointments.filter((a) => a.status === 'zakazan' || a.status === 'potvrdjen').length;

  const ukupnoDug = debtsByPatient.get(patient.id) || 0;
  const ukupnoPlaceno = paidByPatient.get(patient.id) || 0;

  const godine = patient.datum_rodjenja
    ? Math.floor((Date.now() - new Date(patient.datum_rodjenja).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  // Lazy-load dugovanja + examinations
  useEffect(() => {
    if ((nav === 'dugovanja' || nav === 'finansije') && debts.length === 0) {
      supabase
        .from('dugovanja')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setDebts((data || []) as DebtRow[]));
    }
    if ((nav === 'istorija' || nav === 'dijagnoze' || nav === 'terapija') && exams.length === 0) {
      supabase
        .from('examinations')
        .select('id, datum, doctor_id, dijagnoza, terapija, appointment_id')
        .eq('patient_id', patient.id)
        .order('datum', { ascending: false })
        .then(({ data }) => setExams((data || []) as ExamRow[]));
    }
  }, [nav, patient.id, debts.length, exams.length]);

  const initials = `${patient.ime?.[0] || ''}${patient.prezime?.[0] || ''}`.toUpperCase();
  const polLabel = patient.pol === 'muski' ? 'M' : patient.pol === 'zenski' ? 'Ž' : '—';

  const activeNavLabel = NAV_ITEMS.find((n) => n.id === nav)?.label || '';

  return (
    // -m-6 cancel-uje Layout p-6 da bi kartica zauzela cijelu sirinu ekrana
    <div className="-m-6 grid grid-cols-[260px_1fr] min-h-[calc(100vh-4rem)] bg-white">
      {/* ================= SIDEBAR ================= */}
      <aside className="bg-gray-50/70 border-r border-border flex flex-col">
        {/* Back + patient header */}
        <div className="px-4 pt-4 pb-5 border-b border-border">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={13} /> Nazad na listu
          </button>

          <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg mb-3">
            {initials || '?'}
          </div>
          <h2 className="text-[15px] font-semibold text-gray-900 leading-tight break-words">
            {patient.ime} {patient.prezime}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {patient.datum_rodjenja
              ? new Date(patient.datum_rodjenja).toLocaleDateString('sr-Latn-ME')
              : '—'}
            {godine !== null && <> · {godine} god.</>}
            {polLabel !== '—' && <> · {polLabel}</>}
          </p>
        </div>

        {/* Napomena kao warning (ako postoji) */}
        {patient.napomena && (
          <div className="mx-3 mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <span className="text-[11px] text-amber-800 leading-snug line-clamp-3">
              {patient.napomena}
            </span>
          </div>
        )}

        {/* Info grid */}
        <div className="px-4 py-3 border-b border-border mt-3">
          {[
            ['Br. kartona', patient.id.slice(0, 8).toUpperCase()],
            ['Telefon', patient.telefon],
            ['Email', patient.email || '—'],
            ['Grad', patient.grad || '—'],
            ['JMBG', patient.jmbg || '—'],
            ['Osiguranje', patient.osiguranje || '—'],
            ['Izvor', patient.izvor_preporuke || '—'],
            ['Popust', patient.popust > 0 ? `${patient.popust}%` : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-1 text-[11px]">
              <span className="text-gray-400">{k}</span>
              <span className="font-semibold text-gray-800 text-right max-w-[130px] truncate" title={String(v)}>
                {v}
              </span>
            </div>
          ))}
        </div>

        {/* Tagovi */}
        {patient.tagovi.length > 0 && (
          <div className="px-4 py-3 border-b border-border flex flex-wrap gap-1.5">
            {patient.tagovi.map((t) => (
              <span key={t} className="px-2 py-0.5 text-[10px] font-medium bg-primary-50 text-primary-700 rounded-full border border-primary-100">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Kontakt quick links */}
        <div className="px-4 py-3 border-b border-border space-y-2">
          <a href={`tel:${patient.telefon}`} className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700">
            <Phone size={12} /> Pozovi
          </a>
          {patient.email && (
            <a href={`mailto:${patient.email}`} className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700">
              <Mail size={12} /> Email
            </a>
          )}
          {(patient.adresa || patient.grad) && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin size={12} className="text-gray-400" />
              <span className="truncate">{patient.adresa ? `${patient.adresa}, ` : ''}{patient.grad || ''}</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2 px-2">
            Sadržaj kartona
          </div>
          {NAV_ITEMS.map((item) => {
            const active = nav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNav(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  active
                    ? 'bg-white text-gray-900 font-semibold shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:bg-white/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Actions (bottom) */}
        <div className="px-3 py-3 border-t border-border flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-white transition-colors"
          >
            <Edit size={12} /> Izmijeni
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{activeNavLabel}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {nav === 'istorija' && `${patientAppointments.length} termina`}
              {nav === 'dijagnoze' && `${exams.filter((e) => e.dijagnoza).length} dijagnoza`}
              {nav === 'terapija' && `${exams.filter((e) => e.terapija).length} terapija`}
              {nav === 'dugovanja' && `${debts.length} zapisa`}
              {nav === 'finansije' && `Ukupno usluga: ${totalUsluga.toFixed(0)} €`}
              {nav === 'napomene' && (patient.napomena ? '1 napomena' : 'Nema napomena')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Printer size={13} /> Štampaj
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors">
              <Plus size={13} /> Nova posjeta
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="px-6 py-3 border-b border-border grid grid-cols-5 gap-3 shrink-0 bg-gray-50/50">
          <KpiCell icon={<Calendar size={14} className="text-blue-600" />} label="Posjeta" value={brojPosjeta} />
          <KpiCell icon={<Clock size={14} className="text-amber-600" />} label="Zakazano" value={brojZakazanih} />
          <KpiCell icon={<FileText size={14} className="text-gray-600" />} label="Usluge" value={`${totalUsluga.toFixed(0)} €`} />
          <KpiCell icon={<CreditCard size={14} className="text-emerald-600" />} label="Uplaćeno" value={`${ukupnoPlaceno.toFixed(0)} €`} color="text-emerald-700" />
          <KpiCell icon={<Wallet size={14} className={ukupnoDug > 0 ? 'text-red-600' : 'text-gray-400'} />} label="Dugovanje" value={`${ukupnoDug.toFixed(0)} €`} color={ukupnoDug > 0 ? 'text-red-700' : 'text-gray-900'} />
        </div>

        {/* Content scroll area */}
        <div className="flex-1 overflow-y-auto">
          {nav === 'istorija' && (
            <IstorijaView
              appointments={patientAppointments}
              exams={exams}
              doctors={doctors}
              rooms={rooms}
              expanded={expanded}
              setExpanded={setExpanded}
            />
          )}
          {nav === 'dijagnoze' && <DijagnozeView exams={exams} doctors={doctors} appointments={patientAppointments} />}
          {nav === 'terapija' && <TerapijaView exams={exams} doctors={doctors} appointments={patientAppointments} />}
          {nav === 'finansije' && <FinansijeView totalUsluga={totalUsluga} ukupnoPlaceno={ukupnoPlaceno} ukupnoDug={ukupnoDug} pocetnoStanje={patient.pocetno_stanje} popust={patient.popust} debts={debts} />}
          {nav === 'dugovanja' && <DugovanjaView debts={debts} ukupnoDug={ukupnoDug} />}
          {nav === 'napomene' && <NapomeneView napomena={patient.napomena ?? null} />}
        </div>
      </main>
    </div>
  );
}

// ====================================================================
// KPI cell u strip-u
// ====================================================================
function KpiCell({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-bold ${color || 'text-gray-900'} truncate`}>{value}</p>
      </div>
    </div>
  );
}

// ====================================================================
// Istorija: grupisano po godinama, expandable kartice
// ====================================================================
function IstorijaView({
  appointments, exams, doctors, rooms, expanded, setExpanded,
}: {
  appointments: Appointment[];
  exams: ExamRow[];
  doctors: any[];
  rooms: any[];
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  if (appointments.length === 0) {
    return (
      <EmptyState icon={<Calendar size={40} />} label="Nema termina za ovog pacijenta" />
    );
  }

  // Grupisi po godinama
  const byYear = appointments.reduce<Record<string, Appointment[]>>((acc, a) => {
    const y = String(parseISO(a.pocetak).getFullYear());
    if (!acc[y]) acc[y] = [];
    acc[y].push(a);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="px-6 py-5">
      {years.map((y) => (
        <div key={y} className="mb-6">
          <div className="text-[11px] uppercase tracking-[0.08em] text-gray-400 font-semibold pb-2 mb-3 border-b border-border">
            {y}
          </div>
          <div className="space-y-2.5">
            {byYear[y].map((apt) => {
              const doctor = doctors.find((d) => d.id === apt.doctor_id);
              const room = rooms.find((r) => r.id === apt.room_id);
              const exam = exams.find((e) => e.appointment_id === apt.id);
              const total = apt.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0;
              const badge = STATUS_BADGE[apt.status] || STATUS_BADGE.zakazan;
              const isOpen = !!expanded[apt.id];
              const dt = parseISO(apt.pocetak);
              const dan = format(dt, 'dd');
              const mj = format(dt, 'MMM', { locale: sr });
              const trajanjeMin = Math.max(0, Math.round((parseISO(apt.kraj).getTime() - dt.getTime()) / 60000));
              const trajanje = trajanjeMin > 0 ? `${trajanjeMin} min` : '—';
              const doctorLabel = doctor ? `${doctor.titula || ''} ${doctor.ime} ${doctor.prezime}`.trim() : '—';
              const naslov = apt.services && apt.services.length > 0
                ? apt.services.map((s) => s.naziv).join(', ')
                : 'Termin';
              const kratko = `${format(dt, 'HH:mm')} · ${doctorLabel}${room ? ` · ${room.naziv}` : ''}${total > 0 ? ` · ${total.toFixed(0)} €` : ''}`;

              return (
                <div key={apt.id} className="grid grid-cols-[48px_1fr] gap-3">
                  {/* Datum */}
                  <div className="text-center pt-2">
                    <div className="text-xl font-bold text-gray-900 leading-none">{dan}</div>
                    <div className="text-[10px] text-gray-400 uppercase mt-1">{mj}</div>
                  </div>

                  {/* Card */}
                  <div
                    onClick={() => setExpanded((prev) => ({ ...prev, [apt.id]: !prev[apt.id] }))}
                    className={`bg-white border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                      isOpen ? 'border-gray-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{
                          backgroundColor: (APPOINTMENT_STATUS_COLORS[apt.status] || '#888') + '20',
                          color: APPOINTMENT_STATUS_COLORS[apt.status] || badge.cls,
                        }}
                      >
                        {APPOINTMENT_STATUS_LABELS[apt.status] || badge.label}
                      </span>
                      <span className="text-[11px] text-gray-400">{doctorLabel}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">{naslov}</div>
                    <div className="text-[11px] text-gray-500">{kratko}</div>

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-border">
                        {/* Grid detalji */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <DetailCell label="Doktor" value={doctorLabel} />
                          <DetailCell label="Soba" value={room?.naziv || '—'} />
                          <DetailCell label="Trajanje" value={trajanje} />
                          <DetailCell label="Vrijednost" value={total > 0 ? `${total.toFixed(2)} €` : '—'} />
                        </div>

                        {/* Biljeska / dijagnoza / terapija */}
                        {(apt.napomena || exam?.dijagnoza || exam?.terapija) && (
                          <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 text-xs text-gray-700 space-y-1.5">
                            {apt.napomena && (
                              <p><strong className="text-gray-900">Napomena:</strong> {apt.napomena}</p>
                            )}
                            {exam?.dijagnoza && (
                              <p><strong className="text-gray-900">Dijagnoza:</strong> {exam.dijagnoza}</p>
                            )}
                            {exam?.terapija && (
                              <p><strong className="text-gray-900">Terapija:</strong> {exam.terapija}</p>
                            )}
                          </div>
                        )}

                        {/* Tagovi: services */}
                        {apt.services && apt.services.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {apt.services.map((s, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                {s.naziv} · {s.ukupno.toFixed(0)} €
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

// ====================================================================
// Dijagnoze view
// ====================================================================
function DijagnozeView({ exams, doctors, appointments }: { exams: ExamRow[]; doctors: any[]; appointments: Appointment[] }) {
  const withDx = exams.filter((e) => e.dijagnoza);
  if (withDx.length === 0) {
    return <EmptyState icon={<ClipboardList size={40} />} label="Nema zabilježenih dijagnoza" />;
  }
  return (
    <div className="px-6 py-5 space-y-2.5">
      {withDx.map((e) => {
        const doctor = doctors.find((d) => d.id === e.doctor_id);
        const apt = appointments.find((a) => a.id === e.appointment_id);
        return (
          <div key={e.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 uppercase tracking-wider">
                Dijagnoza
              </span>
              <span className="text-[11px] text-gray-400">
                {new Date(e.datum).toLocaleDateString('sr-Latn-ME')}
              </span>
            </div>
            <p className="text-sm text-gray-900 mb-1">{e.dijagnoza}</p>
            <p className="text-[11px] text-gray-500">
              {doctor ? `${doctor.titula || ''} ${doctor.ime} ${doctor.prezime}`.trim() : '—'}
              {apt?.services?.[0] && ` · ${apt.services[0].naziv}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ====================================================================
// Terapija view
// ====================================================================
function TerapijaView({ exams, doctors, appointments }: { exams: ExamRow[]; doctors: any[]; appointments: Appointment[] }) {
  const withTx = exams.filter((e) => e.terapija);
  if (withTx.length === 0) {
    return <EmptyState icon={<Pill size={40} />} label="Nema zabilježenih terapija" />;
  }
  return (
    <div className="px-6 py-5 space-y-2.5">
      {withTx.map((e) => {
        const doctor = doctors.find((d) => d.id === e.doctor_id);
        const apt = appointments.find((a) => a.id === e.appointment_id);
        return (
          <div key={e.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 uppercase tracking-wider">
                Terapija
              </span>
              <span className="text-[11px] text-gray-400">
                {new Date(e.datum).toLocaleDateString('sr-Latn-ME')}
              </span>
            </div>
            <p className="text-sm text-gray-900 mb-1 whitespace-pre-wrap">{e.terapija}</p>
            <p className="text-[11px] text-gray-500">
              {doctor ? `${doctor.titula || ''} ${doctor.ime} ${doctor.prezime}`.trim() : '—'}
              {apt?.services?.[0] && ` · ${apt.services[0].naziv}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ====================================================================
// Finansije view
// ====================================================================
function FinansijeView({
  totalUsluga, ukupnoPlaceno, ukupnoDug, pocetnoStanje, popust, debts,
}: {
  totalUsluga: number;
  ukupnoPlaceno: number;
  ukupnoDug: number;
  pocetnoStanje: number;
  popust: number;
  debts: DebtRow[];
}) {
  const placeni = debts.filter((d) => d.status === 'placen');
  return (
    <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Sumarni pregled</h4>
        <div className="space-y-2.5">
          <FinRow label="Ukupna vrijednost usluga" value={totalUsluga} />
          <FinRow label="Ukupno uplaćeno" value={ukupnoPlaceno} colorPositive />
          <FinRow label="Početno stanje" value={pocetnoStanje} />
          <FinRow label="Aktivno dugovanje" value={ukupnoDug} colorNegative />
          {popust > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-gray-600">Stalni popust</span>
              <span className="text-sm font-semibold text-emerald-700">{popust}%</span>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Plaćena dugovanja ({placeni.length})</h4>
        {placeni.length === 0 ? (
          <p className="text-xs text-gray-400">Nema plaćenih dugovanja</p>
        ) : (
          <div className="space-y-1.5">
            {placeni.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate">{d.opis || '—'}</span>
                <span className="text-emerald-700 font-semibold shrink-0 ml-2">{Number(d.iznos).toFixed(0)} €</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FinRow({ label, value, colorPositive, colorNegative }: { label: string; value: number; colorPositive?: boolean; colorNegative?: boolean }) {
  const color = colorPositive ? 'text-emerald-700' : colorNegative && value > 0 ? 'text-red-700' : 'text-gray-900';
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value.toFixed(2)} €</span>
    </div>
  );
}

// ====================================================================
// Dugovanja view
// ====================================================================
function DugovanjaView({ debts, ukupnoDug }: { debts: DebtRow[]; ukupnoDug: number }) {
  if (debts.length === 0) {
    return <EmptyState icon={<Wallet size={40} />} label="Nema zabilježenih dugovanja" />;
  }
  return (
    <div className="px-6 py-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-gray-500">Aktivno dugovanje:</span>
        <span className={`text-lg font-bold ${ukupnoDug > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
          {ukupnoDug.toFixed(2)} €
        </span>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-border overflow-hidden">
        {debts.map((d) => {
          const isActive = d.status === 'aktivan';
          return (
            <div key={d.id} className="px-4 py-3 flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500' : 'bg-emerald-500'} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{d.opis || '—'}</p>
                <p className="text-xs text-gray-400">
                  {new Date(d.datum_nastanka).toLocaleDateString('sr-Latn-ME')}
                  {d.napomena && ` · ${d.napomena}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${isActive ? 'text-red-700' : 'text-gray-500'}`}>
                  {Number(d.preostalo).toFixed(2)} €
                </p>
                <p className="text-[10px] text-gray-400">od {Number(d.iznos).toFixed(2)} €</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isActive ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {isActive ? 'Aktivan' : 'Plaćen'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ====================================================================
// Napomene view
// ====================================================================
function NapomeneView({ napomena }: { napomena: string | null }) {
  if (!napomena) {
    return <EmptyState icon={<FileText size={40} />} label="Nema napomena za ovog pacijenta" />;
  }
  return (
    <div className="px-6 py-5">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{napomena}</p>
      </div>
    </div>
  );
}

// ====================================================================
// Empty state
// ====================================================================
function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-300">
      <div className="mb-3">{icon}</div>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
