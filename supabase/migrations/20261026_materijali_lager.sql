-- Lager materijala: svako kretanje (nabavka, utrosak, popis, otpis) mijenja trenutna_kolicina.
-- materials.trenutna_kolicina i min_kolicina su postojale ali se nijesu azurirale.

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS sifra TEXT,
  ADD COLUMN IF NOT EXISTS brend TEXT;

CREATE TABLE IF NOT EXISTS material_kretanja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  tip TEXT NOT NULL CHECK (tip IN ('nabavka', 'utrosak', 'popis', 'korekcija', 'otpis')),
  kolicina NUMERIC(12, 3) NOT NULL,           -- + ulaz, - izlaz
  nabavna_cijena NUMERIC(10, 2),              -- po jedinici, samo za nabavku
  datum TIMESTAMPTZ NOT NULL DEFAULT now(),
  faktura TEXT,
  dobavljac TEXT,
  napomena TEXT,
  material_usage_id UUID UNIQUE REFERENCES material_usage(id) ON DELETE CASCADE,
  popis_id UUID,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS material_kretanja_material_idx ON material_kretanja(material_id, datum DESC);

-- Stanje = zbir kretanja (inkrementalno).
CREATE OR REPLACE FUNCTION material_kretanja_stanje() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE materials SET trenutna_kolicina = COALESCE(trenutna_kolicina, 0) - OLD.kolicina WHERE id = OLD.material_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE materials SET trenutna_kolicina = COALESCE(trenutna_kolicina, 0) + NEW.kolicina,
           nabavna_cijena = CASE WHEN NEW.tip = 'nabavka' AND NEW.nabavna_cijena IS NOT NULL THEN NEW.nabavna_cijena ELSE nabavna_cijena END
     WHERE id = NEW.material_id;
    RETURN NEW;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS material_kretanja_stanje_trg ON material_kretanja;
CREATE TRIGGER material_kretanja_stanje_trg
  AFTER INSERT OR UPDATE OR DELETE ON material_kretanja
  FOR EACH ROW EXECUTE FUNCTION material_kretanja_stanje();

-- Utrosak iz termina/pregleda (material_usage) automatski skida sa lagera.
-- Brisanje utroska brise i kretanje (FK CASCADE) i vraca kolicinu.
CREATE OR REPLACE FUNCTION material_usage_u_lager() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO material_kretanja(material_id, tip, kolicina, datum, material_usage_id)
    VALUES (NEW.material_id, 'utrosak', -COALESCE(NEW.kolicina, 0), COALESCE(NEW.datum::timestamptz, now()), NEW.id);
  ELSIF TG_OP = 'UPDATE' AND (NEW.kolicina IS DISTINCT FROM OLD.kolicina OR NEW.material_id IS DISTINCT FROM OLD.material_id) THEN
    UPDATE material_kretanja SET material_id = NEW.material_id, kolicina = -COALESCE(NEW.kolicina, 0)
     WHERE material_usage_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS material_usage_u_lager_trg ON material_usage;
CREATE TRIGGER material_usage_u_lager_trg
  AFTER INSERT OR UPDATE ON material_usage
  FOR EACH ROW EXECUTE FUNCTION material_usage_u_lager();

-- Popis (inventura)
CREATE TABLE IF NOT EXISTS popisi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum DATE NOT NULL DEFAULT current_date,
  status TEXT NOT NULL DEFAULT 'otvoren' CHECK (status IN ('otvoren', 'zakljucen')),
  napomena TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  zakljucen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS popis_stavke (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popis_id UUID NOT NULL REFERENCES popisi(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  sistemsko NUMERIC(12, 3) NOT NULL DEFAULT 0,
  popisano NUMERIC(12, 3),
  razlika NUMERIC(12, 3),
  napomena TEXT,
  UNIQUE (popis_id, material_id)
);

ALTER TABLE material_kretanja DROP CONSTRAINT IF EXISTS material_kretanja_popis_fk;
ALTER TABLE material_kretanja ADD CONSTRAINT material_kretanja_popis_fk
  FOREIGN KEY (popis_id) REFERENCES popisi(id) ON DELETE SET NULL;

-- Zakljuci popis: razlika (popisano - stanje u trenutku zakljucenja) ide kao kretanje 'popis'.
CREATE OR REPLACE FUNCTION zakljuci_popis(p_popis_id UUID, p_user_id UUID) RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE s RECORD; n INTEGER := 0; stanje NUMERIC;
BEGIN
  PERFORM 1 FROM popisi WHERE id = p_popis_id AND status = 'otvoren' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Popis nije otvoren'; END IF;
  FOR s IN SELECT * FROM popis_stavke WHERE popis_id = p_popis_id AND popisano IS NOT NULL LOOP
    SELECT COALESCE(trenutna_kolicina, 0) INTO stanje FROM materials WHERE id = s.material_id FOR UPDATE;
    UPDATE popis_stavke SET razlika = s.popisano - stanje WHERE id = s.id;
    IF s.popisano <> stanje THEN
      INSERT INTO material_kretanja(material_id, tip, kolicina, popis_id, user_id, napomena)
      VALUES (s.material_id, 'popis', s.popisano - stanje, p_popis_id, p_user_id, s.napomena);
      n := n + 1;
    END IF;
  END LOOP;
  UPDATE popisi SET status = 'zakljucen', zakljucen_at = now() WHERE id = p_popis_id;
  RETURN n;
END $$;

-- Norma utroska po usluzi (predlaze se pri zakazivanju)
CREATE TABLE IF NOT EXISTS service_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  kolicina NUMERIC(12, 3) NOT NULL CHECK (kolicina > 0),
  UNIQUE (service_id, material_id)
);

-- Isti model pristupa kao ostale tabele aplikacije (vidi napomenu o auth-u u replica/build-log.md).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['material_kretanja', 'popisi', 'popis_stavke', 'service_materials'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow all for anon" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
