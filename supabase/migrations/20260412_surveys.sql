-- Ankete zadovoljstva pacijenata
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv TEXT NOT NULL,
  opis TEXT,
  pitanja JSONB NOT NULL DEFAULT '[]'::jsonb,
  aktivan BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  patient_ime TEXT,
  odgovori JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "surveys_all" ON surveys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "survey_responses_all" ON survey_responses FOR ALL USING (true) WITH CHECK (true);
