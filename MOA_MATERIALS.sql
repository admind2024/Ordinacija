-- Materijali i utrosak materijala

CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv TEXT NOT NULL,
  jedinica_mjere TEXT DEFAULT 'kom',
  kategorija TEXT,
  trenutna_kolicina NUMERIC DEFAULT 0,
  min_kolicina NUMERIC DEFAULT 0,
  nabavna_cijena NUMERIC DEFAULT 0,
  aktivan BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  examination_id UUID REFERENCES examinations(id) ON DELETE SET NULL,
  material_id UUID NOT NULL REFERENCES materials(id),
  kolicina NUMERIC NOT NULL DEFAULT 1,
  ljekar_id UUID REFERENCES doctors(id),
  patient_id UUID REFERENCES patients(id),
  datum DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON material_usage FOR ALL USING (true) WITH CHECK (true);

-- MOA Materijali
INSERT INTO materials (naziv, jedinica_mjere) VALUES
('Alergan', '1 ml'),
('Aliaxin EV', '1 ml'),
('Aliaxin GP', '1 ml'),
('Aliaxin SV', '1 ml'),
('Ankgor booster', '2 ml'),
('Aplikator Celo', '1 kom'),
('Aplikator EM SCULPT NEO', '30 minuta'),
('Aplikator Obrazi EM FACE 3', '2 kom'),
('Aplikator podbradak EM FACE', '1 kom'),
('Belotero Balance', '1 ml'),
('Belotero intense Fileri 21', '1 ml'),
('Belotero intense Fileri 22', '1 ml'),
('Dysport', '1 ml'),
('Elektrode EM FACE 4', '1 kom'),
('Exzozomi PDM', '1500 iu'),
('Exzozomi sa petpidima', '5 ml'),
('Eyal 40', '2 ml'),
('Glutation infuzija', '600 mg'),
('Hulabbo', '2 ml'),
('Izolovani nastavci FRAKCIONI 1', '1 nastavak'),
('Izolovani nastavci FRAKCIONI 2', '1 nastavak'),
('Jalupro HMW', '3 ml'),
('Jalupro Super Hydro', '2.5 ml'),
('Jalupro Young Eye', '1 ml'),
('Maili define', '1 ml'),
('Maili volume', '1 ml'),
('Nabota', '1 ml'),
('NAD +', '3 ml'),
('NAD + kompleks', '5 ml'),
('NAD + Mezoestetik', '10 ml'),
('Neizolovani nastavci FRAKCIONI 3', '1 nastavak'),
('Neuramis', '1 ml'),
('NMN NAD INFUZIJE', '10 ml'),
('Otesali', '1 ml'),
('Profhilo', '2 ml'),
('Radiesse kolagen stimulator', '1.5 cc'),
('Refine form', '10 ml'),
('Restylane define', '1 ml'),
('Restylane kysse', '1 ml'),
('Restylane lyft', '1 ml'),
('Restylane volume', '1 ml'),
('RRS Long Lasting', '3 ml'),
('Stylage hydromax', '1 ml'),
('Stylage L', '1 ml'),
('Stylage M', '1 ml'),
('Stylage S', '1 ml'),
('Stylage XL', '1 ml'),
('Stylage XXL', '1 ml'),
('Teoxane Redensity I', '3 ml'),
('Teoxane Redensity II', '1 ml'),
('Teoxane RH1', '1 ml'),
('Teoxane RH2', '1 ml'),
('Vicoderm skinko e', '5 ml'),
('Viscoderm hydromax Hidratacije 11', '1 ml'),
('Viscoderm hydromax Hidratacije 5', '1 ml');
