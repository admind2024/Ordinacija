import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';

import { Phone, Search, Users, Clock } from 'lucide-react';
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

interface TodayTermin {
  appointment: Appointment;
  patient_id: string;
  ime: string;
  prezime: string;
  telefon?: string;
  time: string;
  services: string;
  total: number;
  status: string;
  done: boolean;
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

  // Danasnji raspored — sve appointment-e ovog doktora za danas sortirane po vremenu
  const todayAppointments = useMemo<TodayTermin[]>(() => {
    const result: TodayTermin[] = [];
    const doctorApts = appointments.filter((apt) => apt.doctor_id === loggedDoctor.id);

    for (const apt of doctorApts) {
      const aptDate = new Date(apt.pocetak);
      const aptDateStr = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, '0')}-${String(aptDate.getDate()).padStart(2, '0')}`;
      if (aptDateStr !== todayStr) continue;

      const p = apt.patient as any;
      if (!p || !apt.patient_id) continue;

      const services = (apt.services || []).map((s) => s.naziv).join(', ');
      const total = (apt.services || []).reduce((s, svc) => s + svc.ukupno, 0);
      const time = `${String(aptDate.getHours()).padStart(2, '0')}:${String(aptDate.getMinutes()).padStart(2, '0')}`;

      result.push({
        appointment: apt,
        patient_id: apt.patient_id,
        ime: p.ime || '',
        prezime: p.prezime || '',
        telefon: p.telefon,
        time,
        services,
        total,
        status: apt.status,
        done: completedExamAptIds.has(apt.id) || apt.status === 'zavrsen',
      });
    }

    return result.sort((a, b) => a.time.localeCompare(b.time));
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

      // Zakazi anketa SMS za 30 minuta — upisuje u queue, edge function salje
      if (patient?.telefon && patient.telefon !== '000' && patient.telefon.length >= 6) {
        (async () => {
          try {
            const { data: activeSurvey } = await supabase
              .from('surveys')
              .select('id')
              .eq('aktivan', true)
              .limit(1)
              .maybeSingle();

            if (activeSurvey) {
              const scheduledAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min od sad
              await supabase.from('survey_sms_queue').insert({
                patient_id: patient.id,
                appointment_id: selectedAppointment.id,
                survey_id: activeSurvey.id,
                patient_ime: `${patient.ime} ${patient.prezime}`,
                patient_telefon: patient.telefon,
                scheduled_at: scheduledAt,
                status: 'pending',
              });
            }
          } catch (e) {
            console.error('Anketa queue greska:', e);
          }
        })();
      }

      // Zatvori karton i vrati na listu pacijenata nakon kratke pauze
      setTimeout(() => {
        setSelectedPatientId(null);
        setSelectedAppointment(null);
        setCurrentExam(null);
        setPatient(null);
        setPatientExams([]);
        setPatientAppointments([]);
        setUsedMaterials([]);
      }, 800);
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
      {/* ====== PRETRAGA + KPI — na vrhu ====== */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pretrazi pacijente po imenu ili telefonu..."
            className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="text-center px-4 py-2 bg-primary-50 rounded-xl border border-primary-100">
            <p className="text-2xl font-bold text-primary-700">{todayCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-primary-500 font-medium">Danas</p>
          </div>
          <div className="text-center px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-2xl font-bold text-gray-700">{doctorPatients.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Ukupno</p>
          </div>
        </div>
      </div>

      {/* ====== RASPORED ZA DANAS — kompaktna tabela ====== */}
      {todayAppointments.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Raspored za danas ({todayAppointments.length})
            </h3>
          </div>
          <div className="bg-white border border-border rounded-xl divide-y divide-border overflow-hidden">
            {todayAppointments.map((t) => {
              const sc = {
                zavrsen:   { label: 'Završen',    cls: 'bg-emerald-100 text-emerald-800' },
                potvrdjen: { label: 'Potvrđen',   cls: 'bg-blue-50 text-blue-700' },
                zakazan:   { label: 'Zakazan',    cls: 'bg-sky-50 text-sky-700' },
                otkazan:   { label: 'Otkazan',    cls: 'bg-gray-100 text-gray-500' },
                nije_dosao:{ label: 'Nije došao', cls: 'bg-red-50 text-red-700' },
              }[t.status] || { label: t.status, cls: 'bg-gray-100 text-gray-600' };

              return (
                <button
                  key={t.appointment.id}
                  onClick={() => loadPatientData(t.patient_id, t.appointment)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors ${
                    t.done ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  {/* Vrijeme */}
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-base font-bold text-gray-900">{t.time}</p>
                  </div>
                  {/* Ime + usluga */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {t.ime} {t.prezime}
                    </p>
                    {t.services && (
                      <p className="text-[11px] text-gray-500 truncate">{t.services}</p>
                    )}
                  </div>
                  {/* Iznos */}
                  {t.total > 0 && (
                    <span className="text-xs font-bold text-gray-700 shrink-0">{t.total.toFixed(0)} €</span>
                  )}
                  {/* Status badge — prominentniji za završene */}
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold shrink-0 ${sc.cls}`}>
                    {sc.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ====== SVI PACIJENTI ====== */}
      <div className="mb-4 flex items-center gap-2">
        <Users size={16} className="text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Svi moji pacijenti ({filteredPatients.length})
        </h3>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="text-center py-16 text-gray-300 bg-white rounded-xl border border-border">
          <Users size={40} className="mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">Nema pacijenata</p>
          <p className="text-xs text-gray-300 mt-1">
            {searchQuery ? 'Probajte drugi pojam za pretragu' : 'Nema zakazanih termina'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {filteredPatients.map((dp) => {
            const hasToday = !!dp.todayAppointment;
            return (
              <button
                key={dp.patient_id}
                onClick={() => loadPatientData(dp.patient_id, dp.todayAppointment)}
                className="text-left px-4 py-3 bg-white rounded-lg border border-border hover:border-primary-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {dp.ime} {dp.prezime}
                  </p>
                  {hasToday && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold shrink-0 ml-2">
                      Danas
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  {dp.telefon ? (
                    <span className="flex items-center gap-1 text-gray-400 truncate">
                      <Phone size={10} /> {dp.telefon}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                  <span className="text-gray-400 shrink-0 ml-2">
                    {dp.appointmentCount} {dp.appointmentCount === 1 ? 'termin' : 'termina'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

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
