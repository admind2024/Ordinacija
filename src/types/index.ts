// ============================================
// Medicinska Platforma — TypeScript tipovi
// ============================================

// Korisnicke uloge
export type UserRole = 'admin' | 'menadzer' | 'recepcija' | 'ljekar' | 'marketing';

// Korisnik sistema
export interface User {
  id: string;
  email: string;
  ime: string;
  prezime: string;
  uloga: UserRole;
  doctor_id?: string;
  aktivan: boolean;
  created_at: string;
}

// Ustanova / klinika
export interface Establishment {
  id: string;
  naziv: string;
  adresa: string;
  grad: string;
  telefon: string;
  email: string;
  pib: string;
  pdv_broj?: string;
  logo_url?: string;
  created_at: string;
}

// Ordinacija / oprema
export interface Room {
  id: string;
  establishment_id: string;
  naziv: string;
  tip: 'ordinacija' | 'oprema';
  boja: string;
  aktivan: boolean;
}

// Ljekar / specijalista
export interface Doctor {
  id: string;
  user_id: string;
  ime: string;
  prezime: string;
  specijalizacija: string;
  titula?: string;
  telefon?: string;
  email?: string;
  boja: string;
  aktivan: boolean;
  biografija?: string;
  pin?: string;
}

// Pacijent
export interface Patient {
  id: string;
  ime: string;
  prezime: string;
  datum_rodjenja?: string;
  pol?: 'muski' | 'zenski' | 'ostalo';
  ime_roditelja?: string;
  jmbg?: string;
  telefon: string;
  email?: string;
  adresa?: string;
  grad?: string;
  izvor_preporuke?: string;
  detalji_preporuke?: string;
  napomena?: string;
  osiguranje?: string;
  popust: number;
  pocetno_stanje: number;
  saldo: number;
  tagovi: string[];
  gdpr_saglasnost: boolean;
  created_at: string;
}

// Kategorija usluga
export interface ServiceCategory {
  id: string;
  naziv: string;
  redoslijed: number;
}

// Usluga iz kataloga
export interface Service {
  id: string;
  kategorija_id: string;
  naziv: string;
  cijena: number;
  trajanje: number; // u minutama
  boja?: string;
  materijali_sablon?: MaterialTemplate[];
  aktivan: boolean;
}

// Sablon utroska materijala po usluzi
export interface MaterialTemplate {
  material_id: string;
  naziv: string;
  kolicina: number;
  jedinica: string;
}

// Status termina
export type AppointmentStatus =
  | 'zakazan'
  | 'potvrdjen'
  | 'stigao'
  | 'u_toku'
  | 'zavrsen'
  | 'otkazan'
  | 'nije_dosao';

// Termin
export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  room_id: string;
  pocetak: string;
  kraj: string;
  status: AppointmentStatus;
  napomena?: string;
  osiguranje?: string;
  created_at: string;
  // Relacije (opcionalno popunjene)
  patient?: Patient;
  doctor?: Doctor;
  room?: Room;
  services?: AppointmentService[];
  payments?: Payment[];
}

// Usluga u terminu
export interface AppointmentService {
  id: string;
  appointment_id: string;
  service_id: string;
  naziv: string;
  cijena: number;
  kolicina: number;
  popust: number;
  ukupno: number;
}

// Nacin placanja
export type PaymentMethod =
  | 'gotovina'
  | 'gotovina_fiskalni'
  | 'kartica_fiskalni'
  | 'administrativna_zabrana'
  | 'osiguranje'
  | 'bon'
  | 'online';

// Uplata
export interface Payment {
  id: string;
  appointment_id: string;
  iznos: number;
  metoda: PaymentMethod;
  napomena?: string;
  fiskalni_broj?: string;
  fiskalni_status?: 'pending' | 'success' | 'failed' | 'offline';
  datum: string;
}

// Materijal
export interface Material {
  id: string;
  naziv: string;
  opis?: string;
  kategorija?: string;
  jedinica_mjere: string;
  dobavljac?: string;
  nabavna_cijena: number;
  min_kolicina: number;
  trenutna_kolicina: number;
  barkod?: string;
}

// Utrosak materijala
export interface MaterialUsage {
  id: string;
  appointment_id: string;
  material_id: string;
  kolicina: number;
  ljekar_id: string;
  lotovski_broj?: string;
  datum: string;
}

// Raspored rada ljekara
export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  datum: string;
  pocetak: string;
  kraj: string;
  tip: 'standardno' | 'fleksibilno' | 'neradni' | 'odsustvo';
  ponavljajuci: boolean;
  napomena?: string;
}

// Dogadjaj u kalendaru (blokiranje)
export interface CalendarEvent {
  id: string;
  naslov: string;
  boja: string;
  room_id?: string;
  pocetak: string;
  kraj: string;
  opis?: string;
  ucesnici: string[]; // doctor_ids
}

// Notifikacija
export type NotificationChannel = 'viber' | 'sms' | 'email';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'fallback_sms';

export interface Notification {
  id: string;
  patient_id: string;
  appointment_id?: string;
  kanal: NotificationChannel;
  status: NotificationStatus;
  sadrzaj: string;
  tip: 'podsjetnik' | 'potvrda' | 'post_procedura' | 'kontrola' | 'kampanja';
  datum_slanja: string;
  datum_isporuke?: string;
  fallback_kanal?: NotificationChannel;
}

// Marketing kampanja
export interface Campaign {
  id: string;
  naziv: string;
  opis?: string;
  kanal: NotificationChannel;
  status: 'draft' | 'zakazana' | 'u_toku' | 'zavrsena';
  sadrzaj: string;
  ciljna_grupa: Record<string, unknown>;
  zakazano_slanje?: string;
  poslano: number;
  isporuceno: number;
  neuspjelo: number;
  created_at: string;
}

// Pregled / medicinski nalaz
export type ExaminationStatus = 'draft' | 'zavrsen';

export interface Examination {
  id: string;
  appointment_id?: string;
  patient_id: string;
  doctor_id: string;
  datum: string;
  razlog_dolaska?: string;
  nalaz?: string;
  terapija?: string;
  preporuke?: string;
  kontrolni_pregled?: string;
  napomena?: string;
  status: ExaminationStatus;
  created_at: string;
  updated_at: string;
  // Relacije
  patient?: Patient;
  doctor?: Doctor;
}

// Historijski log procedura (import iz Excel-a)
export interface ProcedureLog {
  id: string;
  patient_id: string;
  doctor_name: string;
  datum: string;
  procedura: string;
  cijena: number;
  nacin_placanja?: string;
  napomena?: string;
  izvor: string;
  created_at: string;
}

// Dugovanje pacijenta
export type DugovanjeStatus = 'aktivan' | 'placen' | 'otpisan';

export interface Dugovanje {
  id: string;
  patient_id: string;
  iznos: number;
  preostalo: number;
  opis?: string;
  datum_nastanka: string;
  status: DugovanjeStatus;
  napomena?: string;
  created_at: string;
  // Relacije
  patient?: Patient;
  uplate?: UplataDuga[];
}

// Uplata na dug (rata)
export interface UplataDuga {
  id: string;
  dugovanje_id: string;
  iznos: number;
  datum: string;
  nacin_placanja?: string;
  napomena?: string;
  created_at: string;
}

// Boje statusa termina
export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  zakazan: '#3B82F6',     // plava
  potvrdjen: '#22C55E',   // zelena
  stigao: '#A855F7',      // ljubicasta
  u_toku: '#F97316',      // narandzasta
  zavrsen: '#15803D',     // tamnozelena
  otkazan: '#EF4444',     // crvena
  nije_dosao: '#9CA3AF',  // siva
};

// Labele statusa
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  zakazan: 'Zakazan',
  potvrdjen: 'Potvrđen',
  stigao: 'Pacijent stigao',
  u_toku: 'U toku',
  zavrsen: 'Završen',
  otkazan: 'Otkazan',
  nije_dosao: 'Nije se pojavio',
};
