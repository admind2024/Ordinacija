import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ClipboardList, User, Clock, Printer, FileText, Package, Plus, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DoctorLogin from '../components/ui/DoctorLogin';
import ExaminationForm from '../components/examinations/ExaminationForm';
import ExaminationHistory from '../components/examinations/ExaminationHistory';
import { openPrintReport } from '../components/examinations/PrintReport';
import { useCalendar } from '../contexts/CalendarContext';
import { supabase } from '../lib/supabase';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from '../types';
import type { Appointment, Examination, Patient, Establishment } from '../types';

interface UsedMaterial {
  id: string;
  material_id: string;
  naziv: string;
  kolicina: number;
  jedinica: string;
}

export default function Examinations() {
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

  // Danasnji termini — sakrij one koji vec imaju zavrsen pregled
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const [completedExamAptIds, setCompletedExamAptIds] = useState<Set<string>>(new Set());

  // Fetch establishment + zavrseni pregledi
  useEffect(() => {
    supabase.from('establishments').select('*').limit(1).single()
      .then(({ data }) => {
        if (data) setEstablishment(data as Establishment);
      });
    // Dohvati appointment_id-jeve za zavrsene preglede danas
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
      // Sakrij termine koji vec imaju zavrsen pregled
      if (completedExamAptIds.has(apt.id)) return false;
      return true;
    })
    .sort((a, b) => a.pocetak.localeCompare(b.pocetak));

  // Fetch patient data kad se odabere termin
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
      // Ucitaj utrosene materijale za ovaj pregled
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

  return (
    <DoctorLogin>
    <div className="print:hidden">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Pregled pacijenata</h2>
        <p className="text-sm text-gray-500 mt-1">Unos nalaza, terapije i preporuka</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lijevi panel — danasnji termini */}
        <div className="lg:col-span-4 xl:col-span-3">
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Danas — {format(today, 'dd.MM.yyyy.')}
            </h3>
            {todaysAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ClipboardList size={32} className="mx-auto mb-2" />
                <p className="text-sm">Nema pacijenata za danas</p>
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
                      className={`w-full text-left px-3 py-3 rounded-lg border-l-4 transition-colors
                        ${isSelected
                          ? 'bg-primary-50 border-l-primary-500 border border-primary-200'
                          : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                        }`}
                      style={{ borderLeftColor: isSelected ? undefined : APPOINTMENT_STATUS_COLORS[apt.status] }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {aptPatient ? `${aptPatient.ime} ${aptPatient.prezime}` : 'Pacijent'}
                        </p>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} /> {aptTime}
                        </span>
                      </div>
                      {svcNames && (
                        <p className="text-xs text-gray-500 truncate">{svcNames}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: APPOINTMENT_STATUS_COLORS[apt.status] + '20',
                            color: APPOINTMENT_STATUS_COLORS[apt.status],
                          }}
                        >
                          {APPOINTMENT_STATUS_LABELS[apt.status]}
                        </span>
                        {svcTotal > 0 && (
                          <span className="text-xs font-medium text-gray-600">{svcTotal.toFixed(0)} EUR</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Desni panel — detalji i formular */}
        <div className="lg:col-span-8 xl:col-span-9">
          {!selectedAppointment ? (
            <Card>
              <div className="text-center py-16 text-gray-400">
                <User size={48} className="mx-auto mb-4" />
                <p className="text-lg font-medium">Odaberite pacijenta</p>
                <p className="text-sm mt-1">Kliknite na pacijenta sa lijeve strane za unos pregleda</p>
              </div>
            </Card>
          ) : patient ? (
            <div className="space-y-6">
              {/* Patient header */}
              <Card>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <User size={24} className="text-primary-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{patient.ime} {patient.prezime}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                        {patient.datum_rodjenja && (
                          <span>Rodjen/a: {format(parseISO(patient.datum_rodjenja), 'dd.MM.yyyy.')}</span>
                        )}
                        {patient.telefon && <span>Tel: {patient.telefon}</span>}
                      </div>
                      {aptServices.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {aptServices.map((s) => s.naziv).join(', ')} — <strong>{aptTotal.toFixed(2)} EUR</strong>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: APPOINTMENT_STATUS_COLORS[selectedAppointment.status] + '20',
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
              </Card>

              {/* Formular za pregled */}
              <Card>
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
              </Card>

              {/* Utroseni materijali */}
              {currentExam && (
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Package size={18} className="text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Utroseni materijali</h3>
                  </div>

                  {/* Dodaj materijal */}
                  <div className="flex gap-2 mb-3">
                    <select
                      value={selectedMaterialId}
                      onChange={(e) => setSelectedMaterialId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      className="w-20 px-3 py-2 border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Kol."
                    />
                    <Button size="sm" onClick={handleAddMaterial} disabled={!selectedMaterialId}>
                      <Plus size={14} /> Dodaj
                    </Button>
                  </div>

                  {/* Lista materijala */}
                  {usedMaterials.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">Nema unesenih materijala</p>
                  ) : (
                    <div className="space-y-1">
                      {usedMaterials.map((um) => (
                        <div key={um.id} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-purple-800">{um.naziv}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-purple-900">{um.kolicina} {um.jedinica}</span>
                            <button onClick={() => handleRemoveMaterial(um.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Istorija pregleda */}
              {patientExams.filter((e) => e.id !== currentExam?.id).length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Istorija pregleda ({patientExams.filter((e) => e.id !== currentExam?.id).length})
                  </h3>
                  <ExaminationHistory
                    examinations={patientExams.filter((e) => e.id !== currentExam?.id)}
                    doctors={doctors}
                  />
                </Card>
              )}
            </div>
          ) : null}
        </div>
      </div>

    </div>
    </DoctorLogin>
  );
}
