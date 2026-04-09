import { useState } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { X, Phone, Edit, Trash2, Banknote } from 'lucide-react';
import { useCalendar } from '../../contexts/CalendarContext';
import { usePatients } from '../../contexts/PatientsContext';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS, type AppointmentStatus, type Appointment } from '../../types';
import Button from '../ui/Button';
import PaymentForm from '../billing/PaymentForm';

interface AppointmentPopoverProps {
  appointment: Appointment;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
}

const statusOptions: AppointmentStatus[] = [
  'zakazan', 'potvrdjen', 'stigao', 'u_toku', 'zavrsen', 'otkazan', 'nije_dosao',
];

export default function AppointmentPopover({ appointment, onClose, onEdit }: AppointmentPopoverProps) {
  const { updateAppointmentStatus, deleteAppointment, doctors, rooms } = useCalendar();
  const { patients } = usePatients();
  const [showPayment, setShowPayment] = useState(false);
  const patient = patients.find((p) => p.id === appointment.patient_id);
  const doctor = doctors.find((d) => d.id === appointment.doctor_id);
  const room = rooms.find((r) => r.id === appointment.room_id);
  const duration = differenceInMinutes(parseISO(appointment.kraj), parseISO(appointment.pocetak));

  function handleStatusChange(newStatus: AppointmentStatus) {
    updateAppointmentStatus(appointment.id, newStatus);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-surface rounded-xl shadow-2xl border border-border w-96 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[appointment.status] }}
            />
            <span className="text-sm font-medium text-gray-900">
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Sadrzaj */}
        <div className="p-4 space-y-3">
          {/* Pacijent */}
          {patient && (
            <div>
              <p className="text-base font-semibold text-gray-900">
                {patient.ime} {patient.prezime}
              </p>
              <a
                href={`tel:${patient.telefon}`}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <Phone size={14} />
                {patient.telefon}
              </a>
            </div>
          )}

          {/* Detalji */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Datum:</span>
              <p className="font-medium">{format(parseISO(appointment.pocetak), 'dd.MM.yyyy.')}</p>
            </div>
            <div>
              <span className="text-gray-500">Vrijeme:</span>
              <p className="font-medium">
                {format(parseISO(appointment.pocetak), 'HH:mm')} - {format(parseISO(appointment.kraj), 'HH:mm')}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Trajanje:</span>
              <p className="font-medium">{duration} min</p>
            </div>
            {room && (
              <div>
                <span className="text-gray-500">Ordinacija:</span>
                <p className="font-medium">{room.naziv}</p>
              </div>
            )}
          </div>

          {/* Ljekar */}
          {doctor && (
            <div className="text-sm">
              <span className="text-gray-500">Ljekar:</span>
              <p className="font-medium">{doctor.titula} {doctor.ime} {doctor.prezime}</p>
            </div>
          )}

          {/* Usluge */}
          {appointment.services && appointment.services.length > 0 && (
            <div className="text-sm">
              <span className="text-gray-500">Usluge:</span>
              {appointment.services.map((svc) => (
                <div key={svc.id} className="flex justify-between mt-1">
                  <span>{svc.naziv}</span>
                  <span className="font-medium">{svc.ukupno} EUR</span>
                </div>
              ))}
            </div>
          )}

          {/* Napomena */}
          {appointment.napomena && (
            <div className="text-sm bg-amber-50 border border-amber-100 rounded-lg p-2">
              <span className="text-amber-700">{appointment.napomena}</span>
            </div>
          )}

          {/* Status promjena */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Promijeni status
            </label>
            <div className="flex flex-wrap gap-1 mt-1">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors
                    ${appointment.status === s
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  style={
                    appointment.status === s
                      ? { backgroundColor: APPOINTMENT_STATUS_COLORS[s] }
                      : undefined
                  }
                >
                  {APPOINTMENT_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Akcije */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-gray-50 rounded-b-xl">
          {appointment.services && appointment.services.length > 0 && (
            <Button size="sm" onClick={() => setShowPayment(true)}>
              <Banknote size={14} />
              Naplata
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => onEdit(appointment)}>
            <Edit size={14} />
            Izmijeni
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              deleteAppointment(appointment.id);
              onClose();
            }}
          >
            <Trash2 size={14} />
            Obrisi
          </Button>
        </div>

        {/* Payment modal */}
        {showPayment && (
          <PaymentForm
            isOpen={showPayment}
            onClose={() => setShowPayment(false)}
            appointment={appointment}
          />
        )}
      </div>
    </div>
  );
}
