-- =============================================
-- IMPORT PROCEDURA I SISTEMA DUGOVANJA
-- Generisano iz Excel fajlova: dr Djordje, dr Sanja, Epilacija
-- =============================================

-- 1. Kreiranje tabela
-- =============================================

CREATE TABLE IF NOT EXISTS procedure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  doctor_name TEXT,
  datum DATE,
  procedura TEXT,
  cijena NUMERIC DEFAULT 0,
  nacin_placanja TEXT,
  napomena TEXT,
  izvor TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dugovanja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  iznos NUMERIC NOT NULL,
  preostalo NUMERIC NOT NULL,
  opis TEXT,
  datum_nastanka DATE,
  status TEXT DEFAULT 'aktivan' CHECK (status IN ('aktivan', 'placen', 'otpisan')),
  napomena TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uplate_duga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dugovanje_id UUID REFERENCES dugovanja(id) ON DELETE CASCADE,
  iznos NUMERIC NOT NULL,
  datum DATE DEFAULT CURRENT_DATE,
  nacin_placanja TEXT,
  napomena TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 2. Kreiranje pacijenata koji ne postoje
-- =============================================

INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Ajkovic', 'Gabriela', '067511702', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ajkovic') AND LOWER(prezime) = LOWER('Gabriela')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Aleksandra', 'Jokanovic Korac', '063483484', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Aleksandra') AND LOWER(prezime) = LOWER('Jokanovic Korac')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Aleksandra', 'Jokanovic-Korac', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Aleksandra') AND LOWER(prezime) = LOWER('Jokanovic-Korac')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Anastasija', 'Vujovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Anastasija') AND LOWER(prezime) = LOWER('Vujovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Andjela', 'Lucic', '068069643', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andjela') AND LOWER(prezime) = LOWER('Lucic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Andjela', 'Pejovic', '067756755', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andjela') AND LOWER(prezime) = LOWER('Pejovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Andjela', 'Popovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andjela') AND LOWER(prezime) = LOWER('Popovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Andrea', 'Kljajevic', '069612873', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andrea') AND LOWER(prezime) = LOWER('Kljajevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Andrea', 'Magdelinic', '068632712', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andrea') AND LOWER(prezime) = LOWER('Magdelinic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Andrea', 'Marojevic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andrea') AND LOWER(prezime) = LOWER('Marojevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Andrijana', 'Jurovicki', '067031772', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andrijana') AND LOWER(prezime) = LOWER('Jurovicki')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Anja', 'Jovanovic', '069303603', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Anja') AND LOWER(prezime) = LOWER('Jovanovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Anja', 'Maros', '067104744', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Anja') AND LOWER(prezime) = LOWER('Maros')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Anja', 'Zivanovic', '069156098', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Anja') AND LOWER(prezime) = LOWER('Zivanovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Anton', 'Jurovicki', '067031130', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Anton') AND LOWER(prezime) = LOWER('Jurovicki')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Belma', 'Djecevic', '352661977779', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Belma') AND LOWER(prezime) = LOWER('Djecevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Bogavac', 'Dijana', '069472286', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Bogavac') AND LOWER(prezime) = LOWER('Dijana')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Bojana', 'Maras', '068100603', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Bojana') AND LOWER(prezime) = LOWER('Maras')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Bulatovic', 'Tijana', '067052301', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Bulatovic') AND LOWER(prezime) = LOWER('Tijana')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Dalida', 'Mucic', '068448444', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Dalida') AND LOWER(prezime) = LOWER('Mucic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Danijel', 'Arnaut', '069414212', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Danijel') AND LOWER(prezime) = LOWER('Arnaut')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Danka', 'Knezevic', '069020390', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Danka') AND LOWER(prezime) = LOWER('Knezevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Dijana', 'Arsic', '068642588', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Dijana') AND LOWER(prezime) = LOWER('Arsic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Dina', 'Diglisic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Dina') AND LOWER(prezime) = LOWER('Diglisic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Djoljaj', 'Aleksandar', '068738005', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Djoljaj') AND LOWER(prezime) = LOWER('Aleksandar')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Djurisic', 'Ivona', '069838223', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Djurisic') AND LOWER(prezime) = LOWER('Ivona')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Djurovic', 'Biljana', '067255084', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Djurovic') AND LOWER(prezime) = LOWER('Biljana')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Djurovic', 'Tamara', '067310432', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Djurovic') AND LOWER(prezime) = LOWER('Tamara')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Dragana', 'Novakovic', '067645821', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Dragana') AND LOWER(prezime) = LOWER('Novakovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Ema', 'Kurgas', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ema') AND LOWER(prezime) = LOWER('Kurgas')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Eren', 'Acikqoz', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Eren') AND LOWER(prezime) = LOWER('Acikqoz')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Gabrijela', 'Ajkovic', '067511702', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Gabrijela') AND LOWER(prezime) = LOWER('Ajkovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Gordana', 'Stojanovic', '067744527', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Gordana') AND LOWER(prezime) = LOWER('Stojanovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Helena', 'Sinistajn', '067999760', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Helena') AND LOWER(prezime) = LOWER('Sinistajn')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Iskra', 'Zekovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Iskra') AND LOWER(prezime) = LOWER('Zekovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Ivana', 'Kovacevic', '069887711', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ivana') AND LOWER(prezime) = LOWER('Kovacevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Ivana', 'Kukric', '382641224051', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ivana') AND LOWER(prezime) = LOWER('Kukric')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Ivana', 'Mugosa', '067894603', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ivana') AND LOWER(prezime) = LOWER('Mugosa')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Ivana', 'Stankovic', '067669603', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ivana') AND LOWER(prezime) = LOWER('Stankovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Ivanovic', 'Ana', '067202020', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ivanovic') AND LOWER(prezime) = LOWER('Ana')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Iva', 'Milosevic Campar', '067400080', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Iva') AND LOWER(prezime) = LOWER('Milosevic Campar')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Iva', 'Puric', '067617473', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Iva') AND LOWER(prezime) = LOWER('Puric')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Iva', 'Zvicer', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Iva') AND LOWER(prezime) = LOWER('Zvicer')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jana', 'Cvijic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jana') AND LOWER(prezime) = LOWER('Cvijic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jasmina', 'Nikic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jasmina') AND LOWER(prezime) = LOWER('Nikic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jelena', 'Dejanova Zena', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Dejanova Zena')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jelena', 'Maras', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Maras')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jelena', 'Marunovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Marunovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jelena', 'Racic', '067287065', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Racic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jelena', 'Saveljic', '069814664', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Saveljic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jelena', 'Sekulic', '069962388', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Sekulic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jelena', 'Spaic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Spaic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jelena', 'Vidic', '068433383', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Vidic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jovana', 'Kostic', '067419777', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jovana') AND LOWER(prezime) = LOWER('Kostic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jovana', 'Mrvosevic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jovana') AND LOWER(prezime) = LOWER('Mrvosevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Jovanka', 'Rdicevic', '067399933', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jovanka') AND LOWER(prezime) = LOWER('Rdicevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Katarina', 'Boricic', '067189029', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Katarina') AND LOWER(prezime) = LOWER('Boricic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Katarina', 'Krstovic', '069795219', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Katarina') AND LOWER(prezime) = LOWER('Krstovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Kosta', 'Radonjic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Kosta') AND LOWER(prezime) = LOWER('Radonjic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Kostic', 'Jovana', '067419777', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Kostic') AND LOWER(prezime) = LOWER('Jovana')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Kristina', 'Markovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Kristina') AND LOWER(prezime) = LOWER('Markovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Kristina', 'Vucinic', '069215355', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Kristina') AND LOWER(prezime) = LOWER('Vucinic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Kuzman', 'Miruna', '069170694', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Kuzman') AND LOWER(prezime) = LOWER('Miruna')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Labovic', 'Milena', '067422922', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Labovic') AND LOWER(prezime) = LOWER('Milena')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Lala', 'Dubljevic', '068058356', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Lala') AND LOWER(prezime) = LOWER('Dubljevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Leila', 'Vujisic', '067022320', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Leila') AND LOWER(prezime) = LOWER('Vujisic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Lenka', 'Bobar', '067860489', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Lenka') AND LOWER(prezime) = LOWER('Bobar')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Lidija', 'Pavlovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Lidija') AND LOWER(prezime) = LOWER('Pavlovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Ljutica', 'Milena', '069835555', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ljutica') AND LOWER(prezime) = LOWER('Milena')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Maja', 'Milos', '068101941', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Maja') AND LOWER(prezime) = LOWER('Milos')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Maja', 'Petrovic', '067405868', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Maja') AND LOWER(prezime) = LOWER('Petrovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Maja', 'Prelevic', '069111818', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Maja') AND LOWER(prezime) = LOWER('Prelevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Maras', 'Jelena', '067185823', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Maras') AND LOWER(prezime) = LOWER('Jelena')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Marija', 'Dabic', '069776690', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Marija') AND LOWER(prezime) = LOWER('Dabic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Marina', 'Vukovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Marina') AND LOWER(prezime) = LOWER('Vukovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Markovic', 'Ivana', '067017775', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Markovic') AND LOWER(prezime) = LOWER('Ivana')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Megert', 'Stefana', '35795930469', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Megert') AND LOWER(prezime) = LOWER('Stefana')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Mia', 'Jovanovic', '069303533', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Mia') AND LOWER(prezime) = LOWER('Jovanovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milena', 'Jovicevic', '067385772', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milena') AND LOWER(prezime) = LOWER('Jovicevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milena', 'Ljutica', '069835555', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milena') AND LOWER(prezime) = LOWER('Ljutica')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milena', 'Radulovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milena') AND LOWER(prezime) = LOWER('Radulovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milena', 'Raicevic', '067909036', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milena') AND LOWER(prezime) = LOWER('Raicevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milena', 'Ucovic', '067652242', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milena') AND LOWER(prezime) = LOWER('Ucovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milica', 'Grdinic', '069711878', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milica') AND LOWER(prezime) = LOWER('Grdinic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milica', 'Lucic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milica') AND LOWER(prezime) = LOWER('Lucic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milica', 'Martinovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milica') AND LOWER(prezime) = LOWER('Martinovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milic', 'Zorka', '069700075', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milic') AND LOWER(prezime) = LOWER('Zorka')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milosevic', 'Campar Iva', '067400080', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milosevic') AND LOWER(prezime) = LOWER('Campar Iva')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milos', 'Kraljevic', '069303504', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milos') AND LOWER(prezime) = LOWER('Kraljevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Milos', 'Sakovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milos') AND LOWER(prezime) = LOWER('Sakovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Mina', 'Tomasevic', '069333097', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Mina') AND LOWER(prezime) = LOWER('Tomasevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Nadja', 'Pesic', '067809005', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Nadja') AND LOWER(prezime) = LOWER('Pesic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Nenezic', 'Milica', '069759749', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Nenezic') AND LOWER(prezime) = LOWER('Milica')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Nikola', 'Jabucanin', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Nikola') AND LOWER(prezime) = LOWER('Jabucanin')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Nikoleta', 'Perovic', '069875503', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Nikoleta') AND LOWER(prezime) = LOWER('Perovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Nikolija', 'Miranovic', '068874447', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Nikolija') AND LOWER(prezime) = LOWER('Miranovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Nikolina', 'Komeninic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Nikolina') AND LOWER(prezime) = LOWER('Komeninic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Obradovic', 'Jelena', '00393297787681', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Obradovic') AND LOWER(prezime) = LOWER('Jelena')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Pavlicevic', 'Vesna', '067527478', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Pavlicevic') AND LOWER(prezime) = LOWER('Vesna')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Pesic', 'Anja', '067425905', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Pesic') AND LOWER(prezime) = LOWER('Anja')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Petar', 'Belada', '067873380', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Petar') AND LOWER(prezime) = LOWER('Belada')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Petrovic', 'Maja', '067405868', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Petrovic') AND LOWER(prezime) = LOWER('Maja')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Poleksic', 'Filip', '067634638', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Poleksic') AND LOWER(prezime) = LOWER('Filip')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Popovic', 'Andjela', '069460778', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Popovic') AND LOWER(prezime) = LOWER('Andjela')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Radmila', 'Petrovic', '069915000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Radmila') AND LOWER(prezime) = LOWER('Petrovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Sandra', 'Dedic', '067443377', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sandra') AND LOWER(prezime) = LOWER('Dedic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Sanja', 'Besovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sanja') AND LOWER(prezime) = LOWER('Besovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Sanja', 'Rajkovic', '069018900', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sanja') AND LOWER(prezime) = LOWER('Rajkovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Scekic', 'Vileta', '069333036', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Scekic') AND LOWER(prezime) = LOWER('Vileta')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Senka', 'Zecevic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Senka') AND LOWER(prezime) = LOWER('Zecevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Sergej', 'Volkov', '067255211', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sergej') AND LOWER(prezime) = LOWER('Volkov')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Sladjana', 'Bulatovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sladjana') AND LOWER(prezime) = LOWER('Bulatovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Sladjana', 'Spanjevic', '067644040', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sladjana') AND LOWER(prezime) = LOWER('Spanjevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Smolovic', 'Milica', '067478557', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Smolovic') AND LOWER(prezime) = LOWER('Milica')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Sneza', 'Dubljevic', '068837123', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sneza') AND LOWER(prezime) = LOWER('Dubljevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Sofija', 'Bulatovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sofija') AND LOWER(prezime) = LOWER('Bulatovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Sonja', 'Bajraktarovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sonja') AND LOWER(prezime) = LOWER('Bajraktarovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Stanisic', 'Sara', '067483393', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Stanisic') AND LOWER(prezime) = LOWER('Sara')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Stojakovic', 'Katarina', '067030683', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Stojakovic') AND LOWER(prezime) = LOWER('Katarina')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Stojanovic', 'Gordana', '067744527', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Stojanovic') AND LOWER(prezime) = LOWER('Gordana')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Strugar', 'Andjela', '067873380', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Strugar') AND LOWER(prezime) = LOWER('Andjela')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Tea', 'Jovovic', '067842067', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Tea') AND LOWER(prezime) = LOWER('Jovovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Tijana', 'Delevic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Tijana') AND LOWER(prezime) = LOWER('Delevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Tomicic', 'Nena', '067355998', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Tomicic') AND LOWER(prezime) = LOWER('Nena')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Vanja', 'Scepanovic', '000', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Vanja') AND LOWER(prezime) = LOWER('Scepanovic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Vera', 'Milosevic', '067615501', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Vera') AND LOWER(prezime) = LOWER('Milosevic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Violeta', 'Scekic', '069333036', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Violeta') AND LOWER(prezime) = LOWER('Scekic')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Vojicic', 'Blazo', '067631610', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Vojicic') AND LOWER(prezime) = LOWER('Blazo')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Vujovic', 'Aleksandar', '067333971', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Vujovic') AND LOWER(prezime) = LOWER('Aleksandar')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Vulas', 'Vesna', '069673408', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Vulas') AND LOWER(prezime) = LOWER('Vesna')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Zana', 'Bajceta', '068853565', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Zana') AND LOWER(prezime) = LOWER('Bajceta')
);
INSERT INTO patients (ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'Zivkovic', 'Ivona', '067334994', 0, 0, 0, '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Zivkovic') AND LOWER(prezime) = LOWER('Ivona')
);


-- 3. Import procedura
-- =============================================

INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-03', '0,65ml alergan', 40.0, 'kes', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Spaic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-03', 'kontrola btx 0,45ml alergan', 0.0, 'kes', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sladjana') AND LOWER(p.prezime) = LOWER('Bulatovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-10', 'btx 3 regije- Alergan 1,2ml', 250.0, 'kes', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Belma') AND LOWER(p.prezime) = LOWER('Djecevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-10', 'alergan 1.5', 200.0, 'kes', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Violeta') AND LOWER(p.prezime) = LOWER('Scekic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-10', 'angkor 1ml', 130.0, 'kes', '100E KES', 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sladjana') AND LOWER(p.prezime) = LOWER('Bulatovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-11', 'twine- 2 flakona', 250.0, 'kartica', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sanja') AND LOWER(p.prezime) = LOWER('Rajkovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-11', 'egzozomi-2ml', 250.0, 'kes', '1.tretman', 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Danijel') AND LOWER(p.prezime) = LOWER('Arnaut') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-11', 'alergan 0,35ml', 0.0, 'kes', 'kontrola', 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Aleksandra') AND LOWER(p.prezime) = LOWER('Jokanovic Korac') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-11', 'Viskoderm skinKoe 2,5ml', 150.0, 'kes', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Vidic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-17', 'topljenje usana', 100.0, 'kes', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jovana') AND LOWER(p.prezime) = LOWER('Mrvosevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-18', 'angkor 1ml', 130.0, 'dug', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sofija') AND LOWER(p.prezime) = LOWER('Bulatovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-18', 'Stzlage S1ml', 250.0, 'dug', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sladjana') AND LOWER(p.prezime) = LOWER('Bulatovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-18', 'btx alergan 0,05ml+0.2 ml stilage M', 0.0, 'kes', 'kontrola', 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Aleksandra') AND LOWER(p.prezime) = LOWER('Jokanovic-Korac') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-24', 'kontrola btx 0,3ml', 0.0, 'kes', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Scekic') AND LOWER(p.prezime) = LOWER('Vileta') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-24', 'btxnabota 0,6ml', 100.0, 'kes', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Megert') AND LOWER(p.prezime) = LOWER('Stefana') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-25', 'kontrola', 0.0, 'kes', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Spaic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-25', 'kontrola', 0.0, 'kes', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jovana') AND LOWER(p.prezime) = LOWER('Mrvosevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-25', 'btxnabota 0,5ml', 0.0, 'kes', 'kontrola', 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Sekulic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-31', '3ml nabota - hiperhidroza saka', 250.0, 'kartica', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milica') AND LOWER(p.prezime) = LOWER('Lucic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Djordje Kaludjerovic', '2026-03-31', '0.5ml nabota - kontrola botoksa', 0.0, 'kes', NULL, 'dr Djordje Kaludjerovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sladjana') AND LOWER(p.prezime) = LOWER('Bulatovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-02', 'clear lift', 75.0, 'kes', 'dr Sanja rekla 75e', 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Gordana') AND LOWER(p.prezime) = LOWER('Stojanovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-02', 'kontola-predhodno uklanjanje bradavica', 0.0, 'kes', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Andjela') AND LOWER(p.prezime) = LOWER('Pejovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-02', 'kontr.pregled', 30.0, 'kes', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Dragana') AND LOWER(p.prezime) = LOWER('Novakovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2024-03-06', 'pregled', 0.0, 'kes', 'MilenIN ZET', 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Vojicic') AND LOWER(p.prezime) = LOWER('Blazo') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2024-03-06', 'lear skin', 160.0, 'kes', '0.2', 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Iskra') AND LOWER(p.prezime) = LOWER('Zekovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-09', 'pregled', 0.0, 'kes', 'povodom dana zena', 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Gabrijela') AND LOWER(p.prezime) = LOWER('Ajkovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-09', 'pregled mladeza', 0.0, 'kes', 'povodom dana zena', 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Saveljic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-09', 'kontrola', 0.0, 'kes', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Ucovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-13', 'clear skin', 200.0, 'kes', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Popovic') AND LOWER(p.prezime) = LOWER('Andjela') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-13', 'CLEAR SKIN', 200.0, 'poklon', 'POKL.VAUCER BR No015', 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Tomicic') AND LOWER(p.prezime) = LOWER('Nena') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-13', 'predhodno uklanjanje bradavica', 80.0, 'kartica', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Poleksic') AND LOWER(p.prezime) = LOWER('Filip') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-13', 'dvl', 135.0, 'kes', '10% dala dr', 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Vulas') AND LOWER(p.prezime) = LOWER('Vesna') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-16', 'dvl', 150.0, 'kes', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Pavlicevic') AND LOWER(p.prezime) = LOWER('Vesna') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-20', 'kontr.pregled', 30.0, 'kes', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Djoljaj') AND LOWER(p.prezime) = LOWER('Aleksandar') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-23', 'kontr.pregled', 30.0, 'kes', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Ajkovic') AND LOWER(p.prezime) = LOWER('Gabriela') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-23', 'pregled mladeza', 40.0, 'kartica', '0.2', 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Petrovic') AND LOWER(p.prezime) = LOWER('Maja') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-27', 'prvi pregled', 50.0, 'kes', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Eren') AND LOWER(p.prezime) = LOWER('Acikqoz') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-27', 'clear lift', 200.0, 'kartica', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Labovic') AND LOWER(p.prezime) = LOWER('Milena') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-28', 'clear skin', 200.0, 'kes', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sergej') AND LOWER(p.prezime) = LOWER('Volkov') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-28', 'clear skin', 200.0, 'kes', 'kes kucano', 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Ljutica') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-28', 'uklanjane vir.bradavica- do 5 promjena', 80.0, 'kes', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Violeta') AND LOWER(p.prezime) = LOWER('Scekic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Dr Sanja Vujanovic', '2026-03-28', 'uklanjanje vir.bradavica', 80.0, 'kes', NULL, 'dr Sanja Vujanovic'
FROM patients p WHERE LOWER(p.ime) = LOWER('Maja') AND LOWER(p.prezime) = LOWER('Prelevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-02', 'ep.pola nogu', 0.0, 'kes', 'placeno sve', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Racic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-03', 'ep. velikih regija', 0.0, 'kes', 'placeno sve', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Raicevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-03', 'ep. cijelog tijela', 445.0, 'kartica', 'dug 445 preostalo na trecem tretmanu', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Stojakovic') AND LOWER(p.prezime) = LOWER('Katarina') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-03', 'ep. cijelog tijela', 0.0, 'kes', 'placeno sve', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Djurovic') AND LOWER(p.prezime) = LOWER('Tamara') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-04', 'ep. intime', 50.0, 'kes', 'PLACA POJEDINACNO', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Andrea') AND LOWER(p.prezime) = LOWER('Magdelinic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-05', 'ep. velikih regija', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Ivana') AND LOWER(p.prezime) = LOWER('Stankovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-05', 'ep.malih regija', 0.0, 'kes', 'placeno sve', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Leila') AND LOWER(p.prezime) = LOWER('Vujisic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-05', 'ep. cijelog tijela', 0.0, 'kes', 'placeno sve', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Maras') AND LOWER(p.prezime) = LOWER('Jelena') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-05', 'ep. cijelog tijela', 0.0, 'kes', 'placeno sve', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Kuzman') AND LOWER(p.prezime) = LOWER('Miruna') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-06', 'ep. velikih regija', 0.0, 'kes', 'placeno sve', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Helena') AND LOWER(p.prezime) = LOWER('Sinistajn') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-06', 'ep. cijelo tijelo', 0.0, 'kes', 'placeno sve', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Andrijana') AND LOWER(p.prezime) = LOWER('Jurovicki') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-06', 'ep. velikih regija', 0.0, 'kes', 'placeno sve', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Jovicevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-06', 'ep.pazuh', 30.0, 'kartica', 'PLACA POJEDINACNO', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Smolovic') AND LOWER(p.prezime) = LOWER('Milica') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-06', 'ep. velikih regija', 0.0, 'kes', 'placeno sve', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Markovic') AND LOWER(p.prezime) = LOWER('Ivana') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-09', 'epilacija intimne regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Anja') AND LOWER(p.prezime) = LOWER('Jovanovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-09', 'epilacija malih regija', 0.0, 'kes', 'dug za paket za noge 250e', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Iva') AND LOWER(p.prezime) = LOWER('Puric') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-09', 'epilacija malih regija', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Bogavac') AND LOWER(p.prezime) = LOWER('Dijana') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-10', 'epil.pazuha,prepona i pola nogu', 180.0, 'kartica', 'dug jos 370e-to ce jos iz 2x', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milica') AND LOWER(p.prezime) = LOWER('Grdinic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-10', 'epilacija malih regija', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Nenezic') AND LOWER(p.prezime) = LOWER('Milica') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-11', 'epilacija gornji dio tijela', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milos') AND LOWER(p.prezime) = LOWER('Kraljevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-11', 'epilacija cijelo tijelo', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Radmila') AND LOWER(p.prezime) = LOWER('Petrovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-11', 'ep. cijelo tijelo', 0.0, 'kes', 'paket 7 tretmana-platit ce na sled.terminu', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Dijana') AND LOWER(p.prezime) = LOWER('Arsic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-12', 'epilacija pazuha', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sanja') AND LOWER(p.prezime) = LOWER('Besovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-12', 'epilacija pola nogu, intime i pazuha', 140.0, 'kartica', 'placa pojedinacno', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Lenka') AND LOWER(p.prezime) = LOWER('Bobar') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-12', 'epilacija velikih regija', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Anja') AND LOWER(p.prezime) = LOWER('Maros') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-12', 'epilacija lica', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Radulovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-12', 'ep.pazuha', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Ljutica') AND LOWER(p.prezime) = LOWER('Milena') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-12', 'ep.pazuha i prepona', 0.0, 'kes', 'na sledeci tretman plaxca', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Vanja') AND LOWER(p.prezime) = LOWER('Scepanovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-12', 'ep.pazuha i prepona', 100.0, 'kes', '200e na sledeco trettman', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Anastasija') AND LOWER(p.prezime) = LOWER('Vujovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-13', 'epilacija lica', 0.0, 'kes', 'placeno pola od paketa, danas drugi tretman', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Petar') AND LOWER(p.prezime) = LOWER('Belada') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-13', 'epilacija nogu, intime i pazuha', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Ivana') AND LOWER(p.prezime) = LOWER('Kukric') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-13', 'epilacija intimne regije', 50.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Mia') AND LOWER(p.prezime) = LOWER('Jovanovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-14', 'epilacija male regije', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Katarina') AND LOWER(p.prezime) = LOWER('Boricic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-14', 'epilacija velike regije', 0.0, 'kes', 'ima dug 375e', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Lidija') AND LOWER(p.prezime) = LOWER('Pavlovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-14', 'epilacija velike regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Anton') AND LOWER(p.prezime) = LOWER('Jurovicki') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-16', 'epilacija male regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Iva') AND LOWER(p.prezime) = LOWER('Zvicer') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-16', 'ep. cijelo tijelo', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Dina') AND LOWER(p.prezime) = LOWER('Diglisic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-16', 'ep. cijelo tijelo', 200.0, 'kes', 'odrazvanje', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Obradovic') AND LOWER(p.prezime) = LOWER('Jelena') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-17', 'ep. male regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sandra') AND LOWER(p.prezime) = LOWER('Dedic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-17', 'ep. cijelo tijelo', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Maja') AND LOWER(p.prezime) = LOWER('Prelevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-17', 'ep. male regije', 445.0, 'kes', 'platila cijeli paket ( druga rata placena)', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Lala') AND LOWER(p.prezime) = LOWER('Dubljevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-17', 'epilacija male regije', 0.0, 'kes', 'placen tretman', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Katarina') AND LOWER(p.prezime) = LOWER('Krstovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-17', 'epilacija velike regije', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Maras') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-18', 'ep[ilacija intime+pazuh', 30.0, 'kartica', 'epi.intima(dug jos 125e) pazuh placa pojedinacno', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Tijana') AND LOWER(p.prezime) = LOWER('Delevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-18', 'ep. velikih regija i male regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Andjela') AND LOWER(p.prezime) = LOWER('Popovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-18', 'epilacija male regije', 525.0, 'kartica', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Lidija') AND LOWER(p.prezime) = LOWER('Pavlovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-18', 'epilacija male regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Racic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-18', 'epilacija male regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Tea') AND LOWER(p.prezime) = LOWER('Jovovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-18', 'epilacija velike regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Strugar') AND LOWER(p.prezime) = LOWER('Andjela') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-18', 'epilacija male i velike regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Andrea') AND LOWER(p.prezime) = LOWER('Marojevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-18', 'ep. cijelo tijelo', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milic') AND LOWER(p.prezime) = LOWER('Zorka') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-18', 'ep. male regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Ivana') AND LOWER(p.prezime) = LOWER('Stankovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-19', 'epilacija male regije', 350.0, 'kartica', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Maja') AND LOWER(p.prezime) = LOWER('Petrovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-19', 'epilacija velike regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Zana') AND LOWER(p.prezime) = LOWER('Bajceta') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-19', 'ep.cijele ruke', 75.0, 'kes', 'PLACA POJEDINACNO', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jovanka') AND LOWER(p.prezime) = LOWER('Rdicevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-19', 'ep. pola nogu', 0.0, 'kes', 'platit ce paket sl.tretman', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Djurovic') AND LOWER(p.prezime) = LOWER('Biljana') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-19', 'ep.pola nogu', 0.0, 'kes', 'platit ce paket sl.tretman', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sneza') AND LOWER(p.prezime) = LOWER('Dubljevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-20', 'epilacija nogu', 0.0, 'kes', 'placeno pola od paketa', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Ivana') AND LOWER(p.prezime) = LOWER('Mugosa') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-20', 'ep. cijelo lice', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jana') AND LOWER(p.prezime) = LOWER('Cvijic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-20', 'ep. velike regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Andrea') AND LOWER(p.prezime) = LOWER('Kljajevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-20', 'ep. ruku', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sladjana') AND LOWER(p.prezime) = LOWER('Spanjevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-20', 'epilacija male regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Vujovic') AND LOWER(p.prezime) = LOWER('Aleksandar') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-20', 'epilacija male regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Markovic') AND LOWER(p.prezime) = LOWER('Ivana') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-20', 'epilacija male regije', 440.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Djurisic') AND LOWER(p.prezime) = LOWER('Ivona') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-21', 'ep. pazuha 1 tretman', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milosevic') AND LOWER(p.prezime) = LOWER('Campar Iva') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-21', 'ep. potkoljenica,intime i pazuha', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sanja') AND LOWER(p.prezime) = LOWER('Rajkovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-21', 'ep. velikih regija', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Vera') AND LOWER(p.prezime) = LOWER('Milosevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-21', 'ep. velikih regija', 0.0, 'kes', 'treba da plati 350e na termin koji je zakazan 09.05.2026.', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Marija') AND LOWER(p.prezime) = LOWER('Dabic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-23', 'ep. male regije', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Mina') AND LOWER(p.prezime) = LOWER('Tomasevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-23', 'epilacija velikih regija', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Dalida') AND LOWER(p.prezime) = LOWER('Mucic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-23', 'epilacija cijelog lica', 50.0, 'kes', 'preostalo jos 100e jer je na prvom tetmanu platila 100e', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Ivanovic') AND LOWER(p.prezime) = LOWER('Ana') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-24', 'ep. velikih regija', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sandra') AND LOWER(p.prezime) = LOWER('Dedic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-24', 'epilacija cijelo tijelo', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sonja') AND LOWER(p.prezime) = LOWER('Bajraktarovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-24', 'epilacija cijelo tijelo', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Kristina') AND LOWER(p.prezime) = LOWER('Vucinic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-25', 'ep. male regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Bojana') AND LOWER(p.prezime) = LOWER('Maras') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-25', 'ep. lica', 0.0, 'kes', '200e duga', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Maja') AND LOWER(p.prezime) = LOWER('Milos') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-25', 'ep. male regije', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Raicevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-25', 'ep. pola ruku', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Iva') AND LOWER(p.prezime) = LOWER('Milosevic Campar') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-25', 'ep.pazu pojedincno', 30.0, 'kes', 'pojedinacno placanje 30e', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Stanisic') AND LOWER(p.prezime) = LOWER('Sara') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-25', 'epilacija cijelo tijelo', 445.0, 'kartica', 'NA TRECEM DA PLATI JOS 445E', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Bulatovic') AND LOWER(p.prezime) = LOWER('Tijana') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-26', 'ep. male regije', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Nikoleta') AND LOWER(p.prezime) = LOWER('Perovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-26', 'ep. male regije', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Andrea') AND LOWER(p.prezime) = LOWER('Kljajevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-26', 'ep. nogu i prepona', 0.0, 'kes', 'DUG 350E treba da plati na tretman koji joj je 7.05.2026.', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Danka') AND LOWER(p.prezime) = LOWER('Knezevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-26', 'ep. malih regija', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Jovicevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-26', 'ep. male regije', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Kostic') AND LOWER(p.prezime) = LOWER('Jovana') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-26', 'ep. male regije', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Zivkovic') AND LOWER(p.prezime) = LOWER('Ivona') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-26', 'ep. male regije', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Pesic') AND LOWER(p.prezime) = LOWER('Anja') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-27', 'ep. malih regija', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Ema') AND LOWER(p.prezime) = LOWER('Kurgas') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-27', 'ep. malih regija', 25.0, 'kartica', 'PLACA POJEDINACNO', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Nikolija') AND LOWER(p.prezime) = LOWER('Miranovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-27', 'epi. velikih regija', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jovana') AND LOWER(p.prezime) = LOWER('Kostic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-27', 'ep.pazuha', 25.0, 'kartica', 'PLACA POJEDINACNO', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Stojanovic') AND LOWER(p.prezime) = LOWER('Gordana') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-28', 'ep.nausnica', 25.0, 'kartica', 'PLACA POJEDINACNO', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Marina') AND LOWER(p.prezime) = LOWER('Vukovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-28', 'ep.pazuha', 30.0, 'kes', 'pojedinacno placanje', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Kristina') AND LOWER(p.prezime) = LOWER('Markovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-28', 'ep.cijeko tijelo', 0.0, 'kes', 'placeno sve', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Leila') AND LOWER(p.prezime) = LOWER('Vujisic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-30', 'ep. male regije', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Andjela') AND LOWER(p.prezime) = LOWER('Lucic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-30', 'ep. malih regija', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Helena') AND LOWER(p.prezime) = LOWER('Sinistajn') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-30', 'ep.cijelo tijelo', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Ivana') AND LOWER(p.prezime) = LOWER('Kovacevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-30', 'ep. velike regije', 0.0, 'kes', NULL, 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Nadja') AND LOWER(p.prezime) = LOWER('Pesic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-31', 'ep. velikih regija', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Maja') AND LOWER(p.prezime) = LOWER('Petrovic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-31', 'ep. velikih regija', 0.0, 'kes', 'placen paket', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Lala') AND LOWER(p.prezime) = LOWER('Dubljevic') LIMIT 1;
INSERT INTO procedure_log (patient_id, doctor_name, datum, procedura, cijena, nacin_placanja, napomena, izvor)
SELECT p.id, 'Epilacija', '2026-03-31', 'ep cij.lice', 50.0, 'kes', 'pojedinacno placanje', 'Epilacija'
FROM patients p WHERE LOWER(p.ime) = LOWER('Anja') AND LOWER(p.prezime) = LOWER('Zivanovic') LIMIT 1;


-- 4. Dugovanja
-- =============================================

INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 445, 445, 'Epilacija cijelog tijela - preostalo na trecem tretmanu', '2026-03-03', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Stojakovic') AND LOWER(p.prezime) = LOWER('Katarina') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 250, 250, 'Dug za paket za noge', '2026-03-09', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Iva') AND LOWER(p.prezime) = LOWER('Puric') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 370, 370, 'Epilacija - dug jos 370e, placanje iz 2 rate', '2026-03-10', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milica') AND LOWER(p.prezime) = LOWER('Grdinic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 200, 200, '200e na sljedecem tretmanu', '2026-03-12', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Anastasija') AND LOWER(p.prezime) = LOWER('Vujovic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 125, 125, 'Placeno pola od paketa, preostalo 125e', '2026-03-13', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Petar') AND LOWER(p.prezime) = LOWER('Belada') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 375, 375, 'Dug 375e', '2026-03-14', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Lidija') AND LOWER(p.prezime) = LOWER('Pavlovic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 350, 350, 'Treba da plati 350e na termin 09.05.2026', '2026-03-21', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Marija') AND LOWER(p.prezime) = LOWER('Dabic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 125, 125, 'Epi.intima - dug jos 125e', '2026-03-18', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Tijana') AND LOWER(p.prezime) = LOWER('Delevic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 100, 100, 'Preostalo jos 100e', '2026-03-23', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Ana') AND LOWER(p.prezime) = LOWER('Ivanovic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 250, 250, 'Placeno pola od paketa, preostalo 250e', '2026-03-20', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Ivana') AND LOWER(p.prezime) = LOWER('Mugosa') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 700, 700, 'Dug epilacija 700e', '2026-03-25', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Maja') AND LOWER(p.prezime) = LOWER('Milos') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 445, 445, 'Epilacija cijelo tijelo - na trecem da plati jos 445e', '2026-03-25', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Bulatovic') AND LOWER(p.prezime) = LOWER('Tijana') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 350, 350, 'Dug 350e - treba da plati na tretman 07.05.2026', '2026-03-26', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Danka') AND LOWER(p.prezime) = LOWER('Knezevic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 380, 380, 'Angkor 1ml dug 130e + Stilage S1ml dug 250e', '2026-03-18', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sladjana') AND LOWER(p.prezime) = LOWER('Bulatovic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 130, 130, 'Angkor 1ml - dug 130e', '2026-03-18', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Sofija') AND LOWER(p.prezime) = LOWER('Bulatovic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 150, 150, 'Da plati jos 150e na treci tretman', '2026-03-01', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Nikola') AND LOWER(p.prezime) = LOWER('Jabucanin') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 550, 550, 'Dug 550e - placa na treci tretman', '2026-03-01', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Kosta') AND LOWER(p.prezime) = LOWER('Radonjic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 120, 120, '100e + 20e aknor', '2026-03-01', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Marunovic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 400, 400, '400e na terci tretman da plati epilacija', '2026-03-01', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milos') AND LOWER(p.prezime) = LOWER('Sakovic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 250, 250, '250e na treci tretman epileacija', '2026-03-01', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Zivkovic') AND LOWER(p.prezime) = LOWER('Ivona') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 600, 600, 'Epilacija - dug 600e', '2026-03-01', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jasmina') AND LOWER(p.prezime) = LOWER('Nikic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 280, 280, 'Epilacija - dug 280e', '2026-03-01', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Nikolina') AND LOWER(p.prezime) = LOWER('Komeninic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 1000, 1000, 'Epilacija - dug 1000e', '2026-03-01', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Milica') AND LOWER(p.prezime) = LOWER('Martinovic') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 200, 200, 'Epilacija - dug 200e', '2026-03-01', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Dejanova Zena') LIMIT 1;
INSERT INTO dugovanja (patient_id, iznos, preostalo, opis, datum_nastanka, status)
SELECT p.id, 250, 250, 'Epilacija - dug 250e', '2026-03-01', 'aktivan'
FROM patients p WHERE LOWER(p.ime) = LOWER('Senka') AND LOWER(p.prezime) = LOWER('Zecevic') LIMIT 1;