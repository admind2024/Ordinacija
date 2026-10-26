-- Raspored rada: sedmicni sablon + izuzeci za datum + odsustva.
-- doctor_schedules je postojala ali je bila prazna (UI je imao demo podatke).
--   ponavljajuci = true  -> red vazi svake sedmice za dan_u_sedmici (1 = pon ... 7 = ned)
--   ponavljajuci = false -> izuzetak za tacan datum (pregazi sedmicni sablon)
--   tip = 'neradni'      -> taj dan ne radi (pocetak/kraj prazni)
ALTER TABLE doctor_schedules
  ALTER COLUMN datum DROP NOT NULL,
  ALTER COLUMN pocetak DROP NOT NULL,
  ALTER COLUMN kraj DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS dan_u_sedmici SMALLINT CHECK (dan_u_sedmici BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS pauze JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE doctor_schedules DROP CONSTRAINT IF EXISTS doctor_schedules_kind_check;
ALTER TABLE doctor_schedules ADD CONSTRAINT doctor_schedules_kind_check CHECK (
  (ponavljajuci AND dan_u_sedmici IS NOT NULL AND datum IS NULL)
  OR (NOT ponavljajuci AND datum IS NOT NULL AND dan_u_sedmici IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS doctor_schedules_weekly_uq
  ON doctor_schedules(doctor_id, dan_u_sedmici) WHERE ponavljajuci;
CREATE UNIQUE INDEX IF NOT EXISTS doctor_schedules_date_uq
  ON doctor_schedules(doctor_id, datum) WHERE NOT ponavljajuci;

CREATE TABLE IF NOT EXISTS odsustva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  datum_od DATE NOT NULL,
  datum_do DATE NOT NULL,
  razlog TEXT NOT NULL DEFAULT 'ostalo'
    CHECK (razlog IN ('godisnji', 'bolovanje', 'licni', 'sluzbeni_put', 'ostalo')),
  napomena TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (datum_do >= datum_od)
);
CREATE INDEX IF NOT EXISTS odsustva_doctor_period_idx ON odsustva(doctor_id, datum_od, datum_do);

-- Isti model pristupa kao ostale tabele aplikacije (vidi napomenu o auth-u u replica/build-log.md).
ALTER TABLE odsustva ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON odsustva;
CREATE POLICY "Allow all for anon" ON odsustva FOR ALL USING (true) WITH CHECK (true);
