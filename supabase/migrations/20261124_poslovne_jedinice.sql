-- Poslovne jedinice, korak 1: druga jedinica (Bolnica) + polje establishment_id.
--
-- Pacijenti i kartoni ostaju ZAJEDNICKI. Ljekari, ordinacije, cjenovnik, termini i pregledi
-- dobijaju jedinicu kojoj pripadaju, da se u istoriji vidi gdje je pregled radjen i da se
-- u sljedecem koraku svakom radniku prikazu samo podaci njegove jedinice.
--
-- Bezbjedno za postojece podatke: sve sto vec postoji veze se za prvu ustanovu (MOA Podgorica),
-- a ista jedinica je i DEFAULT, pa unosi iz aplikacije rade kao i do sada dok aplikacija
-- ne pocne sama da salje jedinicu (korak 2).

ALTER TABLE establishments ADD COLUMN IF NOT EXISTS kratki_naziv TEXT;

UPDATE establishments
SET kratki_naziv = 'MOA Podgorica'
WHERE kratki_naziv IS NULL
  AND id = (SELECT id FROM establishments ORDER BY created_at LIMIT 1);

INSERT INTO establishments (naziv, kratki_naziv)
SELECT 'Bolnica', 'Bolnica'
WHERE NOT EXISTS (SELECT 1 FROM establishments WHERE kratki_naziv = 'Bolnica');

DO $$
DECLARE
  moa UUID;
  t TEXT;
BEGIN
  SELECT id INTO moa FROM establishments ORDER BY created_at LIMIT 1;

  FOREACH t IN ARRAY ARRAY['doctors', 'rooms', 'services', 'service_categories', 'appointments', 'examinations'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id)', t);
    EXECUTE format('UPDATE %I SET establishment_id = %L WHERE establishment_id IS NULL', t, moa);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN establishment_id SET DEFAULT %L', t, moa);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(establishment_id)', t || '_establishment_idx', t);
  END LOOP;
END $$;
