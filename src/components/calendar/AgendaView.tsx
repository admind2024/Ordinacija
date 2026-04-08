import { format, startOfWeek, endOfWeek, addDays, parseISO, isSameDay, differenceInMinutes } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import { MapPin, Stethoscope } from 'lucide-react';
import { useCalendar } from '../../contexts/CalendarContext';
import { usePatients } from '../../contexts/PatientsContext';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '../../types';
import type { Appointment } from '../../types';

interface AgendaViewProps {
  onAppointmentClick: (appointment: Appointment, e: React.MouseEvent) => void;
}

export default function AgendaView({ onAppointmentClick }: AgendaViewProps) {
  const { selectedDate, getFilteredAppointments, doctors, rooms } = useCalendar();
  const { patients } = usePatients();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const appointments = getFilteredAppointments(weekStart, addDays(weekEnd, 1));

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayApts = appointments
          .filter((apt) => isSameDay(parseISO(apt.pocetak), day))
          .sort((a, b) => parseISO(a.pocetak).getTime() - parseISO(b.pocetak).getTime());

        const isToday = isSameDay(day, new Date());

        return (
          <div key={day.toISOString()} className="bg-surface border border-border rounded-xl overflow-hidden">
            {/* Dan header */}
            <div className={`px-4 py-2 border-b border-border ${isToday ? 'bg-primary-50' : 'bg-gray-50'}`}>
              <span className={`text-sm font-semibold ${isToday ? 'text-primary-700' : 'text-gray-700'}`}>
                {format(day, 'EEEE, d. MMMM', { locale: sr })}
                {isToday && <span className="ml-2 text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">Danas</span>}
              </span>
            </div>

            {dayApts.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">Nema zakazanih termina</div>
            ) : (
              <div className="divide-y divide-border">
                {dayApts.map((apt) => {
                  const patient = patients.find((p) => p.id === apt.patient_id);
                  const doctor = doctors.find((d) => d.id === apt.doctor_id);
                  const room = rooms.find((r) => r.id === apt.room_id);
                  const duration = differenceInMinutes(parseISO(apt.kraj), parseISO(apt.pocetak));

                  return (
                    <button
                      key={apt.id}
                      onClick={(e) => onAppointmentClick(apt, e)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-4"
                    >
                      {/* Vrijeme */}
                      <div className="w-16 shrink-0 text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {format(parseISO(apt.pocetak), 'HH:mm')}
                        </p>
                        <p className="text-xs text-gray-400">{duration} min</p>
                      </div>

                      {/* Status bar */}
                      <div
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[apt.status] }}
                      />

                      {/* Detalji */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {patient ? `${patient.ime} ${patient.prezime}` : 'Nepoznat'}
                          </p>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: APPOINTMENT_STATUS_COLORS[apt.status] + '20',
                              color: APPOINTMENT_STATUS_COLORS[apt.status],
                            }}
                          >
                            {APPOINTMENT_STATUS_LABELS[apt.status]}
                          </span>
                        </div>

                        {apt.services && apt.services.length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {apt.services.map((s) => s.naziv).join(', ')}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {doctor && (
                            <span className="flex items-center gap-1">
                              <Stethoscope size={12} />
                              {doctor.titula} {doctor.ime} {doctor.prezime.charAt(0)}.
                            </span>
                          )}
                          {room && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {room.naziv}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cijena */}
                      {apt.services && apt.services.length > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {apt.services.reduce((sum, s) => sum + s.ukupno, 0).toFixed(0)} EUR
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
