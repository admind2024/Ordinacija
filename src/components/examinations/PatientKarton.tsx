import { useMemo, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, FileText, Wallet,
  AlertCircle, Printer, Plus, Trash2, Pill, ClipboardList, History,
  Package, Stethoscope,
} from 'lucide-react';
import type { Patient, Appointment, Doctor, Examination, Material } from '../../types';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '../../types';
import { supabase } from '../../lib/supabase';
import ExaminationForm from './ExaminationForm';
import Button from '../ui/Button';

interface UsedMaterial {
  id: string;
  material_id: string;
  naziv: string;
  kolicina: number;
  jedinica: string;
}

interface PatientKartonProps {
  patient: Patient;
  loggedDoctor: Doctor;
  allDoctors: Doctor[];
  materials: Material[];
  appointments: Appointment[];              // svi termini ovog pacijenta (kod ovog doktora ili ukupno)
  exams: Examination[];                     // sve examinations ovog pacijenta
  selectedAppointment: Appointment | null;  // trenutni (obicno danasnji) termin za pregled
  currentExam: Examination | null;          // exam vezan za selectedAppointment ako postoji
  usedMaterials: UsedMaterial[];
  saving: boolean;
  onBack: () => void;
  onSelectAppointment: (apt: Appointment) => void;
  onSaveExam: (data: Partial<Examination>, finish: boolean) => Promise<void>;
  onPrintExam: (exam: Examination) => void;
  onAddMaterial: (materialId: string, kolicina: number) => void;
  onRemoveMaterial: (usageId: string) => void;
}

type NavKey = 'pregled' | 'istorija' | 'dijagnoze' | 'terapija' | 'materijali' | 'napomene';

const NAV_ITEMS: { id: NavKey; label: string; icon: typeof History; dot: string }[] = [
  { id: 'pregled',    label: 'Trenutni pregled', icon: Stethoscope,   dot: 'bg-primary-500' },
  { id: 'istorija',   label: 'Istorija posjeta', icon: History,       dot: 'bg-blue-400' },
  { id: 'dijagnoze',  label: 'Dijagnoze',        icon: ClipboardList, dot: 'bg-indigo-400' },
  { id: 'terapija',   label: 'Terapija',         icon: Pill,          dot: 'bg-amber-400' },
  { id: 'materijali', label: 'Materijali',       icon: Package,       dot: 'bg-purple-400' },
  { id: 'napomene',   label: 'Napomene',         icon: FileText,      dot: 'bg-gray-400' },
];

interface DebtRow {
  id: string;
  iznos: number;
  preostalo: number;
  opis: string | null;
  datum_nastanka: string;
  status: string;
}

export default function PatientKarton(props: PatientKartonProps) {
  const {
    patient, loggedDoctor, allDoctors, materials, appointments, exams,
    selectedAppointment, currentExam, usedMaterials, saving,
    onBack, onSelectAppointment, onSaveExam, onPrintExam, onAddMaterial, onRemoveMaterial,
  } = props;

  // Default nav: ako postoji selektovan termin (obicno danas), otvori pregled; inace istorija
  const [nav, setNav] = useState<NavKey>(selectedAppointment ? 'pregled' : 'istorija');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialQty, setMaterialQty] = useState('1');
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [debtsLoaded, setDebtsLoaded] = useState(false);

  // Lazy load dugovanja za ovog pacijenta (za sidebar "saldo" indikator)
  useEffect(() => {
    if (!debtsLoaded) {
      supabase
        .from('dugovanja')
        .select('id, iznos, preostalo, opis, datum_nastanka, status')
        .eq('patient_id', patient.id)
        .eq('status', 'aktivan')
        .then(({ data }) => {
          setDebts((data || []) as DebtRow[]);
          setDebtsLoaded(true);
        });
    }
  }, [patient.id, debtsLoaded]);

  const godine = patient.datum_rodjenja
    ? Math.floor((Date.now() - new Date(patient.datum_rodjenja).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const initials = `${patient.ime?.[0] || ''}${patient.prezime?.[0] || ''}`.toUpperCase();
  const polLabel = patient.pol === 'muski' ? 'M' : patient.pol === 'zenski' ? 'Ž' : '—';

  const dugTotal = debts.reduce((sum, d) => sum + Number(d.preostalo || 0), 0);

  // Appointments sortirani desc
  const sortedAppointments = useMemo(() =>
    [...appointments].sort((a, b) => parseISO(b.pocetak).getTime() - parseISO(a.pocetak).getTime()),
    [appointments],
  );

  // Stats
  const brojPosjeta = appointments.filter((a) => a.status === 'zavrsen').length;
  const brojZakazanih = appointments.filter((a) => a.status === 'zakazan' || a.status === 'potvrdjen').length;

  const aptServices = useMemo(() => selectedAppointment?.services || [], [selectedAppointment]);
  const aptTotal = useMemo(() => aptServices.reduce((s, svc) => s + svc.ukupno, 0), [aptServices]);

  function handleAddMaterialClick() {
    if (!selectedMaterialId) return;
    const qty = parseFloat(materialQty);
    if (!qty || qty <= 0) return;
    onAddMaterial(selectedMaterialId, qty);
    setSelectedMaterialId('');
    setMaterialQty('1');
  }

  const activeNavLabel = NAV_ITEMS.find((n) => n.id === nav)?.label || '';

  return (
    // Fixed full-screen overlay preko cijele aplikacije (uklj. lijevi meni)
    <div className="fixed inset-0 z-50 bg-white grid grid-cols-[240px_1fr]">
      {/* ================= SIDEBAR (tamni, kao glavni meni) ================= */}
      <aside className="bg-sidebar text-white flex flex-col overflow-y-auto">
        {/* Back + patient header */}
        <div className="px-4 pt-4 pb-5 border-b border-white/10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white mb-5 font-medium"
          >
            <ArrowLeft size={15} /> Nazad
          </button>

          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center font-bold text-lg mb-3">
            {initials || '?'}
          </div>
          <h2 className="text-base font-semibold text-white leading-tight break-words">
            {patient.ime} {patient.prezime}
          </h2>
          <p className="text-xs text-white/60 mt-1">
            {patient.datum_rodjenja
              ? new Date(patient.datum_rodjenja).toLocaleDateString('sr-Latn-ME')
              : '—'}
            {godine !== null && <> · {godine} god.</>}
            {polLabel !== '—' && <> · {polLabel}</>}
          </p>

          {loggedDoctor && (
            <p className="text-[11px] text-white/40 mt-2">
              Dr. {loggedDoctor.ime} {loggedDoctor.prezime}
            </p>
          )}
        </div>

        {/* Napomena warning */}
        {patient.napomena && (
          <div className="mx-3 mt-3 px-3 py-2.5 bg-amber-500/15 border border-amber-500/20 rounded-lg flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-300 mb-0.5">Napomena</p>
              <p className="text-[11px] text-amber-100 leading-snug">{patient.napomena}</p>
            </div>
          </div>
        )}

        {/* Dug warning */}
        {dugTotal > 0 && (
          <div className="mx-3 mt-2 px-3 py-2 bg-red-500/15 border border-red-500/20 rounded-lg flex items-center gap-2">
            <Wallet size={14} className="text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-red-300">Dug</p>
              <p className="text-xs font-bold text-red-200">{dugTotal.toFixed(0)} €</p>
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="px-4 py-3 mt-3 border-b border-white/10">
          {[
            ['Telefon', patient.telefon],
            ['Email', patient.email || '—'],
            ['Grad', patient.grad || '—'],
            ['JMBG', patient.jmbg || '—'],
            ['Osiguranje', patient.osiguranje || '—'],
            ['Popust', patient.popust > 0 ? `${patient.popust}%` : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-1 text-[11px]">
              <span className="text-white/40">{k}</span>
              <span className="font-semibold text-white text-right max-w-[130px] truncate" title={String(v)}>
                {v}
              </span>
            </div>
          ))}
        </div>

        {/* Tagovi */}
        {patient.tagovi.length > 0 && (
          <div className="px-4 py-3 border-b border-white/10 flex flex-wrap gap-1.5">
            {patient.tagovi.map((t) => (
              <span key={t} className="px-2 py-0.5 text-[10px] font-medium bg-white/10 text-white/80 rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Kontakt quick links */}
        <div className="px-4 py-3 border-b border-white/10 space-y-2">
          {patient.telefon && (
            <a href={`tel:${patient.telefon}`} className="flex items-center gap-2 text-xs text-primary-300 hover:text-white">
              <Phone size={12} /> Pozovi
            </a>
          )}
          {patient.email && (
            <a href={`mailto:${patient.email}`} className="flex items-center gap-2 text-xs text-primary-300 hover:text-white">
              <Mail size={12} /> Email
            </a>
          )}
          {(patient.adresa || patient.grad) && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <MapPin size={12} />
              <span className="truncate">{patient.adresa ? `${patient.adresa}, ` : ''}{patient.grad || ''}</span>
            </div>
          )}
        </div>

        {/* Nav — isti stil kao glavni sidebar */}
        <nav className="flex-1 px-2 py-3">
          <div className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2 px-3">
            Sadržaj kartona
          </div>
          {NAV_ITEMS.map((item) => {
            const active = nav === item.id;
            const disabled = item.id === 'pregled' && !selectedAppointment;
            return (
              <button
                key={item.id}
                onClick={() => !disabled && setNav(item.id)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5 ${
                  active
                    ? 'bg-primary-600 text-white font-semibold'
                    : disabled
                      ? 'text-white/20 cursor-not-allowed'
                      : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{activeNavLabel}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {nav === 'pregled' && (selectedAppointment
                ? `Termin ${format(parseISO(selectedAppointment.pocetak), 'dd.MM.yyyy. HH:mm')}`
                : 'Nema odabranog termina')}
              {nav === 'istorija' && `${appointments.length} termina`}
              {nav === 'dijagnoze' && `${exams.filter((e) => e.nalaz).length} dijagnoza`}
              {nav === 'terapija' && `${exams.filter((e) => e.terapija).length} terapija`}
              {nav === 'materijali' && `${usedMaterials.length} utrosenih`}
              {nav === 'napomene' && (patient.napomena ? '1 napomena' : 'Nema napomena')}
            </p>
          </div>
          <div className="flex gap-2">
            {currentExam && currentExam.status === 'zavrsen' && (
              <Button variant="secondary" size="sm" onClick={() => onPrintExam(currentExam)}>
                <Printer size={13} /> Štampaj izvještaj
              </Button>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="px-6 py-3 border-b border-border grid grid-cols-4 gap-3 shrink-0 bg-gray-50/50">
          <KpiCell icon={<Calendar size={14} className="text-blue-600" />} label="Posjeta" value={brojPosjeta} />
          <KpiCell icon={<Clock size={14} className="text-amber-600" />} label="Zakazano" value={brojZakazanih} />
          <KpiCell icon={<ClipboardList size={14} className="text-primary-600" />} label="Dijagnoza" value={exams.filter((e) => e.nalaz).length} />
          <KpiCell icon={<Wallet size={14} className={dugTotal > 0 ? 'text-red-600' : 'text-gray-400'} />} label="Dug" value={`${dugTotal.toFixed(0)} €`} color={dugTotal > 0 ? 'text-red-700' : 'text-gray-900'} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {nav === 'pregled' && (
            <PregledView
              selectedAppointment={selectedAppointment}
              currentExam={currentExam}
              aptServices={aptServices}
              aptTotal={aptTotal}
              saving={saving}
              onSaveExam={onSaveExam}
            />
          )}

          {nav === 'istorija' && (
            <IstorijaView
              appointments={sortedAppointments}
              exams={exams}
              doctors={allDoctors}
              expanded={expanded}
              setExpanded={setExpanded}
              onSelectAppointment={(apt) => { onSelectAppointment(apt); setNav('pregled'); }}
            />
          )}

          {nav === 'dijagnoze' && <DijagnozeView exams={exams} doctors={allDoctors} />}
          {nav === 'terapija' && <TerapijaView exams={exams} doctors={allDoctors} />}

          {nav === 'materijali' && (
            <MaterijaliView
              currentExam={currentExam}
              materials={materials}
              usedMaterials={usedMaterials}
              selectedMaterialId={selectedMaterialId}
              setSelectedMaterialId={setSelectedMaterialId}
              materialQty={materialQty}
              setMaterialQty={setMaterialQty}
              onAdd={handleAddMaterialClick}
              onRemove={onRemoveMaterial}
            />
          )}

          {nav === 'napomene' && <NapomeneView napomena={patient.napomena ?? null} />}
        </div>
      </main>
    </div>
  );
}

// ====================================================================
// KPI cell
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
// Pregled view (form za aktivni termin)
// ====================================================================
function PregledView({
  selectedAppointment, currentExam, aptServices, aptTotal, saving, onSaveExam,
}: {
  selectedAppointment: Appointment | null;
  currentExam: Examination | null;
  aptServices: any[];
  aptTotal: number;
  saving: boolean;
  onSaveExam: (data: Partial<Examination>, finish: boolean) => Promise<void>;
}) {
  if (!selectedAppointment) {
    return <EmptyState icon={<Stethoscope size={40} />} label="Nema aktivnog termina. Izaberi termin iz Istorije posjeta." />;
  }

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Termin info + usluge */}
      <div className="bg-white border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider">Termin</p>
            <p className="text-sm font-semibold text-gray-900">
              {format(parseISO(selectedAppointment.pocetak), 'EEEE, dd.MM.yyyy. HH:mm', { locale: sr })}
            </p>
          </div>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: (APPOINTMENT_STATUS_COLORS[selectedAppointment.status] || '#888') + '20',
              color: APPOINTMENT_STATUS_COLORS[selectedAppointment.status] || '#888',
            }}
          >
            {APPOINTMENT_STATUS_LABELS[selectedAppointment.status]}
          </span>
        </div>

        {aptServices.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-1.5">
              {aptServices.map((s, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {s.naziv}
                </span>
              ))}
            </div>
            <span className="text-sm font-bold text-gray-900 whitespace-nowrap ml-3">{aptTotal.toFixed(2)} €</span>
          </div>
        )}

        {selectedAppointment.napomena && (
          <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
            <strong className="text-gray-900">Napomena termina:</strong> {selectedAppointment.napomena}
          </p>
        )}
      </div>

      {/* Form */}
      <div className="bg-white border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-primary-600" />
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {currentExam ? (currentExam.status === 'zavrsen' ? 'Završen pregled' : 'Nastavi pregled') : 'Novi pregled'}
          </h3>
          {currentExam?.status === 'zavrsen' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Završen</span>
          )}
        </div>
        <ExaminationForm
          key={currentExam?.id || selectedAppointment.id}
          initialData={currentExam || undefined}
          onSave={onSaveExam}
          saving={saving}
          appointmentServices={aptServices}
          appointmentNapomena={selectedAppointment.napomena ?? undefined}
        />
      </div>
    </div>
  );
}

// ====================================================================
// Istorija view (grupisano po godinama)
// ====================================================================
function IstorijaView({
  appointments, exams, doctors, expanded, setExpanded, onSelectAppointment,
}: {
  appointments: Appointment[];
  exams: Examination[];
  doctors: Doctor[];
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onSelectAppointment: (apt: Appointment) => void;
}) {
  if (appointments.length === 0) {
    return <EmptyState icon={<Calendar size={40} />} label="Nema termina za ovog pacijenta" />;
  }

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
              const exam = exams.find((e) => e.appointment_id === apt.id);
              const total = apt.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0;
              const isOpen = !!expanded[apt.id];
              const dt = parseISO(apt.pocetak);
              const dan = format(dt, 'dd');
              const mj = format(dt, 'MMM', { locale: sr });
              const doctorLabel = doctor ? `${doctor.titula || ''} ${doctor.ime} ${doctor.prezime}`.trim() : '—';
              const naslov = apt.services && apt.services.length > 0
                ? apt.services.map((s) => s.naziv).join(', ')
                : 'Termin';
              const kratko = `${format(dt, 'HH:mm')} · ${doctorLabel}${total > 0 ? ` · ${total.toFixed(0)} €` : ''}`;

              return (
                <div key={apt.id} className="grid grid-cols-[48px_1fr] gap-3">
                  <div className="text-center pt-2">
                    <div className="text-xl font-bold text-gray-900 leading-none">{dan}</div>
                    <div className="text-[10px] text-gray-400 uppercase mt-1">{mj}</div>
                  </div>

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
                          color: APPOINTMENT_STATUS_COLORS[apt.status] || '#888',
                        }}
                      >
                        {APPOINTMENT_STATUS_LABELS[apt.status]}
                      </span>
                      <span className="text-[11px] text-gray-400">{doctorLabel}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">{naslov}</div>
                    <div className="text-[11px] text-gray-500">{kratko}</div>

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-border">
                        {(apt.napomena || exam?.nalaz || exam?.terapija) && (
                          <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 text-xs text-gray-700 space-y-1.5">
                            {apt.napomena && (
                              <p><strong className="text-gray-900">Napomena:</strong> {apt.napomena}</p>
                            )}
                            {exam?.nalaz && (
                              <p><strong className="text-gray-900">Dijagnoza:</strong> {exam.nalaz}</p>
                            )}
                            {exam?.terapija && (
                              <p><strong className="text-gray-900">Terapija:</strong> {exam.terapija}</p>
                            )}
                          </div>
                        )}

                        {apt.services && apt.services.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {apt.services.map((s, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                {s.naziv} · {s.ukupno.toFixed(0)} €
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectAppointment(apt); }}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                        >
                          Otvori pregled za ovaj termin →
                        </button>
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

// ====================================================================
// Dijagnoze view
// ====================================================================
function DijagnozeView({ exams, doctors }: { exams: Examination[]; doctors: Doctor[] }) {
  const withDx = exams.filter((e) => e.nalaz);
  if (withDx.length === 0) {
    return <EmptyState icon={<ClipboardList size={40} />} label="Nema zabilježenih dijagnoza" />;
  }
  return (
    <div className="px-6 py-5 space-y-2.5">
      {withDx.map((e) => {
        const doctor = doctors.find((d) => d.id === e.doctor_id);
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
            <p className="text-sm text-gray-900 mb-1 whitespace-pre-wrap">{e.nalaz}</p>
            <p className="text-[11px] text-gray-500">
              {doctor ? `${doctor.titula || ''} ${doctor.ime} ${doctor.prezime}`.trim() : '—'}
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
function TerapijaView({ exams, doctors }: { exams: Examination[]; doctors: Doctor[] }) {
  const withTx = exams.filter((e) => e.terapija);
  if (withTx.length === 0) {
    return <EmptyState icon={<Pill size={40} />} label="Nema zabilježenih terapija" />;
  }
  return (
    <div className="px-6 py-5 space-y-2.5">
      {withTx.map((e) => {
        const doctor = doctors.find((d) => d.id === e.doctor_id);
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
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ====================================================================
// Materijali view
// ====================================================================
function MaterijaliView({
  currentExam, materials, usedMaterials,
  selectedMaterialId, setSelectedMaterialId, materialQty, setMaterialQty,
  onAdd, onRemove,
}: {
  currentExam: Examination | null;
  materials: Material[];
  usedMaterials: UsedMaterial[];
  selectedMaterialId: string;
  setSelectedMaterialId: (v: string) => void;
  materialQty: string;
  setMaterialQty: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  if (!currentExam) {
    return <EmptyState icon={<Package size={40} />} label="Materijali se unose tek kad se otvori pregled za termin." />;
  }

  return (
    <div className="px-6 py-5">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex gap-2 mb-3">
          <select
            value={selectedMaterialId}
            onChange={(e) => setSelectedMaterialId(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
          >
            <option value="">Odaberi materijal...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.naziv} ({m.jedinica_mjere})</option>
            ))}
          </select>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={materialQty}
            onChange={(e) => setMaterialQty(e.target.value)}
            className="w-20 px-3 py-2.5 border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
            placeholder="Kol."
          />
          <Button size="sm" onClick={onAdd} disabled={!selectedMaterialId}>
            <Plus size={14} /> Dodaj
          </Button>
        </div>

        {usedMaterials.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-6">Nema unesenih materijala</p>
        ) : (
          <div className="space-y-1.5">
            {usedMaterials.map((um) => (
              <div key={um.id} className="flex items-center justify-between bg-primary-50 rounded-lg px-3 py-2.5">
                <span className="text-sm text-primary-800 font-medium">{um.naziv}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-primary-900">{um.kolicina} {um.jedinica}</span>
                  <button onClick={() => onRemove(um.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
      <p className="text-sm text-gray-400 max-w-md text-center px-6">{label}</p>
    </div>
  );
}
