-- ============================================
-- Ministry of Aesthetics — Supabase Schema
-- ============================================

-- Korisnici sistema
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  ime TEXT NOT NULL,
  prezime TEXT NOT NULL,
  uloga TEXT NOT NULL DEFAULT 'recepcija' CHECK (uloga IN ('admin', 'menadzer', 'recepcija', 'ljekar', 'marketing')),
  doctor_id UUID,
  aktivan BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ustanova / klinika
CREATE TABLE IF NOT EXISTS establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv TEXT NOT NULL,
  adresa TEXT,
  grad TEXT,
  telefon TEXT,
  email TEXT,
  pib TEXT,
  pdv_broj TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ordinacije / oprema
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID REFERENCES establishments(id),
  naziv TEXT NOT NULL,
  tip TEXT DEFAULT 'ordinacija' CHECK (tip IN ('ordinacija', 'oprema')),
  boja TEXT DEFAULT '#6B7280',
  aktivan BOOLEAN DEFAULT true
);

-- Ljekari / specijalisti
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  ime TEXT NOT NULL,
  prezime TEXT NOT NULL,
  specijalizacija TEXT,
  titula TEXT,
  telefon TEXT,
  email TEXT,
  boja TEXT DEFAULT '#3B82F6',
  aktivan BOOLEAN DEFAULT true,
  biografija TEXT
);

-- Pacijenti
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ime TEXT NOT NULL,
  prezime TEXT NOT NULL,
  datum_rodjenja DATE,
  pol TEXT CHECK (pol IN ('muski', 'zenski', 'ostalo')),
  ime_roditelja TEXT,
  jmbg TEXT,
  telefon TEXT NOT NULL,
  email TEXT,
  adresa TEXT,
  grad TEXT,
  izvor_preporuke TEXT,
  detalji_preporuke TEXT,
  napomena TEXT,
  osiguranje TEXT,
  popust NUMERIC DEFAULT 0,
  pocetno_stanje NUMERIC DEFAULT 0,
  saldo NUMERIC DEFAULT 0,
  tagovi TEXT[] DEFAULT '{}',
  gdpr_saglasnost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kategorije usluga
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv TEXT NOT NULL,
  redoslijed INTEGER DEFAULT 0
);

-- Usluge
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategorija_id UUID REFERENCES service_categories(id),
  naziv TEXT NOT NULL,
  cijena NUMERIC NOT NULL DEFAULT 0,
  trajanje INTEGER DEFAULT 30,
  boja TEXT,
  aktivan BOOLEAN DEFAULT true
);

-- Termini
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES doctors(id),
  room_id UUID REFERENCES rooms(id),
  pocetak TIMESTAMPTZ NOT NULL,
  kraj TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'zakazan' CHECK (status IN ('zakazan', 'potvrdjen', 'stigao', 'u_toku', 'zavrsen', 'otkazan', 'nije_dosao')),
  napomena TEXT,
  osiguranje TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Usluge u terminu
CREATE TABLE IF NOT EXISTS appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  service_id UUID,
  naziv TEXT NOT NULL,
  cijena NUMERIC NOT NULL DEFAULT 0,
  kolicina INTEGER DEFAULT 1,
  popust NUMERIC DEFAULT 0,
  ukupno NUMERIC NOT NULL DEFAULT 0
);

-- Uplate
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  iznos NUMERIC NOT NULL,
  metoda TEXT DEFAULT 'gotovina' CHECK (metoda IN ('gotovina', 'gotovina_fiskalni', 'kartica_fiskalni', 'administrativna_zabrana', 'osiguranje', 'bon', 'online')),
  napomena TEXT,
  fiskalni_broj TEXT,
  fiskalni_status TEXT CHECK (fiskalni_status IN ('pending', 'success', 'failed', 'offline')),
  datum TIMESTAMPTZ DEFAULT now()
);

-- Notifikacije / SMS log
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  kanal TEXT DEFAULT 'sms' CHECK (kanal IN ('viber', 'sms', 'email')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'fallback_sms')),
  sadrzaj TEXT NOT NULL,
  tip TEXT CHECK (tip IN ('podsjetnik', 'potvrda', 'post_procedura', 'kontrola', 'kampanja', 'otkazivanje', 'potvrdjivanje')),
  error TEXT,
  datum_slanja TIMESTAMPTZ DEFAULT now(),
  datum_isporuke TIMESTAMPTZ
);

-- Raspored rada ljekara
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id),
  datum DATE NOT NULL,
  pocetak TIME NOT NULL,
  kraj TIME NOT NULL,
  tip TEXT DEFAULT 'standardno' CHECK (tip IN ('standardno', 'fleksibilno', 'neradni', 'odsustvo')),
  ponavljajuci BOOLEAN DEFAULT false,
  napomena TEXT
);

-- ============================================
-- Row Level Security (RLS) — basic setup
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;

-- Dozvoli anon korisniku da cita/pise sve (za demo/razvoj)
-- U produkciji zamijeni sa striktnim pravilima
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON doctors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON appointment_services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON service_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON establishments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON doctor_schedules FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Pocetni podaci
-- ============================================

-- Admin korisnik
INSERT INTO users (email, ime, prezime, uloga) VALUES
  ('admin@moa.me', 'Admin', 'MOA', 'admin');

-- Ustanova
INSERT INTO establishments (naziv, adresa, grad, telefon, email) VALUES
  ('Ministry of Aesthetics', 'Podgorica', 'Podgorica', '+38220123456', 'info@moa.me');

-- Ordinacije
INSERT INTO rooms (naziv, tip, boja) VALUES
  ('Ordinacija 1', 'ordinacija', '#2BA5A5'),
  ('Ordinacija 2', 'ordinacija', '#D4AA8C'),
  ('Laser', 'oprema', '#8B5CF6');

-- Ljekari
INSERT INTO doctors (ime, prezime, specijalizacija, titula, boja) VALUES
  ('Marija', 'Petrovic', 'Dermatologija', 'Dr', '#2BA5A5'),
  ('Ana', 'Jovanovic', 'Estetska medicina', 'Dr', '#D4AA8C');

-- Kategorije usluga
INSERT INTO service_categories (naziv, redoslijed) VALUES
  ('Estetski tretmani', 1),
  ('Dermatologija', 2),
  ('Laser tretmani', 3);

-- Usluge
INSERT INTO services (kategorija_id, naziv, cijena, trajanje) VALUES
  ((SELECT id FROM service_categories WHERE naziv = 'Estetski tretmani'), 'Botox', 150, 30),
  ((SELECT id FROM service_categories WHERE naziv = 'Estetski tretmani'), 'Fileri', 200, 45),
  ((SELECT id FROM service_categories WHERE naziv = 'Estetski tretmani'), 'Mezoterapija', 120, 60),
  ((SELECT id FROM service_categories WHERE naziv = 'Dermatologija'), 'Dermatoskopija', 50, 20),
  ((SELECT id FROM service_categories WHERE naziv = 'Dermatologija'), 'Konsultacija', 30, 15),
  ((SELECT id FROM service_categories WHERE naziv = 'Laser tretmani'), 'Laser epilacija', 80, 45),
  ((SELECT id FROM service_categories WHERE naziv = 'Laser tretmani'), 'Laser podmladjivanje', 180, 60);
