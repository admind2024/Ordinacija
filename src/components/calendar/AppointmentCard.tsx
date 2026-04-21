import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Check, X, Smartphone, CircleSlash } from 'lucide-react';
import { useCalendar } from '../../contexts/CalendarContext';
import { usePatients } from '../../contexts/PatientsContext';
import type { Appointment, AppointmentStatus } from '../../types';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: (appointment: Appointment) => void;
  compact?: boolean;
}

// Vizualni modifikator po statusu — ne dira boju (ona ide iz getAppointmentColor),
// ali odredjuje opacity i precrtavanje za "pasivne" statuse kako bi recepcija
// odmah vidjela koji su termini zatvoreni.
function getStatusVisual(status: AppointmentStatus): { opacity: number; lineThrough: boolean } {
  switch (status) {
    case 'zavrsen':
      return { opacity: 0.65, lineThrough: false };
    case 'otkazan':
      return { opacity: 0.5, lineThrough: true };
    case 'nije_dosao':
      return { opacity: 0.6, lineThrough: true };
    default:
      return { opacity: 1, lineThrough: false };
  }
}

interface BadgeSpec {
  icon: typeof Check;
  bg: string;
  fg: string;
  title: string;
}

function getStatusBadge(appointment: Appointment): BadgeSpec | null {
  // Potvrda od pacijenta preko linka ima svoj marker — bitno za recepciju
  if (appointment.status === 'potvrdjen' && appointment.confirmed_source === 'patient_link') {
    return { icon: Smartphone, bg: '#0EA5E9', fg: '#FFFFFF', title: 'Pacijent potvrdio preko linka' };
  }
  switch (appointment.status) {
    case 'potvrdjen':
      return { icon: Check, bg: '#22C55E', fg: '#FFFFFF', title: 'Potvrđen' };
    case 'zavrsen':
      return { icon: Check, bg: '#15803D', fg: '#FFFFFF', title: 'Završen' };
    case 'nije_dosao':
      return { icon: CircleSlash, bg: '#9CA3AF', fg: '#FFFFFF', title: 'Nije se pojavio' };
    case 'otkazan':
      return { icon: X, bg: '#EF4444', fg: '#FFFFFF', title: 'Otkazan' };
    default:
      return null;
  }
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

  const visual = getStatusVisual(appointment.status);
  const badge = getStatusBadge(appointment);

  if (compact) {
    return (
      <button
        onClick={() => onClick(appointment)}
        className="relative w-full text-left pl-1.5 pr-4 py-0.5 rounded text-xs truncate transition-opacity hover:opacity-80"
        style={{
          backgroundColor: color + '20',
          color,
          borderLeft: `3px solid ${color}`,
          opacity: visual.opacity,
          textDecoration: visual.lineThrough ? 'line-through' : 'none',
        }}
      >
        <span className="font-medium">{timeStr}</span>{' '}
        {patient ? `${patient.ime} ${patient.prezime.charAt(0)}.` : ''}
        {badge && (
          <span
            title={badge.title}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full"
            style={{ backgroundColor: badge.bg, color: badge.fg, width: '12px', height: '12px' }}
          >
            <badge.icon size={8} strokeWidth={3} />
          </span>
        )}
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
        opacity: visual.opacity,
        textDecoration: visual.lineThrough ? 'line-through' : 'none',
      }}
    >
      {badge && (
        <span
          title={badge.title}
          className="absolute top-1 right-1 flex items-center justify-center rounded-full shadow-sm"
          style={{ backgroundColor: badge.bg, color: badge.fg, width: '16px', height: '16px' }}
        >
          <badge.icon size={10} strokeWidth={3} />
        </span>
      )}
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold" style={{ color }}>
          {timeStr}
        </span>
        {duration > 20 && (
          <span className="text-[10px] text-gray-400">{duration} min</span>
        )}
      </div>
      {duration > 15 && patient && (
        <p className="text-xs font-medium text-gray-800 truncate pr-4">
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
