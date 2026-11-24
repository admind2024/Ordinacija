-- Smjene: imenovana radna vremena (npr. Prva 08-14, Druga 14-20) koja se u Rasporedu
-- dodjeljuju osobi za konkretan dan.
-- Sama dodjela se cuva kao izuzetak za datum u doctor_schedules (napomena = naziv smjene),
-- pa postojeca logika rasporeda (odsustvo > datum > sedmicni sablon) ostaje nepromijenjena
-- i zakazivanje termina odmah postuje dodijeljenu smjenu.
CREATE TABLE IF NOT EXISTS smjene (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv TEXT NOT NULL,
  pocetak TIME NOT NULL,
  kraj TIME NOT NULL,
  boja TEXT NOT NULL DEFAULT '#2BA5A5',
  redoslijed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (kraj > pocetak)
);

-- Isti model pristupa kao ostale tabele aplikacije.
ALTER TABLE smjene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON smjene;
CREATE POLICY "Allow all for anon" ON smjene FOR ALL USING (true) WITH CHECK (true);

-- Pocetne smjene (samo ako je tabela prazna); mijenjaju se u aplikaciji.
INSERT INTO smjene (naziv, pocetak, kraj, boja, redoslijed)
SELECT v.naziv, v.pocetak, v.kraj, v.boja, v.redoslijed
FROM (VALUES
  ('Prva smjena', TIME '08:00', TIME '14:00', '#2BA5A5', 1),
  ('Druga smjena', TIME '14:00', TIME '20:00', '#C4956F', 2)
) AS v(naziv, pocetak, kraj, boja, redoslijed)
WHERE NOT EXISTS (SELECT 1 FROM smjene);
