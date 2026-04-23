-- Dodaj kolonu za rezultate (laboratorijski i RTG) u pregledima
ALTER TABLE examinations
  ADD COLUMN IF NOT EXISTS rezultati TEXT;
