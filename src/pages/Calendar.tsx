import { useState, useCallback, useEffect } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import CalendarToolbar from '../components/calendar/CalendarToolbar';
import FilterPanel from '../components/calendar/FilterPanel';
import StatusLegend from '../components/calendar/StatusLegend';
import WeekView from '../components/calendar/WeekView';
import DayView from '../components/calendar/DayView';
import MonthView from '../components/calendar/MonthView';
import AgendaView from '../components/calendar/AgendaView';
import AppointmentModal from '../components/calendar/AppointmentModal';
import AppointmentPopover from '../components/calendar/AppointmentPopover';
import type { Appointment } from '../types';

function CalendarContent() {
  const { view, setView, setSelectedDate } = useCalendar();

  // Na mobilnom: uvijek forsiraj agenda view i postavi selectedDate = danas
  // da pacijentu/adminu odmah pokazemo aktuelni dan (kao quick-reaction tool)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      if (view !== 'agenda') setView('agenda');
      setSelectedDate(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [popoverAppointment, setPopoverAppointment] = useState<Appointment | null>(null);
  const [, setPopoverPosition] = useState({ top: 100, left: 100 });
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
      <CalendarToolbar
        onNewAppointment={handleNewAppointment}
        onToggleFilters={() => setFiltersOpen(!filtersOpen)}
        filtersOpen={filtersOpen}
      />

      {filtersOpen && <FilterPanel />}

      <StatusLegend />

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
        key={editingAppointment?.id || `new-${defaultDate?.toISOString() ?? ''}-${defaultTime ?? ''}`}
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
        />
      )}
    </div>
  );
}

export default function Calendar() {
  return <CalendarContent />;
}
