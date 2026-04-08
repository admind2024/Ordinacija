-- Tabela za podesavanja automatskih podsjetnika
-- Edge Function cita ova podesavanja pri svakom pokretanju

CREATE TABLE IF NOT EXISTS reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT false,
  timing TEXT DEFAULT 'dan_termina' CHECK (timing IN ('dan_termina', 'dan_prije')),
  vrijeme TIME DEFAULT '08:00',
  sms_api_key TEXT,
  sms_sender_name TEXT,
  sms_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON reminder_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default row
INSERT INTO reminder_settings (enabled, timing, vrijeme)
VALUES (false, 'dan_termina', '08:00')
ON CONFLICT DO NOTHING;

-- Azuriranje notifications tabele: dodaj patient ime za izvjestaje
-- (patient_id vec postoji, ali cemo dodati polje za brzi pristup)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS patient_ime TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS patient_telefon TEXT;
