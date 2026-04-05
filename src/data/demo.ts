import type {
  Doctor,
  Patient,
  Room,
  Service,
  ServiceCategory,
  Appointment,
  AppointmentService,
} from '../types';
import { addDays, setHours, setMinutes } from 'date-fns';

// ============================================
// Demo ljekari
// ============================================
export const demoDoctors: Doctor[] = [
  {
    id: 'doc-1',
    user_id: 'user-1',
    ime: 'Elma',
    prezime: 'Sujkovic',
    specijalizacija: 'Dermatologija',
    titula: 'Dr.',
    telefon: '+382 67 111 001',
    email: 'elma@ordinacija.me',
    boja: '#3B82F6',
    aktivan: true,
  },
  {
    id: 'doc-2',
    user_id: 'user-2',
    ime: 'Sanja',
    prezime: 'Vujanovic',
    specijalizacija: 'Estetska medicina',
    titula: 'Dr.',
    telefon: '+382 67 111 002',
    email: 'sanja@ordinacija.me',
    boja: '#8B5CF6',
    aktivan: true,
  },
  {
    id: 'doc-3',
    user_id: 'user-3',
    ime: 'Milena',
    prezime: 'Marovic Bogdanovic',
    specijalizacija: 'Stomatologija',
    titula: '',
    telefon: '+382 67 111 003',
    email: 'milena@ordinacija.me',
    boja: '#EC4899',
    aktivan: true,
  },
  {
    id: 'doc-4',
    user_id: 'user-4',
    ime: 'Djordje',
    prezime: 'Kaludjerovic',
    specijalizacija: 'Estetska hirurgija',
    titula: 'Dr.',
    telefon: '+382 67 111 004',
    email: 'djordje@ordinacija.me',
    boja: '#F59E0B',
    aktivan: true,
  },
  {
    id: 'doc-5',
    user_id: 'user-5',
    ime: 'Radivoje',
    prezime: 'Papic',
    specijalizacija: 'Endodoncija',
    titula: 'Dr.',
    telefon: '+382 67 111 005',
    email: 'radivoje@ordinacija.me',
    boja: '#10B981',
    aktivan: true,
  },
];

// ============================================
// Demo ordinacije / oprema
// ============================================
export const demoRooms: Room[] = [
  { id: 'room-1', establishment_id: 'est-1', naziv: 'Stomatologija', tip: 'ordinacija', boja: '#6366F1', aktivan: true },
  { id: 'room-2', establishment_id: 'est-1', naziv: 'Alma Soprano Titanium', tip: 'oprema', boja: '#EC4899', aktivan: true },
  { id: 'room-3', establishment_id: 'est-1', naziv: 'Dermatologija', tip: 'ordinacija', boja: '#3B82F6', aktivan: true },
  { id: 'room-4', establishment_id: 'est-1', naziv: 'EXION', tip: 'oprema', boja: '#F59E0B', aktivan: true },
  { id: 'room-5', establishment_id: 'est-1', naziv: 'EMFACE', tip: 'oprema', boja: '#10B981', aktivan: true },
  { id: 'room-6', establishment_id: 'est-1', naziv: 'EM Sculpt Neo', tip: 'oprema', boja: '#8B5CF6', aktivan: true },
  { id: 'room-7', establishment_id: 'est-1', naziv: 'Harmony XL Pro', tip: 'oprema', boja: '#EF4444', aktivan: true },
];

// ============================================
// Demo kategorije usluga
// ============================================
export const demoServiceCategories: ServiceCategory[] = [
  { id: 'cat-1', naziv: 'Dermatologija', redoslijed: 1 },
  { id: 'cat-2', naziv: 'Botox', redoslijed: 2 },
  { id: 'cat-3', naziv: 'Stomatologija', redoslijed: 3 },
  { id: 'cat-4', naziv: 'Estetska stomatologija', redoslijed: 4 },
  { id: 'cat-5', naziv: 'Laser tretmani', redoslijed: 5 },
  { id: 'cat-6', naziv: 'EM Face', redoslijed: 6 },
  { id: 'cat-7', naziv: 'EM Sculpt Neo', redoslijed: 7 },
  { id: 'cat-8', naziv: 'Endodoncija', redoslijed: 8 },
];

// ============================================
// Demo usluge
// ============================================
export const demoServices: Service[] = [
  { id: 'svc-1', kategorija_id: 'cat-1', naziv: 'Dermatoloski pregled', cijena: 40, trajanje: 30, boja: '#3B82F6', aktivan: true },
  { id: 'svc-2', kategorija_id: 'cat-2', naziv: 'Botox - celo', cijena: 150, trajanje: 30, boja: '#8B5CF6', aktivan: true },
  { id: 'svc-3', kategorija_id: 'cat-2', naziv: 'Botox - oko ociju', cijena: 120, trajanje: 20, boja: '#8B5CF6', aktivan: true },
  { id: 'svc-4', kategorija_id: 'cat-3', naziv: 'Kontrolni pregled', cijena: 25, trajanje: 15, boja: '#EC4899', aktivan: true },
  { id: 'svc-5', kategorija_id: 'cat-3', naziv: 'Plombiranje zuba', cijena: 50, trajanje: 45, boja: '#EC4899', aktivan: true },
  { id: 'svc-6', kategorija_id: 'cat-4', naziv: 'Izbjeljivanje zuba', cijena: 200, trajanje: 60, boja: '#F59E0B', aktivan: true },
  { id: 'svc-7', kategorija_id: 'cat-5', naziv: 'Laser epilacija - noge', cijena: 180, trajanje: 60, boja: '#EF4444', aktivan: true },
  { id: 'svc-8', kategorija_id: 'cat-5', naziv: 'Laser epilacija - lice', cijena: 80, trajanje: 30, boja: '#EF4444', aktivan: true },
  { id: 'svc-9', kategorija_id: 'cat-6', naziv: 'EMFACE tretman', cijena: 250, trajanje: 45, boja: '#10B981', aktivan: true },
  { id: 'svc-10', kategorija_id: 'cat-7', naziv: 'EM Sculpt Neo - abdomen', cijena: 300, trajanje: 30, boja: '#8B5CF6', aktivan: true },
  { id: 'svc-11', kategorija_id: 'cat-1', naziv: 'Dermatoskopija', cijena: 60, trajanje: 20, boja: '#3B82F6', aktivan: true },
  { id: 'svc-12', kategorija_id: 'cat-8', naziv: 'Lijecenje kanala', cijena: 120, trajanje: 60, boja: '#10B981', aktivan: true },
  { id: 'svc-13', kategorija_id: 'cat-5', naziv: 'Harmony XL Pro - podmladjivanje', cijena: 350, trajanje: 45, boja: '#EF4444', aktivan: true },
  { id: 'svc-14', kategorija_id: 'cat-2', naziv: 'Hijaluronski fileri', cijena: 280, trajanje: 45, boja: '#8B5CF6', aktivan: true },
];

// ============================================
// Demo pacijenti
// ============================================
export const demoPatients: Patient[] = [
  { id: 'pat-1', ime: 'Marko', prezime: 'Petrovic', datum_rodjenja: '1985-03-15', pol: 'muski', telefon: '+382 67 200 001', email: 'marko@email.com', grad: 'Niksic', izvor_preporuke: 'Google', popust: 0, pocetno_stanje: 0, saldo: 0, tagovi: ['Redovan'], gdpr_saglasnost: true, created_at: '2025-01-10T08:00:00Z' },
  { id: 'pat-2', ime: 'Ana', prezime: 'Jovanovic', datum_rodjenja: '1992-07-22', pol: 'zenski', telefon: '+382 67 200 002', email: 'ana@email.com', grad: 'Podgorica', izvor_preporuke: 'Instagram', popust: 10, pocetno_stanje: 0, saldo: -50, tagovi: ['VIP'], gdpr_saglasnost: true, created_at: '2024-11-05T08:00:00Z' },
  { id: 'pat-3', ime: 'Nikola', prezime: 'Djukanovic', datum_rodjenja: '1978-11-03', pol: 'muski', telefon: '+382 67 200 003', grad: 'Niksic', izvor_preporuke: 'Preporuka prijatelja', popust: 0, pocetno_stanje: 0, saldo: 0, tagovi: [], gdpr_saglasnost: true, created_at: '2025-02-20T08:00:00Z' },
  { id: 'pat-4', ime: 'Jelena', prezime: 'Vukovic', datum_rodjenja: '1995-01-18', pol: 'zenski', telefon: '+382 67 200 004', email: 'jelena@email.com', grad: 'Bar', izvor_preporuke: 'Facebook', popust: 5, pocetno_stanje: 100, saldo: 100, tagovi: ['Redovan'], gdpr_saglasnost: true, created_at: '2024-09-12T08:00:00Z' },
  { id: 'pat-5', ime: 'Stefan', prezime: 'Markovic', datum_rodjenja: '1988-06-30', pol: 'muski', telefon: '+382 67 200 005', grad: 'Niksic', izvor_preporuke: 'Prolaznik', popust: 0, pocetno_stanje: 0, saldo: 0, tagovi: [], gdpr_saglasnost: true, created_at: '2025-03-01T08:00:00Z' },
  { id: 'pat-6', ime: 'Milica', prezime: 'Radovic', datum_rodjenja: '2001-09-11', pol: 'zenski', telefon: '+382 67 200 006', email: 'milica@email.com', grad: 'Herceg Novi', izvor_preporuke: 'Instagram', popust: 0, pocetno_stanje: 0, saldo: 0, tagovi: [], gdpr_saglasnost: true, created_at: '2025-03-15T08:00:00Z' },
  { id: 'pat-7', ime: 'Petar', prezime: 'Ivanovic', datum_rodjenja: '1970-12-25', pol: 'muski', telefon: '+382 67 200 007', grad: 'Niksic', izvor_preporuke: 'Preporuka prijatelja', popust: 0, pocetno_stanje: 0, saldo: -120, tagovi: ['Problematican'], gdpr_saglasnost: true, created_at: '2024-06-01T08:00:00Z' },
  { id: 'pat-8', ime: 'Tamara', prezime: 'Bulatovic', datum_rodjenja: '1998-04-07', pol: 'zenski', telefon: '+382 67 200 008', email: 'tamara@email.com', grad: 'Podgorica', izvor_preporuke: 'Google', popust: 15, pocetno_stanje: 0, saldo: 0, tagovi: ['VIP', 'Redovan'], gdpr_saglasnost: true, created_at: '2024-08-20T08:00:00Z' },
  { id: 'pat-9', ime: 'Luka', prezime: 'Savic', datum_rodjenja: '2010-02-14', pol: 'muski', ime_roditelja: 'Dragan Savic', telefon: '+382 67 200 009', grad: 'Niksic', izvor_preporuke: 'Preporuka prijatelja', popust: 0, pocetno_stanje: 0, saldo: 0, tagovi: ['Djeca'], gdpr_saglasnost: true, created_at: '2025-01-30T08:00:00Z' },
  { id: 'pat-10', ime: 'Ivana', prezime: 'Krivokapic', datum_rodjenja: '1983-08-19', pol: 'zenski', telefon: '+382 67 200 010', email: 'ivana@email.com', grad: 'Niksic', izvor_preporuke: 'Instagram', popust: 0, pocetno_stanje: 200, saldo: 200, tagovi: ['VIP'], gdpr_saglasnost: true, created_at: '2024-07-15T08:00:00Z' },
  { id: 'pat-11', ime: 'Darko', prezime: 'Popovic', datum_rodjenja: '1990-05-28', pol: 'muski', telefon: '+382 67 200 011', grad: 'Cetinje', izvor_preporuke: 'Google', popust: 0, pocetno_stanje: 0, saldo: 0, tagovi: [], gdpr_saglasnost: true, created_at: '2025-02-10T08:00:00Z' },
  { id: 'pat-12', ime: 'Maja', prezime: 'Lazovic', datum_rodjenja: '1996-10-02', pol: 'zenski', telefon: '+382 67 200 012', email: 'maja@email.com', grad: 'Budva', izvor_preporuke: 'Facebook', popust: 0, pocetno_stanje: 0, saldo: 0, tagovi: ['Redovan'], gdpr_saglasnost: true, created_at: '2025-01-05T08:00:00Z' },
];

// ============================================
// Generisanje demo termina oko danasnjeg datuma
// ============================================
function createDateTime(dayOffset: number, hour: number, minute: number): string {
  const date = addDays(new Date(), dayOffset);
  return setMinutes(setHours(date, hour), minute).toISOString();
}

function createAppointmentService(serviceId: string, svc: Service): AppointmentService {
  return {
    id: `as-${serviceId}-${Math.random().toString(36).slice(2, 8)}`,
    appointment_id: '',
    service_id: serviceId,
    naziv: svc.naziv,
    cijena: svc.cijena,
    kolicina: 1,
    popust: 0,
    ukupno: svc.cijena,
  };
}

export function generateDemoAppointments(): Appointment[] {
  const today = new Date().getDay(); // 0=ned, 1=pon...
  const mondayOffset = today === 0 ? -6 : 1 - today;

  const appointments: Appointment[] = [
    // Ponedeljak
    {
      id: 'apt-1', patient_id: 'pat-1', doctor_id: 'doc-1', room_id: 'room-3',
      pocetak: createDateTime(mondayOffset, 9, 0), kraj: createDateTime(mondayOffset, 9, 30),
      status: 'zavrsen', napomena: 'Redovna kontrola', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-1', demoServices[0])],
    },
    {
      id: 'apt-2', patient_id: 'pat-2', doctor_id: 'doc-2', room_id: 'room-3',
      pocetak: createDateTime(mondayOffset, 10, 0), kraj: createDateTime(mondayOffset, 10, 30),
      status: 'zavrsen', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-2', demoServices[1])],
    },
    {
      id: 'apt-3', patient_id: 'pat-3', doctor_id: 'doc-3', room_id: 'room-1',
      pocetak: createDateTime(mondayOffset, 11, 0), kraj: createDateTime(mondayOffset, 11, 45),
      status: 'zavrsen', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-5', demoServices[4])],
    },
    // Utorak
    {
      id: 'apt-4', patient_id: 'pat-4', doctor_id: 'doc-1', room_id: 'room-3',
      pocetak: createDateTime(mondayOffset + 1, 8, 30), kraj: createDateTime(mondayOffset + 1, 9, 0),
      status: 'zavrsen', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-11', demoServices[10])],
    },
    {
      id: 'apt-5', patient_id: 'pat-5', doctor_id: 'doc-4', room_id: 'room-2',
      pocetak: createDateTime(mondayOffset + 1, 10, 0), kraj: createDateTime(mondayOffset + 1, 11, 0),
      status: 'potvrdjen', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-7', demoServices[6])],
    },
    {
      id: 'apt-6', patient_id: 'pat-6', doctor_id: 'doc-2', room_id: 'room-5',
      pocetak: createDateTime(mondayOffset + 1, 14, 0), kraj: createDateTime(mondayOffset + 1, 14, 45),
      status: 'zakazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-9', demoServices[8])],
    },
    // Srijeda
    {
      id: 'apt-7', patient_id: 'pat-7', doctor_id: 'doc-5', room_id: 'room-1',
      pocetak: createDateTime(mondayOffset + 2, 9, 0), kraj: createDateTime(mondayOffset + 2, 10, 0),
      status: 'zakazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-12', demoServices[11])],
    },
    {
      id: 'apt-8', patient_id: 'pat-8', doctor_id: 'doc-2', room_id: 'room-3',
      pocetak: createDateTime(mondayOffset + 2, 11, 0), kraj: createDateTime(mondayOffset + 2, 11, 45),
      status: 'potvrdjen', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-14', demoServices[13])],
    },
    {
      id: 'apt-9', patient_id: 'pat-9', doctor_id: 'doc-3', room_id: 'room-1',
      pocetak: createDateTime(mondayOffset + 2, 13, 0), kraj: createDateTime(mondayOffset + 2, 13, 15),
      status: 'zakazan', napomena: 'Dijete, dolazi sa ocem', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-4', demoServices[3])],
    },
    // Cetvrtak
    {
      id: 'apt-10', patient_id: 'pat-10', doctor_id: 'doc-1', room_id: 'room-7',
      pocetak: createDateTime(mondayOffset + 3, 9, 0), kraj: createDateTime(mondayOffset + 3, 9, 45),
      status: 'zakazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-13', demoServices[12])],
    },
    {
      id: 'apt-11', patient_id: 'pat-11', doctor_id: 'doc-4', room_id: 'room-6',
      pocetak: createDateTime(mondayOffset + 3, 10, 30), kraj: createDateTime(mondayOffset + 3, 11, 0),
      status: 'zakazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-10', demoServices[9])],
    },
    {
      id: 'apt-12', patient_id: 'pat-12', doctor_id: 'doc-3', room_id: 'room-1',
      pocetak: createDateTime(mondayOffset + 3, 14, 0), kraj: createDateTime(mondayOffset + 3, 15, 0),
      status: 'zakazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-6', demoServices[5])],
    },
    // Petak
    {
      id: 'apt-13', patient_id: 'pat-1', doctor_id: 'doc-2', room_id: 'room-3',
      pocetak: createDateTime(mondayOffset + 4, 9, 0), kraj: createDateTime(mondayOffset + 4, 9, 30),
      status: 'zakazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-3', demoServices[2])],
    },
    {
      id: 'apt-14', patient_id: 'pat-4', doctor_id: 'doc-1', room_id: 'room-2',
      pocetak: createDateTime(mondayOffset + 4, 11, 0), kraj: createDateTime(mondayOffset + 4, 11, 30),
      status: 'zakazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-8', demoServices[7])],
    },
    {
      id: 'apt-15', patient_id: 'pat-2', doctor_id: 'doc-5', room_id: 'room-1',
      pocetak: createDateTime(mondayOffset + 4, 13, 0), kraj: createDateTime(mondayOffset + 4, 14, 0),
      status: 'zakazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-12', demoServices[11])],
    },
    // Dodatni termini za gustinu
    {
      id: 'apt-16', patient_id: 'pat-8', doctor_id: 'doc-1', room_id: 'room-3',
      pocetak: createDateTime(mondayOffset, 14, 0), kraj: createDateTime(mondayOffset, 14, 30),
      status: 'otkazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-1', demoServices[0])],
    },
    {
      id: 'apt-17', patient_id: 'pat-6', doctor_id: 'doc-3', room_id: 'room-1',
      pocetak: createDateTime(mondayOffset + 1, 15, 0), kraj: createDateTime(mondayOffset + 1, 15, 45),
      status: 'nije_dosao', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-5', demoServices[4])],
    },
    {
      id: 'apt-18', patient_id: 'pat-10', doctor_id: 'doc-4', room_id: 'room-4',
      pocetak: createDateTime(mondayOffset + 2, 15, 0), kraj: createDateTime(mondayOffset + 2, 15, 30),
      status: 'zakazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-10', demoServices[9])],
    },
    {
      id: 'apt-19', patient_id: 'pat-3', doctor_id: 'doc-2', room_id: 'room-3',
      pocetak: createDateTime(mondayOffset + 3, 16, 0), kraj: createDateTime(mondayOffset + 3, 16, 45),
      status: 'zakazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-14', demoServices[13])],
    },
    {
      id: 'apt-20', patient_id: 'pat-5', doctor_id: 'doc-1', room_id: 'room-3',
      pocetak: createDateTime(mondayOffset + 4, 15, 0), kraj: createDateTime(mondayOffset + 4, 15, 20),
      status: 'zakazan', created_at: new Date().toISOString(),
      services: [createAppointmentService('svc-11', demoServices[10])],
    },
  ];

  // Postavi appointment_id na svaki AppointmentService
  appointments.forEach((apt) => {
    apt.services?.forEach((s) => {
      s.appointment_id = apt.id;
    });
  });

  return appointments;
}
