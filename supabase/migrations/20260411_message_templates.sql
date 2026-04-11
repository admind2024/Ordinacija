-- Template-i za podsjetnicke poruke (SMS + Viber) — JSONB kolona na reminder_settings.
-- Struktura:
-- {
--   "sms":   { "potvrda": "...", "podsjetnik": "...", "otkazivanje": "...", "potvrdjivanje": "..." },
--   "viber": { "potvrda": "...", "podsjetnik": "...", "otkazivanje": "...", "potvrdjivanje": "..." }
-- }
-- Placeholder-i u sablonima: {ime}, {prezime}, {ime_prezime}, {datum}, {vrijeme}, {doktor}

ALTER TABLE reminder_settings
  ADD COLUMN IF NOT EXISTS message_templates JSONB DEFAULT '{}'::jsonb;
