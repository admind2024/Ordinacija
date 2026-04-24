-- Evidencija trajanja pregleda: zapoceto_u (timestamp pocetka) i trajanje_min
-- (minuti, izracunato kad se pregled zavrsi).
ALTER TABLE examinations
  ADD COLUMN IF NOT EXISTS zapoceto_u TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trajanje_min INTEGER;
