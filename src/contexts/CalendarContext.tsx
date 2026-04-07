import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { addDays, addWeeks, addMonths, isWithinInterval, parseISO } from 'date-fns';
import type { Appointment, AppointmentStatus } from '../types';
import { generateDemoAppointments, demoDoctors, demoRooms } from '../data/demo';

export interface SmsLogEntry {
  id: string;
  patient: string;
  phone: string;
  text: string;
  status: 'sent' | 'failed';
  error?: string;
  datum: string;
  tip: 'potvrda' | 'podsjetnik' | 'otkazivanje' | 'potvrdjivanje';
}

export type CalendarView = 'day' | 'week' | 'month' | 'agenda';
export type ColorSource = 'doctor' | 'status' | 'room';

interface CalendarFilters {
  doctorIds: string[];
  roomIds: string[];
  colorSource: ColorSource;
}

interface CalendarContextType {
  // Stanje
  selectedDate: Date;
  view: CalendarView;
  filters: CalendarFilters;
  appointments: Appointment[];

  // Navigacija
  setSelectedDate: (date: Date) => void;
  setView: (view: CalendarView) => void;
  goToToday: () => void;
  goForward: () => void;
  goBack: () => void;

  // Filteri
  toggleDoctorFilter: (doctorId: string) => void;
  toggleRoomFilter: (roomId: string) => void;
  setColorSource: (source: ColorSource) => void;
  selectAllDoctors: () => void;
  deselectAllDoctors: () => void;

  // CRUD
  createAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;

  // Helperi
  getFilteredAppointments: (start: Date, end: Date) => Appointment[];
  getAppointmentColor: (appointment: Appointment) => string;

  // SMS Log
  smsLog: SmsLogEntry[];
  addSmsLog: (entry: SmsLogEntry) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [appointments, setAppointments] = useState<Appointment[]>(generateDemoAppointments);
  const [smsLog, setSmsLog] = useState<SmsLogEntry[]>([]);
  const [filters, setFilters] = useState<CalendarFilters>({
    doctorIds: demoDoctors.map((d) => d.id),
    roomIds: demoRooms.map((r) => r.id),
    colorSource: 'doctor',
  });

  const goToToday = useCallback(() => setSelectedDate(new Date()), []);

  const goForward = useCallback(() => {
    setSelectedDate((prev) => {
      switch (view) {
        case 'day': return addDays(prev, 1);
        case 'week': return addWeeks(prev, 1);
        case 'month': return addMonths(prev, 1);
        case 'agenda': return addWeeks(prev, 1);
      }
    });
  }, [view]);

  const goBack = useCallback(() => {
    setSelectedDate((prev) => {
      switch (view) {
        case 'day': return addDays(prev, -1);
        case 'week': return addWeeks(prev, -1);
        case 'month': return addMonths(prev, -1);
        case 'agenda': return addWeeks(prev, -1);
      }
    });
  }, [view]);

  const toggleDoctorFilter = useCallback((doctorId: string) => {
    setFilters((prev) => ({
      ...prev,
      doctorIds: prev.doctorIds.includes(doctorId)
        ? prev.doctorIds.filter((id) => id !== doctorId)
        : [...prev.doctorIds, doctorId],
    }));
  }, []);

  const toggleRoomFilter = useCallback((roomId: string) => {
    setFilters((prev) => ({
      ...prev,
      roomIds: prev.roomIds.includes(roomId)
        ? prev.roomIds.filter((id) => id !== roomId)
        : [...prev.roomIds, roomId],
    }));
  }, []);

  const setColorSource = useCallback((source: ColorSource) => {
    setFilters((prev) => ({ ...prev, colorSource: source }));
  }, []);

  const selectAllDoctors = useCallback(() => {
    setFilters((prev) => ({ ...prev, doctorIds: demoDoctors.map((d) => d.id) }));
  }, []);

  const deselectAllDoctors = useCallback(() => {
    setFilters((prev) => ({ ...prev, doctorIds: [] }));
  }, []);

  const createAppointment = useCallback((appointment: Appointment) => {
    setAppointments((prev) => [...prev, appointment]);
  }, []);

  const updateAppointment = useCallback((id: string, updates: Partial<Appointment>) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, ...updates } : apt))
    );
  }, []);

  const deleteAppointment = useCallback((id: string) => {
    setAppointments((prev) => prev.filter((apt) => apt.id !== id));
  }, []);

  const updateAppointmentStatus = useCallback((id: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
    );
  }, []);

  const addSmsLog = useCallback((entry: SmsLogEntry) => {
    setSmsLog((prev) => [entry, ...prev]);
  }, []);

  const getFilteredAppointments = useCallback(
    (start: Date, end: Date) => {
      return appointments.filter((apt) => {
        const aptDate = parseISO(apt.pocetak);
        const inRange = isWithinInterval(aptDate, { start, end });
        const doctorMatch = filters.doctorIds.includes(apt.doctor_id);
        const roomMatch = filters.roomIds.includes(apt.room_id);
        return inRange && doctorMatch && roomMatch;
      });
    },
    [appointments, filters]
  );

  const getAppointmentColor = useCallback(
    (appointment: Appointment) => {
      const { colorSource } = filters;
      if (colorSource === 'doctor') {
        const doctor = demoDoctors.find((d) => d.id === appointment.doctor_id);
        return doctor?.boja || '#6B7280';
      }
      if (colorSource === 'room') {
        const room = demoRooms.find((r) => r.id === appointment.room_id);
        return room?.boja || '#6B7280';
      }
      // status
      const statusColors: Record<string, string> = {
        zakazan: '#3B82F6',
        potvrdjen: '#22C55E',
        stigao: '#A855F7',
        u_toku: '#F97316',
        zavrsen: '#15803D',
        otkazan: '#EF4444',
        nije_dosao: '#9CA3AF',
      };
      return statusColors[appointment.status] || '#6B7280';
    },
    [filters]
  );

  return (
    <CalendarContext.Provider
      value={{
        selectedDate, view, filters, appointments,
        setSelectedDate, setView, goToToday, goForward, goBack,
        toggleDoctorFilter, toggleRoomFilter, setColorSource,
        selectAllDoctors, deselectAllDoctors,
        createAppointment, updateAppointment, deleteAppointment, updateAppointmentStatus,
        getFilteredAppointments, getAppointmentColor,
        smsLog, addSmsLog,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) throw new Error('useCalendar mora biti koristen unutar CalendarProvider-a');
  return context;
}
