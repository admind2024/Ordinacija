-- Tabela za medicinske preglede / nalaze
CREATE TABLE IF NOT EXISTS examinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  datum DATE DEFAULT CURRENT_DATE,
  razlog_dolaska TEXT,
  nalaz TEXT,
  terapija TEXT,
  preporuke TEXT,
  kontrolni_pregled TEXT,
  napomena TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'zavrsen')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE examinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON examinations FOR ALL USING (true) WITH CHECK (true);
