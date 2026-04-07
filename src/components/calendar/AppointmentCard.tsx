import { format, parseISO, differenceInMinutes } from 'date-fns';
import { useCalendar } from '../../contexts/CalendarContext';
import { usePatients } from '../../contexts/PatientsContext';
import type { Appointment } from '../../types';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: (appointment: Appointment) => void;
  compact?: boolean;
}

export default function AppointmentCard({ appointment, onClick, compact = false }: AppointmentCardProps) {
  const { getAppointmentColor, doctors } = useCalendar();
  const { patients } = usePatients();
  const color = getAppointmentColor(appointment);
  const patient = patients.find((p) => p.id === appointment.patient_id);
  const doctor = doctors.find((d) => d.id === appointment.doctor_id);
  const duration = differenceInMinutes(parseISO(appointment.kraj), parseISO(appointment.pocetak));
  const timeStr = format(parseISO(appointment.pocetak), 'HH:mm');
  const serviceName = appointment.services?.[0]?.naziv || '';

  if (compact) {
    return (
      <button
        onClick={() => onClick(appointment)}
        className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate transition-opacity hover:opacity-80"
        style={{ backgroundColor: color + '20', color, borderLeft: `3px solid ${color}` }}
      >
        <span className="font-medium">{timeStr}</span>{' '}
        {patient ? `${patient.ime} ${patient.prezime.charAt(0)}.` : ''}
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick(appointment)}
      className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left overflow-hidden cursor-pointer
        transition-all hover:shadow-md hover:z-10 border border-transparent hover:border-white/50"
      style={{
        backgroundColor: color + '18',
        borderLeftColor: color,
        borderLeftWidth: '3px',
      }}
    >
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold" style={{ color }}>
          {timeStr}
        </span>
        {duration > 20 && (
          <span className="text-[10px] text-gray-400">{duration} min</span>
        )}
      </div>
      {duration > 15 && patient && (
        <p className="text-xs font-medium text-gray-800 truncate">
          {patient.ime} {patient.prezime}
        </p>
      )}
      {duration > 30 && serviceName && (
        <p className="text-[10px] text-gray-500 truncate">{serviceName}</p>
      )}
      {duration > 40 && doctor && (
        <p className="text-[10px] text-gray-400 truncate">
          {doctor.titula} {doctor.ime} {doctor.prezime.charAt(0)}.
        </p>
      )}
    </button>
  );
}
