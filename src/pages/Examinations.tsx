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
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from '../types';
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

  // Danasnji termini — svi osim otkazanih
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todaysAppointments = appointments
    .filter((apt) => {
      const d = new Date(apt.pocetak);
      const aptDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return aptDateStr === todayStr && apt.status !== 'otkazan' && apt.status !== 'nije_dosao';
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
    setPrintExam(exam);
    setTimeout(() => window.print(), 200);
  }

  const selectedDoctor = selectedAppointment
    ? doctors.find((d) => d.id === selectedAppointment.doctor_id)
    : null;

  const aptServices = selectedAppointment?.services || [];
  const aptTotal = aptServices.reduce((sum, s) => sum + s.ukupno, 0);

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
