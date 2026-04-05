import { parseISO, differenceInMinutes, isSameDay } from 'date-fns';
import { useCalendar } from '../../contexts/CalendarContext';
import { demoDoctors } from '../../data/demo';
import AppointmentCard from './AppointmentCard';
import type { Appointment } from '../../types';

const HOUR_START = 7;
const HOUR_END = 21;
const SLOT_HEIGHT = 48;
const HOUR_HEIGHT = SLOT_HEIGHT * 2;
const TOTAL_HOURS = HOUR_END - HOUR_START;

interface DayViewProps {
  onAppointmentClick: (appointment: Appointment, e: React.MouseEvent) => void;
  onSlotClick: (date: Date, time: string) => void;
}

export default function DayView({ onAppointmentClick, onSlotClick }: DayViewProps) {
  const { selectedDate, getFilteredAppointments, filters } = useCalendar();

  const visibleDoctors = demoDoctors.filter((d) => filters.doctorIds.includes(d.id));
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  const appointments = getFilteredAppointments(dayStart, dayEnd);
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);
  const isToday = isSameDay(selectedDate, new Date());

  function getAppointmentStyle(apt: Appointment) {
    const start = parseISO(apt.pocetak);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const duration = differenceInMinutes(parseISO(apt.kraj), start);
    const topOffset = ((startMinutes - HOUR_START * 60) / 30) * SLOT_HEIGHT;
    const height = (duration / 30) * SLOT_HEIGHT;
    return { top: `${topOffset}px`, height: `${Math.max(height, 20)}px` };
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header — ljekari */}
      <div
        className="grid border-b border-border"
        style={{ gridTemplateColumns: `60px repeat(${visibleDoctors.length}, 1fr)` }}
      >
        <div className="p-2" />
        {visibleDoctors.map((doctor) => (
          <div key={doctor.id} className="p-2 text-center border-l border-border">
            <div className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: doctor.boja }} />
              <span className="text-sm font-medium text-gray-900">
                {doctor.titula} {doctor.ime} {doctor.prezime.charAt(0)}.
              </span>
            </div>
            <p className="text-xs text-gray-400">{doctor.specijalizacija}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        <div
          className="grid"
          style={{ gridTemplateColumns: `60px repeat(${visibleDoctors.length}, 1fr)` }}
        >
          {/* Sati */}
          <div>
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-b border-border text-right pr-2 text-xs text-gray-400"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                <span className="relative -top-2">{String(hour).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Kolone ljekara */}
          {visibleDoctors.map((doctor) => {
            const doctorApts = appointments.filter((a) => a.doctor_id === doctor.id);
            return (
              <div key={doctor.id} className="border-l border-border relative">
                {hours.map((hour) => (
                  <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }}>
                    <div
                      className="border-b border-border h-1/2 hover:bg-primary-50 cursor-pointer transition-colors"
                      onClick={() => onSlotClick(selectedDate, `${String(hour).padStart(2, '0')}:00`)}
                    />
                    <div
                      className="border-b border-dashed border-gray-100 h-1/2 hover:bg-primary-50 cursor-pointer transition-colors"
                      onClick={() => onSlotClick(selectedDate, `${String(hour).padStart(2, '0')}:30`)}
                    />
                  </div>
                ))}

                {doctorApts.map((apt) => (
                  <div key={apt.id} style={getAppointmentStyle(apt)} className="absolute left-0 right-0 px-0.5">
                    <AppointmentCard
                      appointment={apt}
                      onClick={(a) => onAppointmentClick(a, {} as React.MouseEvent)}
                    />
                  </div>
                ))}

                {isToday && <CurrentTimeLine />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CurrentTimeLine() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const topOffset = ((minutes - HOUR_START * 60) / 30) * SLOT_HEIGHT;
  if (topOffset < 0 || topOffset > TOTAL_HOURS * HOUR_HEIGHT) return null;

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${topOffset}px` }}>
      <div className="h-0.5 bg-danger" />
    </div>
  );
}
