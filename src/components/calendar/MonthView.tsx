import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { useCalendar } from '../../contexts/CalendarContext';
import AppointmentCard from './AppointmentCard';
import type { Appointment } from '../../types';

interface MonthViewProps {
  onAppointmentClick: (appointment: Appointment, e: React.MouseEvent) => void;
  onDayClick: (date: Date) => void;
}

const MAX_VISIBLE = 3;

export default function MonthView({ onAppointmentClick, onDayClick }: MonthViewProps) {
  const { selectedDate, getFilteredAppointments } = useCalendar();

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const allAppointments = getFilteredAppointments(calStart, addDays(calEnd, 1));

  // Generisi dane
  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  function getAppointmentsForDay(date: Date) {
    return allAppointments.filter((apt) => isSameDay(parseISO(apt.pocetak), date));
  }

  const dayNames = ['Pon', 'Uto', 'Sri', 'Cet', 'Pet', 'Sub', 'Ned'];

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {dayNames.map((name) => (
          <div key={name} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase">
            {name}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
          {week.map((d) => {
            const dayApts = getAppointmentsForDay(d);
            const isCurrentMonth = isSameMonth(d, selectedDate);
            const today = isSameDay(d, new Date());

            return (
              <div
                key={d.toISOString()}
                className={`min-h-[100px] border-l border-border first:border-l-0 p-1 cursor-pointer hover:bg-gray-50 transition-colors
                  ${!isCurrentMonth ? 'bg-gray-50/50' : ''}`}
                onClick={() => onDayClick(d)}
              >
                <div className="flex justify-end mb-1">
                  <span
                    className={`text-sm w-7 h-7 flex items-center justify-center rounded-full
                      ${today ? 'bg-primary-600 text-white font-semibold' : ''}
                      ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    {format(d, 'd')}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {dayApts.slice(0, MAX_VISIBLE).map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onClick={(a) => {
                        onAppointmentClick(a, {} as React.MouseEvent);
                      }}
                      compact
                    />
                  ))}
                  {dayApts.length > MAX_VISIBLE && (
                    <p className="text-xs text-gray-400 pl-1">
                      +{dayApts.length - MAX_VISIBLE} jos
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
