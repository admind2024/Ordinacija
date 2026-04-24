-- Povezi dugovanje sa terminom (appointment_id) da mozemo prikazati koje
-- usluge pacijent duguje i kada je bio termin.
ALTER TABLE dugovanja
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS dugovanja_appointment_id_idx ON dugovanja(appointment_id);
