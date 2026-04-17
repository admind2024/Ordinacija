import { useMemo, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import {
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Calendar,
  Tag, Clock, User, FileText, Wallet, CreditCard, Stethoscope,
  Info, AlertCircle,
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
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

type TabKey = 'info' | 'istorija' | 'finansije' | 'dugovanja' | 'napomene';

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

export default function PatientCard({ patient, appointments, onBack, onEdit, onDelete }: PatientCardProps) {
  const { doctors, rooms } = useCalendar();
  const { debtsByPatient, paidByPatient } = usePatients();
  const [tab, setTab] = useState<TabKey>('info');
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);

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
  const prvaPosjeta = patientAppointments.length > 0
    ? format(parseISO(patientAppointments[patientAppointments.length - 1].pocetak), 'dd.MM.yyyy.')
    : '—';

  const ukupnoDug = debtsByPatient.get(patient.id) || 0;
  const ukupnoPlaceno = paidByPatient.get(patient.id) || 0;

  const godine = patient.datum_rodjenja
    ? Math.floor((Date.now() - new Date(patient.datum_rodjenja).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  // Fetch dugovanja i examinations kad se tab otvori
  useEffect(() => {
    if (tab === 'dugovanja' && debts.length === 0) {
      supabase
        .from('dugovanja')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setDebts((data || []) as DebtRow[]));
    }
    if (tab === 'istorija' && exams.length === 0) {
      supabase
        .from('examinations')
        .select('id, datum, doctor_id, dijagnoza, terapija, appointment_id')
        .eq('patient_id', patient.id)
        .order('datum', { ascending: false })
        .then(({ data }) => setExams((data || []) as ExamRow[]));
    }
  }, [tab, patient.id, debts.length, exams.length]);

  const tagColors: Record<string, string> = {
    VIP: 'bg-amber-100 text-amber-700 border-amber-200',
    Redovan: 'bg-green-100 text-green-700 border-green-200',
    Djeca: 'bg-blue-100 text-blue-700 border-blue-200',
    Problematican: 'bg-red-100 text-red-700 border-red-200',
  };

  const initials = `${patient.ime?.[0] || ''}${patient.prezime?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-4 md:p-6 text-white relative overflow-hidden">
        {/* Top bar: back + actions u jednom redu */}
        <div className="flex items-center justify-between mb-3 md:mb-0">
          <button onClick={onBack} className="p-2 -ml-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex gap-2 md:absolute md:top-4 md:right-4">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Edit size={14} /> <span className="hidden sm:inline">Izmijeni</span>
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              <Trash2 size={14} /> <span className="hidden sm:inline">Obrisi</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5 md:mt-8">
          <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-white/15 backdrop-blur border-2 border-white/30 flex items-center justify-center text-xl md:text-3xl font-bold shrink-0">
            {initials || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-3xl font-bold truncate">{patient.ime} {patient.prezime}</h2>
            <div className="flex items-center gap-2 md:gap-3 mt-1 md:mt-2 flex-wrap text-xs md:text-sm text-white/80">
              {godine !== null && <span>{godine} god.</span>}
              {patient.pol && (
                <>
                  <span className="text-white/30">·</span>
                  <span>{patient.pol === 'muski' ? 'Muski' : patient.pol === 'zenski' ? 'Zenski' : 'Ostalo'}</span>
                </>
              )}
              {patient.telefon && (
                <>
                  <span className="text-white/30">·</span>
                  <a href={`tel:${patient.telefon}`} className="flex items-center gap-1 hover:text-white">
                    <Phone size={12} /> {patient.telefon}
                  </a>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {patient.tagovi.map((tag) => (
                <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-medium border bg-white/90 ${tagColors[tag]?.replace('bg-', 'text-').split(' ')[0] || 'text-gray-700'}`}>
                  {tag}
                </span>
              ))}
              {patient.popust > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/90 text-green-700">
                  Popust {patient.popust}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Calendar size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Posjeta</p>
              <p className="text-xl font-bold text-gray-900">{brojPosjeta}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Zakazano</p>
              <p className="text-xl font-bold text-gray-900">{brojZakazanih}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <FileText size={18} className="text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Ukupno usluga</p>
              <p className="text-xl font-bold text-gray-900">{totalUsluga.toFixed(0)} €</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CreditCard size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Uplaceno</p>
              <p className="text-xl font-bold text-green-700">{ukupnoPlaceno.toFixed(0)} €</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className={`flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-lg ${ukupnoDug > 0 ? 'bg-red-50' : 'bg-gray-50'} flex items-center justify-center`}>
              <Wallet size={18} className={ukupnoDug > 0 ? 'text-red-600' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Dugovanje</p>
              <p className={`text-xl font-bold ${ukupnoDug > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                {ukupnoDug.toFixed(0)} €
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabovi — horizontal scroll na mobilnom */}
      <div className="-mx-4 md:mx-0 px-4 md:px-0 overflow-x-auto">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-max md:w-fit">
          {[
            { key: 'info' as const,       label: 'Osnovno',   icon: Info },
            { key: 'istorija' as const,   label: 'Istorija',  icon: Stethoscope },
            { key: 'finansije' as const,  label: 'Finansije', icon: CreditCard },
            { key: 'dugovanja' as const,  label: 'Dugovanja', icon: Wallet },
            { key: 'napomene' as const,   label: 'Napomene',  icon: FileText },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Osnovno */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Licni podaci</h3>
            <div className="space-y-2 text-sm">
              {patient.datum_rodjenja ? (
                <InfoRow icon={<Calendar size={14} />} label="Datum rodjenja"
                  value={`${new Date(patient.datum_rodjenja).toLocaleDateString('sr-Latn-ME')}${godine !== null ? ` (${godine} god.)` : ''}`} />
              ) : null}
              {patient.pol && (
                <InfoRow icon={<User size={14} />} label="Pol"
                  value={patient.pol === 'muski' ? 'Muski' : patient.pol === 'zenski' ? 'Zenski' : 'Ostalo'} />
              )}
              {patient.ime_roditelja && (
                <InfoRow icon={<User size={14} />} label="Ime roditelja" value={patient.ime_roditelja} />
              )}
              {patient.jmbg && (
                <InfoRow icon={<Tag size={14} />} label="JMBG" value={patient.jmbg} />
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Kontakt</h3>
            <div className="space-y-2 text-sm">
              <a href={`tel:${patient.telefon}`} className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
                <Phone size={14} /> {patient.telefon}
              </a>
              {patient.email && (
                <a href={`mailto:${patient.email}`} className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
                  <Mail size={14} /> {patient.email}
                </a>
              )}
              {(patient.adresa || patient.grad) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={14} className="text-gray-400" />
                  {patient.adresa ? `${patient.adresa}, ` : ''}{patient.grad || ''}
                </div>
              )}
            </div>
          </Card>

          {(patient.izvor_preporuke || patient.osiguranje) && (
            <Card>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dodatno</h3>
              <div className="space-y-2 text-sm">
                {patient.izvor_preporuke && (
                  <InfoRow icon={<Tag size={14} />} label="Izvor preporuke"
                    value={patient.izvor_preporuke + (patient.detalji_preporuke ? ` — ${patient.detalji_preporuke}` : '')} />
                )}
                {patient.osiguranje && (
                  <InfoRow icon={<FileText size={14} />} label="Osiguranje" value={patient.osiguranje} />
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Istorija */}
      {tab === 'istorija' && (
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-gray-700">Istorija termina i pregleda</h3>
            <p className="text-xs text-gray-400 mt-0.5">{patientAppointments.length} termina ukupno</p>
          </div>
          {patientAppointments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar size={40} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nema termina za ovog pacijenta</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {patientAppointments.map((apt) => {
                const doctor = doctors.find((d) => d.id === apt.doctor_id);
                const room = rooms.find((r) => r.id === apt.room_id);
                const exam = exams.find((e) => e.appointment_id === apt.id);
                const total = apt.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0;
                return (
                  <div key={apt.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">
                          {format(parseISO(apt.pocetak), 'EEEE, dd.MM.yyyy. HH:mm', { locale: sr })}
                        </span>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: APPOINTMENT_STATUS_COLORS[apt.status] + '20',
                          color: APPOINTMENT_STATUS_COLORS[apt.status],
                        }}
                      >
                        {APPOINTMENT_STATUS_LABELS[apt.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                      {doctor && (
                        <span className="flex items-center gap-1">
                          <Stethoscope size={11} />
                          {doctor.titula} {doctor.ime} {doctor.prezime}
                        </span>
                      )}
                      {room && <span>· {room.naziv}</span>}
                      {total > 0 && (
                        <span className="ml-auto font-semibold text-gray-700">{total.toFixed(2)} €</span>
                      )}
                    </div>
                    {apt.services && apt.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {apt.services.map((s, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                            {s.naziv}
                          </span>
                        ))}
                      </div>
                    )}
                    {exam && (
                      <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-100 text-xs space-y-1">
                        {exam.dijagnoza && (
                          <p><strong className="text-gray-700">Dijagnoza:</strong> <span className="text-gray-600">{exam.dijagnoza}</span></p>
                        )}
                        {exam.terapija && (
                          <p><strong className="text-gray-700">Terapija:</strong> <span className="text-gray-600">{exam.terapija}</span></p>
                        )}
                      </div>
                    )}
                    {apt.napomena && (
                      <p className="text-xs text-gray-500 mt-1 italic">Napomena: {apt.napomena}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Finansije */}
      {tab === 'finansije' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sumarni pregled</h3>
            <div className="space-y-3">
              <FinRow label="Ukupna vrijednost usluga" value={totalUsluga} />
              <FinRow label="Ukupno uplaceno" value={ukupnoPlaceno} colorPositive />
              <FinRow label="Prvobitni saldo" value={patient.pocetno_stanje} />
              <FinRow label="Aktivno dugovanje" value={ukupnoDug} colorNegative />
              {patient.popust > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-gray-600">Stalni popust</span>
                  <span className="text-sm font-semibold text-green-700">{patient.popust}%</span>
                </div>
              )}
            </div>
          </Card>
          <Card>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Prva posjeta</h3>
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-gray-700">{prvaPosjeta}</span>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Za detaljan pregled pojedinacnih uplata i dugovanja, otidji na tab <strong>Dugovanja</strong> ili u stranicu <strong>Dugovanja</strong> u meniju.
            </p>
          </Card>
        </div>
      )}

      {/* Tab: Dugovanja */}
      {tab === 'dugovanja' && (
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Dugovanja pacijenta</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Ukupno aktivno: <strong className="text-red-700">{ukupnoDug.toFixed(2)} €</strong>
              </p>
            </div>
          </div>
          {debts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Wallet size={40} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nema zabilježenih dugovanja</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {debts.map((d) => {
                const isActive = d.status === 'aktivan';
                return (
                  <div key={d.id} className="px-6 py-3 flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500' : 'bg-green-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{d.opis || '—'}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(d.datum_nastanka).toLocaleDateString('sr-Latn-ME')}
                        {d.napomena && ` · ${d.napomena}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isActive ? 'text-red-700' : 'text-gray-500'}`}>
                        {Number(d.preostalo).toFixed(2)} €
                      </p>
                      <p className="text-[10px] text-gray-400">od {Number(d.iznos).toFixed(2)} €</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {isActive ? 'Aktivan' : 'Placen'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Napomene */}
      {tab === 'napomene' && (
        <Card>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Napomene</h3>
          {patient.napomena ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{patient.napomena}</p>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <AlertCircle size={14} />
              Nema napomena za ovog pacijenta
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-gray-600">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

function FinRow({ label, value, colorPositive, colorNegative }: { label: string; value: number; colorPositive?: boolean; colorNegative?: boolean }) {
  const color = colorPositive ? 'text-green-700' : colorNegative && value > 0 ? 'text-red-700' : 'text-gray-900';
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value.toFixed(2)} €</span>
    </div>
  );
}
