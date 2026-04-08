import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { addDays, addWeeks, addMonths, isWithinInterval, parseISO } from 'date-fns';
import type { Appointment, AppointmentStatus, Doctor, Room, Service, ServiceCategory, Material } from '../types';
import { supabase } from '../lib/supabase';
import { useAutoReminders } from '../hooks/useAutoReminders';

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
  materials: Material[];
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

  // Doctor CRUD
  createDoctor: (doctor: Omit<Doctor, 'id'>) => Promise<Doctor | null>;
  updateDoctor: (id: string, updates: Partial<Doctor>) => Promise<void>;
  deleteDoctor: (id: string) => Promise<void>;

  // Service CRUD
  createService: (service: Omit<Service, 'id'>) => Promise<Service | null>;
  updateService: (id: string, updates: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  // Material CRUD
  createMaterial: (material: Omit<Material, 'id'>) => Promise<Material | null>;
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;

  // Service Category CRUD
  createServiceCategory: (cat: Omit<ServiceCategory, 'id'>) => Promise<ServiceCategory | null>;
  updateServiceCategory: (id: string, updates: Partial<ServiceCategory>) => Promise<void>;
  deleteServiceCategory: (id: string) => Promise<void>;

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
  const [materials, setMaterials] = useState<Material[]>([]);
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

    const [doctorsRes, roomsRes, servicesRes, categoriesRes, appointmentsRes, smsLogRes, materialsRes] = await Promise.all([
      supabase.from('doctors').select('*').eq('aktivan', true),
      supabase.from('rooms').select('*').eq('aktivan', true),
      supabase.from('services').select('*').eq('aktivan', true),
      supabase.from('service_categories').select('*').order('redoslijed'),
      supabase.from('appointments').select('*, appointment_services(*), patient:patients(ime, prezime, telefon)').order('pocetak', { ascending: true }),
      supabase.from('notifications').select('*').order('datum_slanja', { ascending: false }).limit(500),
      supabase.from('materials').select('*').eq('aktivan', true).order('naziv'),
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
    setMaterials((materialsRes.data || []) as Material[]);

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
        patient: n.patient_ime || n.patient_id || '',
        phone: n.patient_telefon || '',
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

  // ===== Doctor CRUD =====
  const createDoctor = useCallback(async (doctor: Omit<Doctor, 'id'>) => {
    const { data, error } = await supabase.from('doctors').insert(doctor).select().single();
    if (error) { console.error('Greska pri kreiranju ljekara:', error); return null; }
    setDoctors((prev) => [...prev, data as Doctor]);
    return data as Doctor;
  }, []);

  const updateDoctor = useCallback(async (id: string, updates: Partial<Doctor>) => {
    const { error } = await supabase.from('doctors').update(updates).eq('id', id);
    if (error) { console.error('Greska pri azuriranju ljekara:', error); return; }
    setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  }, []);

  const deleteDoctor = useCallback(async (id: string) => {
    const { error } = await supabase.from('doctors').update({ aktivan: false }).eq('id', id);
    if (error) { console.error('Greska pri brisanju ljekara:', error); return; }
    setDoctors((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // ===== Service CRUD =====
  const createService = useCallback(async (service: Omit<Service, 'id'>) => {
    const { data, error } = await supabase.from('services').insert(service).select().single();
    if (error) { console.error('Greska pri kreiranju usluge:', error); return null; }
    const svc = { ...data, cijena: Number(data.cijena) || 0 } as Service;
    setServices((prev) => [...prev, svc]);
    return svc;
  }, []);

  const updateService = useCallback(async (id: string, updates: Partial<Service>) => {
    const { error } = await supabase.from('services').update(updates).eq('id', id);
    if (error) { console.error('Greska pri azuriranju usluge:', error); return; }
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const deleteService = useCallback(async (id: string) => {
    const { error } = await supabase.from('services').update({ aktivan: false }).eq('id', id);
    if (error) { console.error('Greska pri brisanju usluge:', error); return; }
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ===== Material CRUD =====
  const createMaterial = useCallback(async (material: Omit<Material, 'id'>) => {
    const { data, error } = await supabase.from('materials').insert(material).select().single();
    if (error) { console.error('Greska pri kreiranju materijala:', error); return null; }
    setMaterials((prev) => [...prev, data as Material]);
    return data as Material;
  }, []);

  const updateMaterial = useCallback(async (id: string, updates: Partial<Material>) => {
    const { error } = await supabase.from('materials').update(updates).eq('id', id);
    if (error) { console.error('Greska pri azuriranju materijala:', error); return; }
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const deleteMaterial = useCallback(async (id: string) => {
    const { error } = await supabase.from('materials').update({ aktivan: false }).eq('id', id);
    if (error) { console.error('Greska pri brisanju materijala:', error); return; }
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ===== Service Category CRUD =====
  const createServiceCategory = useCallback(async (cat: Omit<ServiceCategory, 'id'>) => {
    const { data, error } = await supabase.from('service_categories').insert(cat).select().single();
    if (error) { console.error('Greska pri kreiranju kategorije:', error); return null; }
    setServiceCategories((prev) => [...prev, data as ServiceCategory]);
    return data as ServiceCategory;
  }, []);

  const updateServiceCategory = useCallback(async (id: string, updates: Partial<ServiceCategory>) => {
    const { error } = await supabase.from('service_categories').update(updates).eq('id', id);
    if (error) { console.error('Greska pri azuriranju kategorije:', error); return; }
    setServiceCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteServiceCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from('service_categories').delete().eq('id', id);
    if (error) { console.error('Greska pri brisanju kategorije:', error); return; }
    setServiceCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Automatski SMS podsjetnici
  useAutoReminders(appointments);

  return (
    <CalendarContext.Provider
      value={{
        selectedDate, view, filters, appointments,
        doctors, rooms, services, serviceCategories, materials, loading,
        setSelectedDate, setView, goToToday, goForward, goBack,
        toggleDoctorFilter, toggleRoomFilter, setColorSource,
        selectAllDoctors, deselectAllDoctors,
        createAppointment, updateAppointment, deleteAppointment, updateAppointmentStatus,
        getFilteredAppointments, getAppointmentColor,
        smsLog, addSmsLog,
        createDoctor, updateDoctor, deleteDoctor,
        createMaterial, updateMaterial, deleteMaterial,
        createService, updateService, deleteService,
        createServiceCategory, updateServiceCategory, deleteServiceCategory,
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
