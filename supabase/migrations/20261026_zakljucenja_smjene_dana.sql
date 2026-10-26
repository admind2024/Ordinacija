-- Zakljucenje smjene (svaka osoba zatvara svoju naplatu) i zakljucenje radnog dana (menadzer).
CREATE TABLE IF NOT EXISTS zakljucenja_dana (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum DATE NOT NULL UNIQUE,
  zbir JSONB NOT NULL DEFAULT '{}'::jsonb,         -- iznos po nacinu placanja
  ukupno NUMERIC(10, 2) NOT NULL DEFAULT 0,
  broj_uplata INTEGER NOT NULL DEFAULT 0,
  prodaja_vaucera NUMERIC(10, 2) NOT NULL DEFAULT 0,
  gotovina_ocekivana NUMERIC(10, 2) NOT NULL DEFAULT 0,
  gotovina_prebrojana NUMERIC(10, 2),
  razlika NUMERIC(10, 2),
  nenaplaceni_termini INTEGER NOT NULL DEFAULT 0,  -- zavrseni termini bez uplate tog dana
  napomena TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zakljucenja_smjene (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- ko zatvara (naplatio)
  vrijeme_od TIMESTAMPTZ NOT NULL,
  vrijeme_do TIMESTAMPTZ NOT NULL,
  zbir JSONB NOT NULL DEFAULT '{}'::jsonb,
  ukupno NUMERIC(10, 2) NOT NULL DEFAULT 0,
  broj_uplata INTEGER NOT NULL DEFAULT 0,
  prodaja_vaucera NUMERIC(10, 2) NOT NULL DEFAULT 0,
  gotovina_ocekivana NUMERIC(10, 2) NOT NULL DEFAULT 0,
  gotovina_prebrojana NUMERIC(10, 2),
  razlika NUMERIC(10, 2),
  napomena TEXT,
  zakljucenje_dana_id UUID REFERENCES zakljucenja_dana(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (vrijeme_do > vrijeme_od)
);
CREATE INDEX IF NOT EXISTS zakljucenja_smjene_user_idx ON zakljucenja_smjene(user_id, vrijeme_do DESC);
CREATE INDEX IF NOT EXISTS zakljucenja_smjene_do_idx ON zakljucenja_smjene(vrijeme_do DESC);

-- Isti model pristupa kao ostale tabele aplikacije (vidi napomenu o auth-u u replica/build-log.md).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['zakljucenja_dana', 'zakljucenja_smjene'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow all for anon" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
