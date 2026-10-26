-- Sabloni teksta za polja pregleda (anamneza, nalaz, terapija...).
-- doctor_id = NULL znaci zajednicki sablon za sve ljekare.
CREATE TABLE IF NOT EXISTS pregled_sabloni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polje TEXT NOT NULL CHECK (polje IN ('razlog_dolaska', 'nalaz', 'rezultati', 'terapija', 'preporuke')),
  naziv TEXT NOT NULL,
  tekst TEXT NOT NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  koristeno INTEGER NOT NULL DEFAULT 0,      -- za sortiranje po ucestalosti
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pregled_sabloni_polje_idx ON pregled_sabloni(polje, doctor_id);

-- Isti model pristupa kao ostale tabele aplikacije (vidi napomenu o auth-u u replica/build-log.md).
ALTER TABLE pregled_sabloni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON pregled_sabloni;
CREATE POLICY "Allow all for anon" ON pregled_sabloni FOR ALL USING (true) WITH CHECK (true);
