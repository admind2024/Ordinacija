-- Vauceri (placeni i poklon) + vaucer kao nacin placanja + ko je naplatio.
CREATE SEQUENCE IF NOT EXISTS vauceri_broj_seq;

CREATE TABLE IF NOT EXISTS vauceri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broj TEXT NOT NULL UNIQUE
    DEFAULT ('V-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('vauceri_broj_seq')::text, 5, '0')),
  tip TEXT NOT NULL CHECK (tip IN ('placeni', 'poklon')),
  iznos NUMERIC(10, 2) NOT NULL CHECK (iznos > 0),
  preostalo NUMERIC(10, 2) NOT NULL CHECK (preostalo >= 0),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,  -- kupac / vlasnik (opciono)
  primalac TEXT,                                               -- kome je poklon namijenjen
  nacin_placanja TEXT CHECK (nacin_placanja IN ('gotovina', 'gotovina_fiskalni', 'kartica', 'kartica_fiskalni', 'transfer')),
  status TEXT NOT NULL DEFAULT 'aktivan' CHECK (status IN ('aktivan', 'iskoristen', 'storniran')),
  vazi_do DATE,
  napomena TEXT,
  izdao_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (preostalo <= iznos),
  CHECK (tip = 'poklon' OR nacin_placanja IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS vauceri_status_idx ON vauceri(status, created_at DESC);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS vaucer_id UUID REFERENCES vauceri(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS naplatio_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS vaucer_promjene (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaucer_id UUID NOT NULL REFERENCES vauceri(id) ON DELETE CASCADE,
  tip TEXT NOT NULL CHECK (tip IN ('izdavanje', 'iskoristenje', 'storno')),
  iznos NUMERIC(10, 2) NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  napomena TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vaucer_promjene_vaucer_idx ON vaucer_promjene(vaucer_id, created_at);

-- Iskoristi dio vaucera atomicno (zakljucava red, provjerava rok i stanje).
CREATE OR REPLACE FUNCTION iskoristi_vaucer(
  p_vaucer_id UUID, p_iznos NUMERIC, p_payment_id UUID, p_user_id UUID
) RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE v vauceri%ROWTYPE;
BEGIN
  SELECT * INTO v FROM vauceri WHERE id = p_vaucer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vaučer ne postoji'; END IF;
  IF v.status <> 'aktivan' THEN RAISE EXCEPTION 'Vaučer nije aktivan'; END IF;
  IF v.vazi_do IS NOT NULL AND v.vazi_do < current_date THEN RAISE EXCEPTION 'Vaučeru je istekao rok'; END IF;
  IF p_iznos <= 0 OR p_iznos > v.preostalo THEN RAISE EXCEPTION 'Na vaučeru je ostalo %', v.preostalo; END IF;

  UPDATE vauceri
     SET preostalo = preostalo - p_iznos,
         status = CASE WHEN preostalo - p_iznos <= 0 THEN 'iskoristen' ELSE status END
   WHERE id = p_vaucer_id;
  INSERT INTO vaucer_promjene(vaucer_id, tip, iznos, payment_id, user_id)
  VALUES (p_vaucer_id, 'iskoristenje', p_iznos, p_payment_id, p_user_id);
  RETURN v.preostalo - p_iznos;
END $$;

-- Isti model pristupa kao ostale tabele aplikacije (vidi napomenu o auth-u u replica/build-log.md).
ALTER TABLE vauceri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON vauceri;
CREATE POLICY "Allow all for anon" ON vauceri FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE vaucer_promjene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON vaucer_promjene;
CREATE POLICY "Allow all for anon" ON vaucer_promjene FOR ALL USING (true) WITH CHECK (true);
