import { format, startOfWeek, addDays, parseISO, differenceInMinutes, isSameDay } from 'date-fns';
import { sr } from 'date-fns/locale';
import { useCalendar } from '../../contexts/CalendarContext';
import AppointmentCard from './AppointmentCard';
import type { Appointment } from '../../types';

const HOUR_START = 7;
const HOUR_END = 21;
const SLOT_HEIGHT = 48; // px per 30 min
const HOUR_HEIGHT = SLOT_HEIGHT * 2;
const TOTAL_HOURS = HOUR_END - HOUR_START;

interface WeekViewProps {
  onAppointmentClick: (appointment: Appointment, e: React.MouseEvent) => void;
  onSlotClick: (date: Date, time: string) => void;
}

export default function WeekView({ onAppointmentClick, onSlotClick }: WeekViewProps) {
  const { selectedDate, getFilteredAppointments } = useCalendar();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekEnd = addDays(weekStart, 7);
  const appointments = getFilteredAppointments(weekStart, weekEnd);

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);

  const isToday = (date: Date) => isSameDay(date, new Date());

  function getAppointmentStyle(apt: Appointment) {
    const start = parseISO(apt.pocetak);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const duration = differenceInMinutes(parseISO(apt.kraj), start);
    const topOffset = ((startMinutes - HOUR_START * 60) / 30) * SLOT_HEIGHT;
    const height = (duration / 30) * SLOT_HEIGHT;
    return { top: `${topOffset}px`, height: `${Math.max(height, 20)}px` };
  }

  function getAppointmentsForDay(date: Date) {
    return appointments.filter((apt) => isSameDay(parseISO(apt.pocetak), date));
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header — dani */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
        <div className="p-2" /> {/* prazan za sate */}
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`p-2 text-center border-l border-border
              ${isToday(day) ? 'bg-primary-50' : ''}`}
          >
            <p className="text-xs text-gray-500 uppercase">
              {format(day, 'EEE', { locale: sr })}
            </p>
            <p
              className={`text-lg font-semibold mt-0.5
                ${isToday(day) ? 'text-primary-600 bg-primary-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' : 'text-gray-900'}`}
            >
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Grid — sati x dani */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Sati kolona */}
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

          {/* Dani kolone */}
          {days.map((day) => {
            const dayApts = getAppointmentsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={`border-l border-border relative ${isToday(day) ? 'bg-primary-50/30' : ''}`}
              >
                {/* Slot grid */}
                {hours.map((hour) => (
                  <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }}>
                    <div
                      className="border-b border-border h-1/2 hover:bg-primary-50 cursor-pointer transition-colors"
                      onClick={() => onSlotClick(day, `${String(hour).padStart(2, '0')}:00`)}
                    />
                    <div
                      className="border-b border-dashed border-gray-100 h-1/2 hover:bg-primary-50 cursor-pointer transition-colors"
                      onClick={() => onSlotClick(day, `${String(hour).padStart(2, '0')}:30`)}
                    />
                  </div>
                ))}

                {/* Termini */}
                {dayApts.map((apt) => (
                  <div key={apt.id} style={getAppointmentStyle(apt)} className="absolute left-0 right-0 px-0.5">
                    <AppointmentCard
                      appointment={apt}
                      onClick={(a) => onAppointmentClick(a, {} as React.MouseEvent)}
                    />
                  </div>
                ))}

                {/* Current time indicator */}
                {isToday(day) && <CurrentTimeIndicator />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CurrentTimeIndicator() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const topOffset = ((minutes - HOUR_START * 60) / 30) * SLOT_HEIGHT;

  if (topOffset < 0 || topOffset > TOTAL_HOURS * HOUR_HEIGHT) return null;

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${topOffset}px` }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 bg-danger rounded-full -ml-1" />
        <div className="flex-1 h-0.5 bg-danger" />
      </div>
    </div>
  );
}
