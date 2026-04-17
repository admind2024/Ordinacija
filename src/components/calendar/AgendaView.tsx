import { useEffect, useState } from 'react';
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

  // Responsive: na mobilnom prikazujemo 7 dana pocev od selectedDate (po defaultu danas).
  // Na desktopu ostaje originalna nedjelja (pon-ned) — bolji pregled.
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const rangeStart = isMobile ? selectedDate : startOfWeek(selectedDate, { weekStartsOn: 1 });
  const rangeEnd = isMobile ? addDays(selectedDate, 6) : endOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));
  const appointments = getFilteredAppointments(rangeStart, addDays(rangeEnd, 1));

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
                      className="w-full text-left px-3 md:px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-start gap-2 md:gap-4"
                    >
                      {/* Vrijeme */}
                      <div className="w-12 md:w-16 shrink-0 text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {format(parseISO(apt.pocetak), 'HH:mm')}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-400">{duration} min</p>
                      </div>

                      {/* Status bar */}
                      <div
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[apt.status] }}
                      />

                      {/* Detalji */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {patient ? `${patient.ime} ${patient.prezime}` : 'Nepoznat'}
                          </p>
                          <span
                            className="text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-medium shrink-0"
                            style={{
                              backgroundColor: APPOINTMENT_STATUS_COLORS[apt.status] + '20',
                              color: APPOINTMENT_STATUS_COLORS[apt.status],
                            }}
                          >
                            {APPOINTMENT_STATUS_LABELS[apt.status]}
                          </span>
                        </div>

                        {apt.services && apt.services.length > 0 && (
                          <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 truncate">
                            {apt.services.map((s) => s.naziv).join(', ')}
                          </p>
                        )}

                        <div className="flex items-center gap-2 md:gap-3 mt-1 text-[10px] md:text-xs text-gray-400 flex-wrap">
                          {doctor && (
                            <span className="flex items-center gap-1 truncate">
                              <Stethoscope size={11} className="shrink-0" />
                              <span className="truncate">{doctor.titula} {doctor.ime} {doctor.prezime.charAt(0)}.</span>
                            </span>
                          )}
                          {room && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} className="shrink-0" />
                              {room.naziv}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cijena */}
                      {apt.services && apt.services.length > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-xs md:text-sm font-semibold text-gray-900">
                            {apt.services.reduce((sum, s) => sum + s.ukupno, 0).toFixed(0)} €
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
