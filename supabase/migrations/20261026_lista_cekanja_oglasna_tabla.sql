-- Lista cekanja: pacijenti koji cekaju slobodan termin.
-- patient_id je opcion: osoba koja zove prvi put jos nema karton, pa cuvamo ime i telefon.
CREATE TABLE IF NOT EXISTS lista_cekanja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  ime_prezime TEXT,
  telefon TEXT,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  zeljeni_od DATE,
  zeljeni_do DATE,
  zeljeno_vrijeme TEXT,             -- slobodan opis, npr. "radnim danima poslije 16h"
  napomena TEXT,
  status TEXT NOT NULL DEFAULT 'ceka' CHECK (status IN ('ceka', 'zakazan', 'odustao')),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (patient_id IS NOT NULL OR ime_prezime IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS lista_cekanja_status_idx ON lista_cekanja(status, created_at);

-- Oglasna tabla: bilješke za tim.
CREATE TABLE IF NOT EXISTS oglasna_tabla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naslov TEXT NOT NULL,
  tekst TEXT,
  boja TEXT NOT NULL DEFAULT '#FEF3C7',
  oznake TEXT[] NOT NULL DEFAULT '{}',
  dodijeljeno_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  autor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  zakaceno BOOLEAN NOT NULL DEFAULT false,
  rijeseno BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oglasna_tabla_created_idx ON oglasna_tabla(created_at DESC);

-- Isti model pristupa kao ostale tabele aplikacije (vidi napomenu o auth-u u replica/build-log.md).
ALTER TABLE lista_cekanja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON lista_cekanja;
CREATE POLICY "Allow all for anon" ON lista_cekanja FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE oglasna_tabla ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON oglasna_tabla;
CREATE POLICY "Allow all for anon" ON oglasna_tabla FOR ALL USING (true) WITH CHECK (true);
