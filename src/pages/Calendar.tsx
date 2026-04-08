import { useState, useCallback } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import CalendarToolbar from '../components/calendar/CalendarToolbar';
import FilterPanel from '../components/calendar/FilterPanel';
import WeekView from '../components/calendar/WeekView';
import DayView from '../components/calendar/DayView';
import MonthView from '../components/calendar/MonthView';
import AgendaView from '../components/calendar/AgendaView';
import AppointmentModal from '../components/calendar/AppointmentModal';
import AppointmentPopover from '../components/calendar/AppointmentPopover';
import type { Appointment } from '../types';

function CalendarContent() {
  const { view, setView, setSelectedDate } = useCalendar();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [popoverAppointment, setPopoverAppointment] = useState<Appointment | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 100, left: 100 });
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();
  const [defaultTime, setDefaultTime] = useState<string | undefined>();

  const handleNewAppointment = useCallback(() => {
    setEditingAppointment(null);
    setDefaultDate(undefined);
    setDefaultTime(undefined);
    setModalOpen(true);
  }, []);

  const handleSlotClick = useCallback((date: Date, time: string) => {
    setEditingAppointment(null);
    setDefaultDate(date);
    setDefaultTime(time);
    setModalOpen(true);
  }, []);

  const handleAppointmentClick = useCallback((appointment: Appointment, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement)?.getBoundingClientRect?.();
    setPopoverPosition({
      top: rect ? Math.min(rect.top, window.innerHeight - 500) : 200,
      left: rect ? Math.min(rect.right + 8, window.innerWidth - 340) : 200,
    });
    setPopoverAppointment(appointment);
  }, []);

  const handleEditFromPopover = useCallback((appointment: Appointment) => {
    setPopoverAppointment(null);
    setEditingAppointment(appointment);
    setModalOpen(true);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setView('day');
  }, [setSelectedDate, setView]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Kalendar</h2>
        <p className="text-sm text-gray-500 mt-1">Zakazivanje i pregled termina</p>
      </div>

      <CalendarToolbar
        onNewAppointment={handleNewAppointment}
        onToggleFilters={() => setFiltersOpen(!filtersOpen)}
        filtersOpen={filtersOpen}
      />

      {filtersOpen && <FilterPanel />}

      {/* Prikazi */}
      {view === 'week' && (
        <WeekView onAppointmentClick={handleAppointmentClick} onSlotClick={handleSlotClick} />
      )}
      {view === 'day' && (
        <DayView onAppointmentClick={handleAppointmentClick} onSlotClick={handleSlotClick} />
      )}
      {view === 'month' && (
        <MonthView onAppointmentClick={handleAppointmentClick} onDayClick={handleDayClick} />
      )}
      {view === 'agenda' && (
        <AgendaView onAppointmentClick={handleAppointmentClick} />
      )}

      {/* Modal za kreiranje/editovanje */}
      <AppointmentModal
        key={editingAppointment?.id || 'new'}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAppointment(null);
        }}
        editAppointment={editingAppointment}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
      />

      {/* Popover za brzi pregled */}
      {popoverAppointment && (
        <AppointmentPopover
          appointment={popoverAppointment}
          onClose={() => setPopoverAppointment(null)}
          onEdit={handleEditFromPopover}
          position={popoverPosition}
        />
      )}
    </div>
  );
}

export default function Calendar() {
  return <CalendarContent />;
}
