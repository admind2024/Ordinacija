import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { addDays, addWeeks, addMonths, isWithinInterval, parseISO } from 'date-fns';
import type { Appointment, AppointmentStatus, Doctor, Room, Service, ServiceCategory } from '../types';
import { supabase } from '../lib/supabase';

export type CalendarView = 'day' | 'week' | 'month' | 'agenda';
export type ColorSource = 'doctor' | 'status' | 'room';

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

interface CalendarFilters {
  doctorIds: string[];
  roomIds: string[];
  colorSource: ColorSource;
}

interface CalendarContextType {
  selectedDate: Date;
  view: CalendarView;
  filters: CalendarFilters;
  appointments: Appointment[];
  doctors: Doctor[];
  rooms: Room[];
  services: Service[];
  serviceCategories: ServiceCategory[];
  loading: boolean;

  setSelectedDate: (date: Date) => void;
  setView: (view: CalendarView) => void;
  goToToday: () => void;
  goForward: () => void;
  goBack: () => void;

  toggleDoctorFilter: (doctorId: string) => void;
  toggleRoomFilter: (roomId: string) => void;
  setColorSource: (source: ColorSource) => void;
  selectAllDoctors: () => void;
  deselectAllDoctors: () => void;

  createAppointment: (appointment: Omit<Appointment, 'id' | 'created_at'>) => Promise<Appointment | null>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;

  getFilteredAppointments: (start: Date, end: Date) => Appointment[];
  getAppointmentColor: (appointment: Appointment) => string;

  smsLog: SmsLogEntry[];
  addSmsLog: (entry: SmsLogEntry) => void;

  refreshData: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [smsLog, setSmsLog] = useState<SmsLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CalendarFilters>({
    doctorIds: [],
    roomIds: [],
    colorSource: 'doctor',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [doctorsRes, roomsRes, servicesRes, categoriesRes, appointmentsRes, smsLogRes] = await Promise.all([
      supabase.from('doctors').select('*').eq('aktivan', true),
      supabase.from('rooms').select('*').eq('aktivan', true),
      supabase.from('services').select('*').eq('aktivan', true),
      supabase.from('service_categories').select('*').order('redoslijed'),
      supabase.from('appointments').select('*, appointment_services(*)').order('pocetak', { ascending: true }),
      supabase.from('notifications').select('*').order('datum_slanja', { ascending: false }).limit(100),
    ]);

    const fetchedDoctors = (doctorsRes.data || []) as Doctor[];
    const fetchedRooms = (roomsRes.data || []) as Room[];

    setDoctors(fetchedDoctors);
    setRooms(fetchedRooms);
    setServices((servicesRes.data || []).map((s: any) => ({
      ...s,
      cijena: Number(s.cijena) || 0,
    })) as Service[]);
    setServiceCategories((categoriesRes.data || []) as ServiceCategory[]);

    const aptsWithServices = (appointmentsRes.data || []).map((apt: any) => ({
      ...apt,
      services: (apt.appointment_services || []).map((s: any) => ({
        ...s,
        cijena: Number(s.cijena) || 0,
        popust: Number(s.popust) || 0,
        ukupno: Number(s.ukupno) || 0,
      })),
    }));
    setAppointments(aptsWithServices as Appointment[]);

    // SMS log from notifications table
    const smsEntries: SmsLogEntry[] = (smsLogRes.data || [])
      .filter((n: any) => n.kanal === 'sms')
      .map((n: any) => ({
        id: n.id,
        patient: n.patient_id || '',
        phone: '',
        text: n.sadrzaj,
        status: n.status === 'sent' || n.status === 'delivered' ? 'sent' as const : 'failed' as const,
        error: n.error,
        datum: n.datum_slanja,
        tip: n.tip || 'potvrda',
      }));
    setSmsLog(smsEntries);

    // Set filters to include all doctors/rooms
    setFilters((prev) => ({
      ...prev,
      doctorIds: prev.doctorIds.length === 0 ? fetchedDoctors.map((d) => d.id) : prev.doctorIds,
      roomIds: prev.roomIds.length === 0 ? fetchedRooms.map((r) => r.id) : prev.roomIds,
    }));

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    setFilters((prev) => ({ ...prev, doctorIds: doctors.map((d) => d.id) }));
  }, [doctors]);

  const deselectAllDoctors = useCallback(() => {
    setFilters((prev) => ({ ...prev, doctorIds: [] }));
  }, []);

  const createAppointment = useCallback(async (appointment: Omit<Appointment, 'id' | 'created_at'>) => {
    const { services: aptServices, patient, doctor, room, payments, ...aptData } = appointment as any;

    const { data, error } = await supabase
      .from('appointments')
      .insert(aptData)
      .select()
      .single();

    if (error) {
      console.error('Greska pri kreiranju termina:', error);
      return null;
    }

    // Insert appointment services
    if (aptServices && aptServices.length > 0) {
      const servicesWithAptId = aptServices.map((s: any) => ({
        appointment_id: data.id,
        service_id: s.service_id,
        naziv: s.naziv,
        cijena: s.cijena,
        kolicina: s.kolicina || 1,
        popust: s.popust || 0,
        ukupno: s.ukupno,
      }));

      await supabase.from('appointment_services').insert(servicesWithAptId);
    }

    const newApt = { ...data, services: aptServices || [] } as Appointment;
    setAppointments((prev) => [...prev, newApt]);
    return newApt;
  }, []);

  const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>) => {
    const { services: aptServices, patient, doctor, room, payments, ...updateData } = updates as any;

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Greska pri azuriranju termina:', error);
      return;
    }

    // Update services if provided
    if (aptServices) {
      await supabase.from('appointment_services').delete().eq('appointment_id', id);
      if (aptServices.length > 0) {
        const servicesWithAptId = aptServices.map((s: any) => ({
          appointment_id: id,
          service_id: s.service_id,
          naziv: s.naziv,
          cijena: s.cijena,
          kolicina: s.kolicina || 1,
          popust: s.popust || 0,
          ukupno: s.ukupno,
        }));
        await supabase.from('appointment_services').insert(servicesWithAptId);
      }
    }

    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, ...updates } : apt))
    );
  }, []);

  const deleteAppointment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Greska pri brisanju termina:', error);
      return;
    }

    setAppointments((prev) => prev.filter((apt) => apt.id !== id));
  }, []);

  const updateAppointmentStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Greska pri azuriranju statusa:', error);
      return;
    }

    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
    );
  }, []);

  const addSmsLog = useCallback(async (entry: SmsLogEntry) => {
    // Save to notifications table
    await supabase.from('notifications').insert({
      patient_id: null,
      kanal: 'sms',
      status: entry.status === 'sent' ? 'sent' : 'failed',
      sadrzaj: entry.text,
      tip: entry.tip,
      error: entry.error,
    });

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
        const doctor = doctors.find((d) => d.id === appointment.doctor_id);
        return doctor?.boja || '#6B7280';
      }
      if (colorSource === 'room') {
        const roomObj = rooms.find((r) => r.id === appointment.room_id);
        return roomObj?.boja || '#6B7280';
      }
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
    [filters, doctors, rooms]
  );

  return (
    <CalendarContext.Provider
      value={{
        selectedDate, view, filters, appointments,
        doctors, rooms, services, serviceCategories, loading,
        setSelectedDate, setView, goToToday, goForward, goBack,
        toggleDoctorFilter, toggleRoomFilter, setColorSource,
        selectAllDoctors, deselectAllDoctors,
        createAppointment, updateAppointment, deleteAppointment, updateAppointmentStatus,
        getFilteredAppointments, getAppointmentColor,
        smsLog, addSmsLog,
        refreshData: fetchData,
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
