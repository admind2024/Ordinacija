import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import { CalendarDays, Phone, ChevronRight, Search, Users } from 'lucide-react';
import Card from '../components/ui/Card';
import DoctorLogin from '../components/ui/DoctorLogin';
import PatientKarton from '../components/examinations/PatientKarton';
import { openPrintReport } from '../components/examinations/PrintReport';
import { useCalendar } from '../contexts/CalendarContext';
import { supabase } from '../lib/supabase';
import type { Appointment, Doctor, Examination, Patient, Establishment } from '../types';

interface UsedMaterial {
  id: string;
  material_id: string;
  naziv: string;
  kolicina: number;
  jedinica: string;
}

interface DoctorPatient {
  patient_id: string;
  ime: string;
  prezime: string;
  telefon?: string;
  lastAppointment: string;
  todayAppointment?: Appointment;
  appointmentCount: number;
}

export default function Examinations() {
  return (
    <DoctorLogin>
      {(loggedDoctor) => <ExaminationsContent loggedDoctor={loggedDoctor} />}
    </DoctorLogin>
  );
}

function ExaminationsContent({ loggedDoctor }: { loggedDoctor: Doctor }) {
  const { appointments, doctors, materials, updateAppointmentStatus } = useCalendar();

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientExams, setPatientExams] = useState<Examination[]>([]);
  const [currentExam, setCurrentExam] = useState<Examination | null>(null);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [saving, setSaving] = useState(false);
  const [usedMaterials, setUsedMaterials] = useState<UsedMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);

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

  // Izvuci sve pacijente ovog doktora iz appointmenta
  const doctorPatients = useMemo(() => {
    const patientMap = new Map<string, DoctorPatient>();

    const doctorApts = appointments.filter((apt) => apt.doctor_id === loggedDoctor.id && apt.status !== 'otkazan');

    for (const apt of doctorApts) {
      const p = apt.patient as any;
      if (!p || !apt.patient_id) continue;

      const existing = patientMap.get(apt.patient_id);
      const aptDate = new Date(apt.pocetak);
      const aptDateStr = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, '0')}-${String(aptDate.getDate()).padStart(2, '0')}`;
      const isToday = aptDateStr === todayStr && apt.status !== 'nije_dosao' && !completedExamAptIds.has(apt.id);

      if (existing) {
        existing.appointmentCount++;
        if (apt.pocetak > existing.lastAppointment) {
          existing.lastAppointment = apt.pocetak;
        }
        if (isToday && !existing.todayAppointment) {
          existing.todayAppointment = apt;
        }
      } else {
        patientMap.set(apt.patient_id, {
          patient_id: apt.patient_id,
          ime: p.ime || '',
          prezime: p.prezime || '',
          telefon: p.telefon,
          lastAppointment: apt.pocetak,
          todayAppointment: isToday ? apt : undefined,
          appointmentCount: 1,
        });
      }
    }

    return Array.from(patientMap.values());
  }, [appointments, loggedDoctor.id, todayStr, completedExamAptIds]);

  // Filter i sortiranje
  const filteredPatients = useMemo(() => {
    let list = doctorPatients;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) =>
        `${p.ime} ${p.prezime}`.toLowerCase().includes(q) ||
        (p.telefon && p.telefon.includes(q))
      );
    }

    // Danas na vrhu, onda po zadnjem terminu
    return list.sort((a, b) => {
      if (a.todayAppointment && !b.todayAppointment) return -1;
      if (!a.todayAppointment && b.todayAppointment) return 1;
      return b.lastAppointment.localeCompare(a.lastAppointment);
    });
  }, [doctorPatients, searchQuery]);

  const todayCount = doctorPatients.filter((p) => p.todayAppointment).length;

  const loadPatientData = useCallback(async (patientId: string, apt?: Appointment) => {
    setSelectedPatientId(patientId);
    setSelectedAppointment(apt || null);
    setCurrentExam(null);
    setUsedMaterials([]);

    const { data: patientData } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
    setPatient(patientData as Patient);

    const { data: exams } = await supabase
      .from('examinations')
      .select('*')
      .eq('patient_id', patientId)
      .order('datum', { ascending: false });
    setPatientExams((exams || []) as Examination[]);

    // Ucitaj sve termine ovog pacijenta kod ovog doktora
    const aptList = appointments.filter(
      (a) => a.patient_id === patientId && a.doctor_id === loggedDoctor.id && a.status !== 'otkazan'
    ).sort((a, b) => b.pocetak.localeCompare(a.pocetak));
    setPatientAppointments(aptList);

    // Ako ima danas termin, ucitaj exam za njega
    if (apt) {
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
      }
    }
  }, [appointments, loggedDoctor.id]);

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

    // Kad se pregled zavrsi, postavi appointment status na 'zavrsen'
    if (finish && selectedAppointment) {
      updateAppointmentStatus(selectedAppointment.id, 'zavrsen');
    }

    setSaving(false);
  }

  function handlePrint(exam: Examination) {
    if (!patient || !establishment) return;
    const doc = doctors.find((d) => d.id === exam.doctor_id);
    if (!doc) return;
    openPrintReport({
      examination: exam,
      patient,
      doctor: doc,
      establishment,
      services: selectedAppointment?.services?.length ? selectedAppointment.services : undefined,
    });
  }

  async function addMaterialFromKarton(materialId: string, kolicina: number) {
    if (!currentExam || !selectedAppointment) return;
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return;

    const { data } = await supabase.from('material_usage').insert({
      examination_id: currentExam.id,
      appointment_id: selectedAppointment.id,
      material_id: mat.id,
      kolicina,
      ljekar_id: selectedAppointment.doctor_id,
      patient_id: patient?.id,
      datum: new Date().toISOString().slice(0, 10),
    }).select().single();

    if (data) {
      setUsedMaterials((prev) => [...prev, {
        id: data.id,
        material_id: mat.id,
        naziv: mat.naziv,
        kolicina,
        jedinica: mat.jedinica_mjere,
      }]);
    }
  }

  async function handleRemoveMaterial(usageId: string) {
    await supabase.from('material_usage').delete().eq('id', usageId);
    setUsedMaterials((prev) => prev.filter((m) => m.id !== usageId));
  }

  function selectAppointmentForExam(apt: Appointment) {
    setSelectedAppointment(apt);
    setCurrentExam(null);
    setUsedMaterials([]);
    const existingExam = patientExams.find((e) => e.appointment_id === apt.id);
    if (existingExam) {
      setCurrentExam(existingExam);
      supabase
        .from('material_usage')
        .select('*, material:materials(naziv, jedinica_mjere)')
        .eq('examination_id', existingExam.id)
        .then(({ data: usageData }) => {
          setUsedMaterials((usageData || []).map((u: any) => ({
            id: u.id,
            material_id: u.material_id,
            naziv: u.material?.naziv || '',
            kolicina: Number(u.kolicina),
            jedinica: u.material?.jedinica_mjere || 'kom',
          })));
        });
    }
  }

  return (
    <div className="print:hidden">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Moji pregledi</h2>
          <div className="flex items-center gap-2 mt-1">
            <CalendarDays size={14} className="text-gray-400" />
            <span className="text-sm text-gray-500">{format(today, 'EEEE, dd.MM.yyyy.', { locale: sr })}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 bg-primary-50 rounded-xl border border-primary-100">
            <p className="text-2xl font-bold text-primary-700">{todayCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-primary-500 font-medium">Danas</p>
          </div>
          <div className="text-center px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-2xl font-bold text-gray-700">{doctorPatients.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Ukupno pacijenata</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lijevi panel — lista pacijenata (zauzima vise sirine sada kada je desni panel zamijenjen kartonom) */}
        <div className="lg:col-span-12">
          <div className="sticky top-4 space-y-3">
            {/* Pretraga */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretrazi pacijente..."
                className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>

            <Card>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Moji pacijenti ({filteredPatients.length})
              </h3>
              {filteredPatients.length === 0 ? (
                <div className="text-center py-12 text-gray-300">
                  <Users size={40} className="mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-400">Nema pacijenata</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {searchQuery ? 'Probajte drugi pojam za pretragu' : 'Nema zakazanih termina'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {filteredPatients.map((dp) => {
                    const isSelected = selectedPatientId === dp.patient_id;
                    const hasToday = !!dp.todayAppointment;

                    return (
                      <button
                        key={dp.patient_id}
                        onClick={() => loadPatientData(dp.patient_id, dp.todayAppointment)}
                        className={`w-full text-left px-4 py-3.5 rounded-xl transition-all group
                          ${isSelected
                            ? 'bg-primary-50 ring-2 ring-primary-300 shadow-sm'
                            : 'bg-gray-50 hover:bg-gray-100 hover:shadow-sm'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm font-semibold ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                            {dp.ime} {dp.prezime}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {hasToday && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                                Danas
                              </span>
                            )}
                            <ChevronRight size={14} className={`transition-transform ${isSelected ? 'text-primary-500 translate-x-0.5' : 'text-gray-300 group-hover:text-gray-400'}`} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {dp.telefon && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Phone size={10} /> {dp.telefon}
                            </span>
                          )}
                          <span className="text-xs text-gray-300">
                            {dp.appointmentCount} {dp.appointmentCount === 1 ? 'termin' : 'termina'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>

      </div>

      {/* ================= FULL-SCREEN KARTON ================= */}
      {/* Prikazuje se preko cijele aplikacije (uklj. lijevi meni) kad je pacijent odabran. */}
      {selectedPatientId && patient && (
        <PatientKarton
          patient={patient}
          loggedDoctor={loggedDoctor}
          allDoctors={doctors}
          materials={materials}
          appointments={patientAppointments}
          exams={patientExams}
          selectedAppointment={selectedAppointment}
          currentExam={currentExam}
          usedMaterials={usedMaterials}
          saving={saving}
          onBack={() => {
            setSelectedPatientId(null);
            setSelectedAppointment(null);
            setCurrentExam(null);
            setPatient(null);
            setPatientExams([]);
            setPatientAppointments([]);
            setUsedMaterials([]);
          }}
          onSelectAppointment={selectAppointmentForExam}
          onSaveExam={handleSave}
          onPrintExam={handlePrint}
          onAddMaterial={addMaterialFromKarton}
          onRemoveMaterial={handleRemoveMaterial}
        />
      )}
    </div>
  );
}
