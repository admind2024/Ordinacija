import { useState, useMemo } from 'react';
import { format, addMinutes, parseISO } from 'date-fns';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useCalendar } from '../../contexts/CalendarContext';
import { usePatients } from '../../contexts/PatientsContext';
import type { Appointment, AppointmentService } from '../../types';
import { sendSms, isSmsConfigured } from '../../lib/smsService';
import { smsPotvrda } from '../../lib/smsTemplates';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editAppointment?: Appointment | null;
  defaultDate?: Date;
  defaultTime?: string;
}

const durations = [15, 20, 30, 45, 60, 90, 120];

export default function AppointmentModal({
  isOpen,
  onClose,
  editAppointment,
  defaultDate,
  defaultTime,
}: AppointmentModalProps) {
  const { createAppointment, updateAppointment, addSmsLog, doctors, rooms, services, serviceCategories } = useCalendar();
  const { patients } = usePatients();
  const isEdit = !!editAppointment;

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(editAppointment?.patient_id || '');
  const [doctorId, setDoctorId] = useState(editAppointment?.doctor_id || doctors[0]?.id || '');
  const [roomId, setRoomId] = useState(editAppointment?.room_id || rooms[0]?.id || '');
  const [datum, setDatum] = useState(() => {
    if (editAppointment) {
      const d = new Date(editAppointment.pocetak);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    if (defaultDate) return format(defaultDate, 'yyyy-MM-dd');
    return format(new Date(), 'yyyy-MM-dd');
  });
  const [vrijeme, setVrijeme] = useState(() => {
    if (editAppointment) {
      const d = new Date(editAppointment.pocetak);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return defaultTime || '09:00';
  });
  const [trajanje, setTrajanje] = useState(() => {
    if (editAppointment) {
      const mins = Math.round(
        (new Date(editAppointment.kraj).getTime() - new Date(editAppointment.pocetak).getTime()) / 60000
      );
      return mins;
    }
    return 30;
  });
  const [selectedServices, setSelectedServices] = useState<AppointmentService[]>(
    editAppointment?.services || []
  );
  const [napomena, setNapomena] = useState(editAppointment?.napomena ?? '');
  const [showPatientList, setShowPatientList] = useState(false);
  const [posaljiSms, setPosaljiSms] = useState(true);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients.slice(0, 5);
    const q = patientSearch.toLowerCase();
    return patients.filter(
      (p) =>
        p.ime.toLowerCase().includes(q) ||
        p.prezime.toLowerCase().includes(q) ||
        p.telefon.includes(q)
    );
  }, [patientSearch, patients]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const groupedServices = useMemo(() => {
    return serviceCategories.map((cat) => ({
      ...cat,
      services: services.filter((s) => s.kategorija_id === cat.id),
    }));
  }, [serviceCategories, services]);

  const ukupnaCijena = selectedServices.reduce((sum, s) => sum + s.ukupno, 0);

  function addService(serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    const already = selectedServices.find((s) => s.service_id === serviceId);
    if (already) return;

    const newSvc: AppointmentService = {
      id: `as-${Date.now()}`,
      appointment_id: '',
      service_id: serviceId,
      naziv: svc.naziv,
      cijena: svc.cijena,
      kolicina: 1,
      popust: selectedPatient?.popust || 0,
      ukupno: svc.cijena * (1 - (selectedPatient?.popust || 0) / 100),
    };
    setSelectedServices((prev) => [...prev, newSvc]);
    if (selectedServices.length === 0) {
      setTrajanje(svc.trajanje);
    }
  }

  function removeService(serviceId: string) {
    setSelectedServices((prev) => prev.filter((s) => s.service_id !== serviceId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatientId || !doctorId || !roomId) return;

    const pocetak = new Date(`${datum}T${vrijeme}:00`);
    const kraj = addMinutes(pocetak, trajanje);

    if (isEdit && editAppointment) {
      updateAppointment(editAppointment.id, {
        patient_id: selectedPatientId,
        doctor_id: doctorId,
        room_id: roomId,
        pocetak: pocetak.toISOString(),
        kraj: kraj.toISOString(),
        napomena,
        services: selectedServices,
      });
    } else {
      const newAppointment = {
        patient_id: selectedPatientId,
        doctor_id: doctorId,
        room_id: roomId,
        pocetak: pocetak.toISOString(),
        kraj: kraj.toISOString(),
        status: 'zakazan' as const,
        napomena: napomena || undefined,
        services: selectedServices,
      };
      const created = await createAppointment(newAppointment);

      // SMS potvrda
      if (created && posaljiSms && isSmsConfigured() && selectedPatient?.telefon) {
        const doctor = doctors.find((d) => d.id === doctorId);
        const doctorName = doctor ? `${doctor.titula || ''} ${doctor.ime} ${doctor.prezime}`.trim() : undefined;
        const text = smsPotvrda({
          imeIPrezime: `${selectedPatient.ime} ${selectedPatient.prezime}`,
          datum: pocetak.toISOString(),
          doctor: doctorName,
        });

        const result = await sendSms(selectedPatient.telefon, text);
        addSmsLog({
          id: `sms-${Date.now()}`,
          patient: `${selectedPatient.ime} ${selectedPatient.prezime}`,
          phone: selectedPatient.telefon,
          text,
          status: result.success ? 'sent' : 'failed',
          error: result.error,
          datum: new Date().toISOString(),
          tip: 'potvrda',
        });

        setSmsStatus(result.success ? 'SMS potvrda poslana!' : `SMS greska: ${result.error}`);
        setTimeout(() => setSmsStatus(null), 4000);
      }
    }
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Izmijeni termin' : 'Novi termin'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pacijent */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Pacijent *</label>
          {selectedPatient ? (
            <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-primary-800">
                {selectedPatient.ime} {selectedPatient.prezime} — {selectedPatient.telefon}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedPatientId('');
                  setPatientSearch('');
                }}
                className="text-primary-500 hover:text-primary-700 text-sm"
              >
                Promijeni
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Pretrazite po imenu ili telefonu..."
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setShowPatientList(true);
                }}
                onFocus={() => setShowPatientList(true)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {showPatientList && (
                <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setShowPatientList(false);
                        setPatientSearch('');
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between"
                    >
                      <span className="font-medium">{p.ime} {p.prezime}</span>
                      <span className="text-gray-400">{p.telefon}</span>
                    </button>
                  ))}
                  {filteredPatients.length === 0 && (
                    <p className="px-3 py-2 text-sm text-gray-400">Nema rezultata</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Doktor i Ordinacija */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Doktor *</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.titula} {d.ime} {d.prezime}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordinacija / Oprema *</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.naziv}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Datum, Vrijeme, Trajanje */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Datum *"
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            required
          />
          <Input
            label="Vrijeme *"
            type="time"
            value={vrijeme}
            onChange={(e) => setVrijeme(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trajanje *</label>
            <select
              value={trajanje}
              onChange={(e) => setTrajanje(Number(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {durations.map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>
        </div>

        {/* Usluge */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Usluge</label>
          <select
            onChange={(e) => {
              if (e.target.value) addService(e.target.value);
              e.target.value = '';
            }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            defaultValue=""
          >
            <option value="">+ Dodaj uslugu...</option>
            {groupedServices.map((cat) => (
              <optgroup key={cat.id} label={cat.naziv}>
                {cat.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.naziv} — {s.cijena} EUR ({s.trajanje} min)
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {selectedServices.length > 0 && (
            <div className="mt-2 space-y-1">
              {selectedServices.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm">{svc.naziv}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{svc.ukupno.toFixed(2)} EUR</span>
                    {svc.popust > 0 && (
                      <span className="text-xs text-green-600">-{svc.popust}%</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeService(svc.service_id)}
                      className="text-gray-400 hover:text-danger text-xs"
                    >
                      Ukloni
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t border-border">
                <span className="text-sm font-semibold">Ukupno: {ukupnaCijena.toFixed(2)} EUR</span>
              </div>
            </div>
          )}
        </div>

        {/* Napomena */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
          <textarea
            value={napomena}
            onChange={(e) => setNapomena(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Interna biljeska..."
          />
        </div>

        {/* SMS potvrda */}
        {!isEdit && isSmsConfigured() && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={posaljiSms}
              onChange={(e) => setPosaljiSms(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Posalji SMS potvrdu pacijentu
          </label>
        )}

        {smsStatus && (
          <p className={`text-sm ${smsStatus.includes('greska') ? 'text-red-600' : 'text-green-600'}`}>
            {smsStatus}
          </p>
        )}

        {/* Dugmad */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Otkazi
          </Button>
          <Button type="submit" disabled={!selectedPatientId}>
            {isEdit ? 'Sacuvaj izmjene' : 'Zakazi termin'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
