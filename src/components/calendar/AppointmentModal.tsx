import { useState, useMemo, useRef } from 'react';
import { format, addMinutes } from 'date-fns';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useCalendar } from '../../contexts/CalendarContext';
import { usePatients } from '../../contexts/PatientsContext';
import { supabase } from '../../lib/supabase';
import type { Appointment, AppointmentService } from '../../types';

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
  const { createAppointment, updateAppointment, doctors, rooms, services, serviceCategories, materials } = useCalendar();
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
  // Pretraga usluga
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceList, setShowServiceList] = useState(false);
  const serviceSearchRef = useRef<HTMLInputElement>(null);
  // Materijali
  const [selectedMaterials, setSelectedMaterials] = useState<{ material_id: string; naziv: string; kolicina: number; jedinica: string }[]>([]);

  function addMaterial(materialId: string) {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat || selectedMaterials.find((m) => m.material_id === materialId)) return;
    setSelectedMaterials((prev) => [...prev, { material_id: mat.id, naziv: mat.naziv, kolicina: 1, jedinica: mat.jedinica_mjere }]);
  }

  function removeMaterial(materialId: string) {
    setSelectedMaterials((prev) => prev.filter((m) => m.material_id !== materialId));
  }

  function updateMaterialQty(materialId: string, qty: number) {
    setSelectedMaterials((prev) => prev.map((m) => m.material_id === materialId ? { ...m, kolicina: Math.max(0.1, qty) } : m));
  }

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

  const filteredServiceResults = useMemo(() => {
    const q = serviceSearch.toLowerCase().trim();
    if (!q) return [];
    const already = new Set(selectedServices.map((s) => s.service_id));
    return services
      .filter((s) => !already.has(s.id) && (s.naziv.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [serviceSearch, services, selectedServices]);

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

  function updateServiceDiscount(serviceId: string, discount: number) {
    setSelectedServices((prev) => prev.map((s) => {
      if (s.service_id !== serviceId) return s;
      const pop = Math.max(0, Math.min(100, discount));
      return { ...s, popust: pop, ukupno: s.cijena * s.kolicina * (1 - pop / 100) };
    }));
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
        napomena: napomena || undefined,
        services: selectedServices,
      });
      // Sacuvaj materijale
      if (selectedMaterials.length > 0) {
        for (const mat of selectedMaterials) {
          await supabase.from('material_usage').insert({
            appointment_id: editAppointment.id,
            material_id: mat.material_id,
            kolicina: mat.kolicina,
            ljekar_id: doctorId,
            patient_id: selectedPatientId,
            datum: datum,
          });
        }
      }
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

      // Sacuvaj materijale
      if (created && selectedMaterials.length > 0) {
        for (const mat of selectedMaterials) {
          await supabase.from('material_usage').insert({
            appointment_id: created.id,
            material_id: mat.material_id,
            kolicina: mat.kolicina,
            ljekar_id: doctorId,
            patient_id: selectedPatientId,
            datum: datum,
          });
        }
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
          <div className="relative">
            <input
              ref={serviceSearchRef}
              type="text"
              value={serviceSearch}
              onChange={(e) => { setServiceSearch(e.target.value); setShowServiceList(true); }}
              onFocus={() => setShowServiceList(true)}
              onBlur={() => setTimeout(() => setShowServiceList(false), 150)}
              placeholder="Pretraži uslugu..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {showServiceList && filteredServiceResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                {filteredServiceResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => {
                      addService(s.id);
                      setServiceSearch('');
                      setShowServiceList(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-gray-800">{s.naziv}</span>
                    <span className="text-xs text-gray-400 shrink-0">{s.cijena} EUR · {s.trajanje} min</span>
                  </button>
                ))}
              </div>
            )}
            {showServiceList && serviceSearch.length > 0 && filteredServiceResults.length === 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-sm px-3 py-2 text-sm text-gray-400">
                Nema rezultata
              </div>
            )}
          </div>

          {selectedServices.length > 0 && (
            <div className="mt-2 space-y-1">
              {selectedServices.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 gap-2">
                  <span className="text-sm flex-1 min-w-0 truncate">{svc.naziv}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={svc.popust}
                        onChange={(e) => updateServiceDiscount(svc.service_id, Number(e.target.value))}
                        className="w-14 px-1.5 py-1 border border-border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
                        title="Popust %"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                    <span className="text-sm font-medium w-20 text-right">{svc.ukupno.toFixed(2)} EUR</span>
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

        {/* Materijali */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Utroseni materijali</label>
          <select
            onChange={(e) => {
              if (e.target.value) addMaterial(e.target.value);
              e.target.value = '';
            }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            defaultValue=""
          >
            <option value="">+ Dodaj materijal...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.naziv} ({m.jedinica_mjere})</option>
            ))}
          </select>

          {selectedMaterials.length > 0 && (
            <div className="mt-2 space-y-1">
              {selectedMaterials.map((mat) => (
                <div key={mat.material_id} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2 gap-2">
                  <span className="text-sm text-purple-800 flex-1 min-w-0 truncate">{mat.naziv}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={mat.kolicina}
                      onChange={(e) => updateMaterialQty(mat.material_id, Number(e.target.value))}
                      className="w-16 px-1.5 py-1 border border-border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <span className="text-xs text-purple-600">{mat.jedinica}</span>
                    <button
                      type="button"
                      onClick={() => removeMaterial(mat.material_id)}
                      className="text-gray-400 hover:text-danger text-xs"
                    >
                      Ukloni
                    </button>
                  </div>
                </div>
              ))}
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
