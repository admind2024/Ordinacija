-- Red za odlozeno slanje SMS ankete nakon pregleda.
-- Frontend upisuje red kad doktor zavrsi pregled, sa scheduled_at = now() + 30 min.
-- Edge function send-survey-sms (pg_cron svaki 5 min) pokupi i posalje.

CREATE TABLE IF NOT EXISTS survey_sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  survey_id UUID REFERENCES surveys(id),
  patient_ime TEXT,
  patient_telefon TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE survey_sms_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY survey_sms_queue_all ON survey_sms_queue FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_survey_sms_queue_pending ON survey_sms_queue(status, scheduled_at) WHERE status = 'pending';
