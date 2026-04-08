import { useState, useEffect, useCallback, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ClipboardList, User, Clock, Printer, FileText } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ExaminationForm from '../components/examinations/ExaminationForm';
import ExaminationHistory from '../components/examinations/ExaminationHistory';
import PrintReport from '../components/examinations/PrintReport';
import { useCalendar } from '../contexts/CalendarContext';
import { supabase } from '../lib/supabase';
import type { Appointment, Examination, Patient, Establishment } from '../types';

export default function Examinations() {
  const { appointments, doctors } = useCalendar();

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientExams, setPatientExams] = useState<Examination[]>([]);
  const [currentExam, setCurrentExam] = useState<Examination | null>(null);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [saving, setSaving] = useState(false);
  const [printExam, setPrintExam] = useState<Examination | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Danasnji termini sa statusom stigao, u_toku ili zavrsen
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todaysAppointments = appointments
    .filter((apt) => {
      const aptDate = apt.pocetak.slice(0, 10);
      return aptDate === todayStr && ['stigao', 'u_toku', 'zavrsen'].includes(apt.status);
    })
    .sort((a, b) => a.pocetak.localeCompare(b.pocetak));

  // Fetch establishment
  useEffect(() => {
    supabase.from('establishments').select('*').limit(1).single()
      .then(({ data }) => {
        if (data) setEstablishment(data as Establishment);
      });
  }, []);

  // Fetch patient data kad se odabere termin
  const loadPatientData = useCallback(async (apt: Appointment) => {
    setSelectedAppointment(apt);
    setCurrentExam(null);

    // Dohvati pacijenta
    const { data: patientData } = await supabase
      .from('patients')
      .select('*')
      .eq('id', apt.patient_id)
      .single();
    setPatient(patientData as Patient);

    // Dohvati prethodne preglede
    const { data: exams } = await supabase
      .from('examinations')
      .select('*')
      .eq('patient_id', apt.patient_id)
      .order('datum', { ascending: false });
    setPatientExams((exams || []) as Examination[]);

    // Provjeri da li vec postoji pregled za ovaj termin
    const existingExam = (exams || []).find((e: any) => e.appointment_id === apt.id);
    if (existingExam) {
      setCurrentExam(existingExam as Examination);
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
      // Update
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
      // Insert
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
    setPrintExam(exam);
    setTimeout(() => window.print(), 200);
  }

  const selectedDoctor = selectedAppointment
    ? doctors.find((d) => d.id === selectedAppointment.doctor_id)
    : null;

  return (
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
              <div className="space-y-1">
                {todaysAppointments.map((apt) => {
                  const isSelected = selectedAppointment?.id === apt.id;
                  const aptPatient = apt.patient as any;
                  const aptTime = format(parseISO(apt.pocetak), 'HH:mm');
                  const doctor = doctors.find((d) => d.id === apt.doctor_id);
                  const statusBg = apt.status === 'zavrsen'
                    ? 'border-l-green-500'
                    : apt.status === 'u_toku'
                      ? 'border-l-orange-500'
                      : 'border-l-purple-500';

                  return (
                    <button
                      key={apt.id}
                      onClick={() => loadPatientData(apt)}
                      className={`w-full text-left px-3 py-3 rounded-lg border-l-4 transition-colors ${statusBg}
                        ${isSelected
                          ? 'bg-primary-50 border border-primary-200'
                          : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {aptPatient ? `${aptPatient.ime} ${aptPatient.prezime}` : 'Pacijent'}
                        </p>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} /> {aptTime}
                        </span>
                      </div>
                      {doctor && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {doctor.titula || 'Dr'} {doctor.ime} {doctor.prezime}
                        </p>
                      )}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <User size={24} className="text-primary-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{patient.ime} {patient.prezime}</h3>
                      <div className="flex gap-4 text-sm text-gray-500">
                        {patient.datum_rodjenja && (
                          <span>Datum rodjenja: {format(parseISO(patient.datum_rodjenja), 'dd.MM.yyyy.')}</span>
                        )}
                        {patient.telefon && <span>Tel: {patient.telefon}</span>}
                      </div>
                    </div>
                  </div>
                  {currentExam && currentExam.status === 'zavrsen' && (
                    <Button variant="secondary" onClick={() => handlePrint(currentExam)}>
                      <Printer size={16} /> Stampaj nalaz
                    </Button>
                  )}
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
                />
              </Card>

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

      {/* Hidden print component */}
      {printExam && patient && selectedDoctor && (
        <PrintReport
          ref={printRef}
          examination={printExam}
          patient={patient}
          doctor={selectedDoctor}
          establishment={establishment}
        />
      )}
    </div>
  );
}
