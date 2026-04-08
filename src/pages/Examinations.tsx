import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ClipboardList, User, Clock, Printer, FileText, Package, Plus, Trash2, CalendarDays, Phone, ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DoctorLogin from '../components/ui/DoctorLogin';
import ExaminationForm from '../components/examinations/ExaminationForm';
import ExaminationHistory from '../components/examinations/ExaminationHistory';
import { openPrintReport } from '../components/examinations/PrintReport';
import { useCalendar } from '../contexts/CalendarContext';
import { supabase } from '../lib/supabase';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from '../types';
import type { Appointment, Doctor, Examination, Patient, Establishment } from '../types';

interface UsedMaterial {
  id: string;
  material_id: string;
  naziv: string;
  kolicina: number;
  jedinica: string;
}

export default function Examinations() {
  return (
    <DoctorLogin>
      {(loggedDoctor) => <ExaminationsContent loggedDoctor={loggedDoctor} />}
    </DoctorLogin>
  );
}

function ExaminationsContent({ loggedDoctor }: { loggedDoctor: Doctor }) {
  const { appointments, doctors, materials } = useCalendar();

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientExams, setPatientExams] = useState<Examination[]>([]);
  const [currentExam, setCurrentExam] = useState<Examination | null>(null);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [saving, setSaving] = useState(false);
  const [usedMaterials, setUsedMaterials] = useState<UsedMaterial[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialQty, setMaterialQty] = useState('1');

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const [completedExamAptIds, setCompletedExamAptIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from('establishments').select('*').limit(1).single()
      .then(({ data }) => {
        if (data) setEstablishment(data as Establishment);
      });
    supabase.from('examinations')
      .select('appointment_id')
      .eq('status', 'zavrsen')
      .eq('datum', todayStr)
      .then(({ data }) => {
        const ids = new Set((data || []).map((e: any) => e.appointment_id).filter(Boolean));
        setCompletedExamAptIds(ids);
      });
  }, [todayStr]);

  const todaysAppointments = appointments
    .filter((apt) => {
      const d = new Date(apt.pocetak);
      const aptDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (aptDateStr !== todayStr) return false;
      if (apt.status === 'otkazan' || apt.status === 'nije_dosao') return false;
      if (apt.doctor_id !== loggedDoctor.id) return false;
      if (completedExamAptIds.has(apt.id)) return false;
      return true;
    })
    .sort((a, b) => a.pocetak.localeCompare(b.pocetak));

  const loadPatientData = useCallback(async (apt: Appointment) => {
    setSelectedAppointment(apt);
    setCurrentExam(null);

    const { data: patientData } = await supabase
      .from('patients')
      .select('*')
      .eq('id', apt.patient_id)
      .single();
    setPatient(patientData as Patient);

    const { data: exams } = await supabase
      .from('examinations')
      .select('*')
      .eq('patient_id', apt.patient_id)
      .order('datum', { ascending: false });
    setPatientExams((exams || []) as Examination[]);

    const existingExam = (exams || []).find((e: any) => e.appointment_id === apt.id);
    if (existingExam) {
      setCurrentExam(existingExam as Examination);
      const { data: usageData } = await supabase
        .from('material_usage')
        .select('*, material:materials(naziv, jedinica_mjere)')
        .eq('examination_id', existingExam.id);
      setUsedMaterials((usageData || []).map((u: any) => ({
        id: u.id,
        material_id: u.material_id,
        naziv: u.material?.naziv || '',
        kolicina: Number(u.kolicina),
        jedinica: u.material?.jedinica_mjere || 'kom',
      })));
    } else {
      setUsedMaterials([]);
    }
  }, []);

  async function handleSave(data: Partial<Examination>, finish: boolean) {
    if (!selectedAppointment || !patient) return;
    setSaving(true);

    const payload = {
      ...data,
      patient_id: patient.id,
      doctor_id: selectedAppointment.doctor_id,
      appointment_id: selectedAppointment.id,
      datum: todayStr,
      status: finish ? 'zavrsen' : 'draft',
      updated_at: new Date().toISOString(),
    };

    if (currentExam) {
      const { data: updated } = await supabase
        .from('examinations')
        .update(payload)
        .eq('id', currentExam.id)
        .select()
        .single();
      if (updated) {
        setCurrentExam(updated as Examination);
        setPatientExams((prev) =>
          prev.map((e) => (e.id === currentExam.id ? (updated as Examination) : e))
        );
      }
    } else {
      const { data: inserted } = await supabase
        .from('examinations')
        .insert(payload)
        .select()
        .single();
      if (inserted) {
        setCurrentExam(inserted as Examination);
        setPatientExams((prev) => [inserted as Examination, ...prev]);
      }
    }

    setSaving(false);
  }

  function handlePrint(exam: Examination) {
    if (!patient || !selectedDoctor || !establishment) return;
    openPrintReport({
      examination: exam,
      patient,
      doctor: selectedDoctor,
      establishment,
      services: aptServices.length > 0 ? aptServices : undefined,
    });
  }

  const selectedDoctor = selectedAppointment
    ? doctors.find((d) => d.id === selectedAppointment.doctor_id)
    : null;

  const aptServices = selectedAppointment?.services || [];
  const aptTotal = aptServices.reduce((sum, s) => sum + s.ukupno, 0);

  async function handleAddMaterial() {
    if (!selectedMaterialId || !currentExam || !selectedAppointment) return;
    const mat = materials.find((m) => m.id === selectedMaterialId);
    if (!mat) return;
    const qty = Number(materialQty) || 1;

    const { data } = await supabase.from('material_usage').insert({
      examination_id: currentExam.id,
      appointment_id: selectedAppointment.id,
      material_id: mat.id,
      kolicina: qty,
      ljekar_id: selectedAppointment.doctor_id,
      patient_id: patient?.id,
      datum: new Date().toISOString().slice(0, 10),
    }).select().single();

    if (data) {
      setUsedMaterials((prev) => [...prev, {
        id: data.id,
        material_id: mat.id,
        naziv: mat.naziv,
        kolicina: qty,
        jedinica: mat.jedinica_mjere,
      }]);
      setSelectedMaterialId('');
      setMaterialQty('1');
    }
  }

  async function handleRemoveMaterial(usageId: string) {
    await supabase.from('material_usage').delete().eq('id', usageId);
    setUsedMaterials((prev) => prev.filter((m) => m.id !== usageId));
  }

  const completedCount = completedExamAptIds.size;
  const totalForToday = todaysAppointments.length + completedCount;

  return (
    <div className="print:hidden">
      {/* Header sa statistikom */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Moji pregledi</h2>
          <div className="flex items-center gap-2 mt-1">
            <CalendarDays size={14} className="text-gray-400" />
            <span className="text-sm text-gray-500">{format(today, 'EEEE, dd.MM.yyyy.')}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 bg-primary-50 rounded-xl border border-primary-100">
            <p className="text-2xl font-bold text-primary-700">{todaysAppointments.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-primary-500 font-medium">Preostalo</p>
          </div>
          <div className="text-center px-4 py-2 bg-green-50 rounded-xl border border-green-100">
            <p className="text-2xl font-bold text-green-700">{completedCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-green-500 font-medium">Zavrseno</p>
          </div>
          {totalForToday > 0 && (
            <div className="text-center px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-2xl font-bold text-gray-700">{totalForToday}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Ukupno</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lijevi panel — lista termina */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="sticky top-4">
            <Card>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Pacijenti danas
              </h3>
              {todaysAppointments.length === 0 ? (
                <div className="text-center py-12 text-gray-300">
                  <ClipboardList size={40} className="mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-400">Nema preostalih pacijenata</p>
                  <p className="text-xs text-gray-300 mt-1">Svi pregledi su zavrseni</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todaysAppointments.map((apt) => {
                    const isSelected = selectedAppointment?.id === apt.id;
                    const aptPatient = apt.patient as any;
                    const d = new Date(apt.pocetak);
                    const aptTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    const svcNames = apt.services?.map((s) => s.naziv).join(', ') || '';
                    const svcTotal = apt.services?.reduce((sum, s) => sum + s.ukupno, 0) || 0;

                    return (
                      <button
                        key={apt.id}
                        onClick={() => loadPatientData(apt)}
                        className={`w-full text-left px-4 py-3.5 rounded-xl transition-all group
                          ${isSelected
                            ? 'bg-primary-50 ring-2 ring-primary-300 shadow-sm'
                            : 'bg-gray-50 hover:bg-gray-100 hover:shadow-sm'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className={`text-sm font-semibold ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                            {aptPatient ? `${aptPatient.ime} ${aptPatient.prezime}` : 'Pacijent'}
                          </p>
                          <ChevronRight size={14} className={`transition-transform ${isSelected ? 'text-primary-500 translate-x-0.5' : 'text-gray-300 group-hover:text-gray-400'}`} />
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={11} /> {aptTime}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: APPOINTMENT_STATUS_COLORS[apt.status] + '15',
                              color: APPOINTMENT_STATUS_COLORS[apt.status],
                            }}
                          >
                            {APPOINTMENT_STATUS_LABELS[apt.status]}
                          </span>
                        </div>
                        {svcNames && (
                          <p className="text-xs text-gray-400 truncate">{svcNames}</p>
                        )}
                        {svcTotal > 0 && (
                          <p className="text-xs font-semibold text-gray-500 mt-1">{svcTotal.toFixed(0)} EUR</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Desni panel — pregled */}
        <div className="lg:col-span-8 xl:col-span-9">
          {!selectedAppointment ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-center text-gray-300">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User size={36} className="text-gray-300" />
                </div>
                <p className="text-lg font-medium text-gray-400">Odaberite pacijenta</p>
                <p className="text-sm text-gray-300 mt-1">Izaberite pacijenta sa lijeve strane</p>
              </div>
            </div>
          ) : patient ? (
            <div className="space-y-5">
              {/* Patient info header */}
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-700">
                        {patient.ime.charAt(0)}{patient.prezime.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{patient.ime} {patient.prezime}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {patient.datum_rodjenja && (
                          <span className="text-xs text-gray-400">
                            {format(parseISO(patient.datum_rodjenja), 'dd.MM.yyyy.')}
                          </span>
                        )}
                        {patient.telefon && (
                          <a href={`tel:${patient.telefon}`} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
                            <Phone size={11} /> {patient.telefon}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: APPOINTMENT_STATUS_COLORS[selectedAppointment.status] + '15',
                        color: APPOINTMENT_STATUS_COLORS[selectedAppointment.status],
                      }}
                    >
                      {APPOINTMENT_STATUS_LABELS[selectedAppointment.status]}
                    </span>
                    {currentExam && currentExam.status === 'zavrsen' && (
                      <Button variant="secondary" size="sm" onClick={() => handlePrint(currentExam)}>
                        <Printer size={14} /> Stampaj
                      </Button>
                    )}
                  </div>
                </div>

                {/* Usluge */}
                {aptServices.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {aptServices.map((s, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                            {s.naziv}
                          </span>
                        ))}
                      </div>
                      <span className="text-sm font-bold text-gray-700">{aptTotal.toFixed(2)} EUR</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Formular */}
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={18} className="text-primary-600" />
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    {currentExam ? (currentExam.status === 'zavrsen' ? 'Zavrsen pregled' : 'Nastavi pregled') : 'Novi pregled'}
                  </h3>
                  {currentExam?.status === 'zavrsen' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Zavrsen</span>
                  )}
                </div>
                <ExaminationForm
                  key={currentExam?.id || selectedAppointment.id}
                  initialData={currentExam || undefined}
                  onSave={handleSave}
                  saving={saving}
                  appointmentServices={aptServices}
                  appointmentNapomena={selectedAppointment.napomena ?? undefined}
                />
              </div>

              {/* Materijali */}
              {currentExam && (
                <div className="bg-white rounded-xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Package size={18} className="text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Utroseni materijali</h3>
                  </div>

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
                    <Button size="sm" onClick={handleAddMaterial} disabled={!selectedMaterialId}>
                      <Plus size={14} /> Dodaj
                    </Button>
                  </div>

                  {usedMaterials.length === 0 ? (
                    <p className="text-sm text-gray-300 text-center py-4">Nema unesenih materijala</p>
                  ) : (
                    <div className="space-y-1.5">
                      {usedMaterials.map((um) => (
                        <div key={um.id} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2.5">
                          <span className="text-sm text-purple-800 font-medium">{um.naziv}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-purple-900">{um.kolicina} {um.jedinica}</span>
                            <button onClick={() => handleRemoveMaterial(um.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Istorija */}
              {patientExams.filter((e) => e.id !== currentExam?.id).length > 0 && (
                <div className="bg-white rounded-xl border border-border p-5">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Istorija pregleda ({patientExams.filter((e) => e.id !== currentExam?.id).length})
                  </h3>
                  <ExaminationHistory
                    examinations={patientExams.filter((e) => e.id !== currentExam?.id)}
                    doctors={doctors}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
