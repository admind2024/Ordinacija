-- Poslovne jedinice, korak 3: naplata, dugovanja, lager, vauceri i ostali moduli po jedinici.
--
-- Svaka od ovih tabela dobija establishment_id. Postojeci redovi i DEFAULT su prva ustanova
-- (MOA Podgorica), pa se u radu Podgorice nista ne mijenja. Kolona se dodaje sa konstantnim
-- DEFAULT-om, sto ne pokrece UPDATE ni trigere nad postojecim redovima (bitno za lager).
--
-- Aplikacija salje jedinicu uz svaki upit i unos (src/lib/supabase.ts). Za redove koji nastaju
-- na serveru (trigeri lagera, RPC) ili imaju roditelja, jedinicu odredjuje roditelj:
--   material_kretanja, material_usage -> materials
--   uplate_duga                        -> dugovanja
--   payments, dugovanja                -> appointments (kad su vezani za termin)

DO $$
DECLARE
  moa UUID;
  t TEXT;
BEGIN
  SELECT id INTO moa FROM establishments ORDER BY created_at LIMIT 1;

  FOREACH t IN ARRAY ARRAY[
    'payments', 'dugovanja', 'uplate_duga',
    'materials', 'material_kretanja', 'material_usage', 'popisi',
    'vauceri', 'oglasna_tabla', 'lista_cekanja', 'kalendar_dogadjaji',
    'zakljucenja_smjene', 'zakljucenja_dana', 'smjene'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS establishment_id UUID DEFAULT %L REFERENCES establishments(id)', t, moa);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(establishment_id)', t || '_establishment_idx', t);
  END LOOP;
END $$;

-- Dan se zakljucuje po jedinici, ne jednom za cijelu firmu.
ALTER TABLE zakljucenja_dana DROP CONSTRAINT IF EXISTS zakljucenja_dana_datum_key;
CREATE UNIQUE INDEX IF NOT EXISTS zakljucenja_dana_datum_jedinica_uq ON zakljucenja_dana(datum, establishment_id);

CREATE OR REPLACE FUNCTION jedinica_od_roditelja() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  j UUID;
BEGIN
  IF TG_TABLE_NAME IN ('material_kretanja', 'material_usage') THEN
    SELECT establishment_id INTO j FROM materials WHERE id = NEW.material_id;
  ELSIF TG_TABLE_NAME = 'uplate_duga' THEN
    SELECT establishment_id INTO j FROM dugovanja WHERE id = NEW.dugovanje_id;
  ELSIF TG_TABLE_NAME IN ('payments', 'dugovanja') THEN
    IF NEW.appointment_id IS NOT NULL THEN
      SELECT establishment_id INTO j FROM appointments WHERE id = NEW.appointment_id;
    END IF;
  END IF;
  IF j IS NOT NULL THEN
    NEW.establishment_id := j;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['material_kretanja', 'material_usage', 'uplate_duga', 'payments', 'dugovanja'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t || '_jedinica_trg', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION jedinica_od_roditelja()', t || '_jedinica_trg', t);
  END LOOP;
END $$;
