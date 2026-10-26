-- Karton pacijenta: alergije, faktori rizika, dijagnoze (MKB-10) i dokumenta.

CREATE TABLE IF NOT EXISTS pacijent_alergije (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  naziv TEXT NOT NULL,
  tezina TEXT NOT NULL DEFAULT 'nepoznato' CHECK (tezina IN ('blaga', 'umjerena', 'teska', 'nepoznato')),
  reakcija TEXT,
  od_datum DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pacijent_alergije_patient_idx ON pacijent_alergije(patient_id);

CREATE TABLE IF NOT EXISTS pacijent_rizici (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tip TEXT NOT NULL,        -- npr. trudnoca, antikoagulansi, keloidi (lista u src/lib/karton.ts)
  opis TEXT,
  od_datum DATE,
  aktivan BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pacijent_rizici_patient_idx ON pacijent_rizici(patient_id);

CREATE TABLE IF NOT EXISTS pacijent_dijagnoze (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  mkb_sifra TEXT NOT NULL,
  naziv TEXT NOT NULL,
  tip TEXT NOT NULL DEFAULT 'licna' CHECK (tip IN ('licna', 'porodicna')),
  datum DATE NOT NULL DEFAULT current_date,
  examination_id UUID REFERENCES examinations(id) ON DELETE SET NULL,
  napomena TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pacijent_dijagnoze_patient_idx ON pacijent_dijagnoze(patient_id, datum DESC);

CREATE TABLE IF NOT EXISTS pacijent_dokumenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  naziv TEXT NOT NULL,
  tip TEXT NOT NULL DEFAULT 'opsti'
    CHECK (tip IN ('opsti', 'nalaz', 'saglasnost', 'foto_prije', 'foto_poslije', 'ostalo')),
  opis TEXT,
  putanja TEXT NOT NULL UNIQUE,   -- kljuc u storage bucket-u moa-dokumenti
  mime TEXT,
  velicina BIGINT,
  datum DATE NOT NULL DEFAULT current_date,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pacijent_dokumenti_patient_idx ON pacijent_dokumenti(patient_id, datum DESC);

-- Privatni bucket (nije javan); fajlovi se otvaraju kratkotrajnim potpisanim linkom.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('moa-dokumenti', 'moa-dokumenti', false, 20971520,
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic',
              'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Isti model pristupa kao ostale tabele aplikacije (vidi napomenu o auth-u u replica/build-log.md).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['pacijent_alergije', 'pacijent_rizici', 'pacijent_dijagnoze', 'pacijent_dokumenti'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow all for anon" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "moa_dokumenti_all" ON storage.objects;
CREATE POLICY "moa_dokumenti_all" ON storage.objects FOR ALL
  USING (bucket_id = 'moa-dokumenti') WITH CHECK (bucket_id = 'moa-dokumenti');
