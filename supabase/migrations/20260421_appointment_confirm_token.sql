-- Pacijentska online potvrda dolaska
--
-- confirm_token — jednokratan UUID koji se salje u SMS/Viber podsjetniku
--                 kao https://www.moa-app.me/potvrda/{token}
-- confirmed_at   — postavljen kada pacijent klikne link ili kad ga recepcija potvrdi
-- confirmed_source — 'patient_link' (kliknuo pacijent) ili 'manual' (recepcija)

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS confirm_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_source TEXT
    CHECK (confirmed_source IS NULL OR confirmed_source IN ('patient_link', 'manual'));

-- Backfill: svaki postojeci red bez tokena dobija svoj
UPDATE appointments SET confirm_token = gen_random_uuid() WHERE confirm_token IS NULL;

-- Unique index za brzi lookup iz public potvrda stranice
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_confirm_token
  ON appointments(confirm_token);

-- ============================================================================
-- PUBLIC RPC-i za /potvrda/:token stranicu (bez auth-a)
--
-- Zasto RPC umjesto RLS: ne zelimo da dajemo anon roli SELECT nad appointments
-- tabelom jer bi to omogucilo curenje cijelog rasporeda. Umjesto toga,
-- SECURITY DEFINER funkcije vracaju samo ono sto je nuzno za prikaz stranice.
-- ============================================================================

-- 1) Fetch: vraca minimalni set podataka za renderovanje stranice
--    Vraca i status/confirmed_at da UI moze da pokaze "vec je potvrdjeno"
CREATE OR REPLACE FUNCTION public.fetch_appointment_by_token(p_token UUID)
RETURNS TABLE (
  ime_pacijenta TEXT,
  pocetak TIMESTAMPTZ,
  kraj TIMESTAMPTZ,
  status TEXT,
  confirmed_at TIMESTAMPTZ,
  doktor TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.ime AS ime_pacijenta,
    a.pocetak,
    a.kraj,
    a.status,
    a.confirmed_at,
    TRIM(CONCAT_WS(' ', d.titula, d.ime, d.prezime)) AS doktor
  FROM appointments a
  LEFT JOIN patients p ON p.id = a.patient_id
  LEFT JOIN doctors d ON d.id = a.doctor_id
  WHERE a.confirm_token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.fetch_appointment_by_token(UUID) TO anon;

-- 2) Confirm: postavlja status='potvrdjen' + confirmed_at + confirmed_source
--    Idempotentno — ako je vec potvrdjen, samo vraca postojecu informaciju.
--    Ne dira vec otkazane/zavrsene/nije_dosao termine.
CREATE OR REPLACE FUNCTION public.confirm_appointment_by_token(p_token UUID)
RETURNS TABLE (
  ok BOOLEAN,
  razlog TEXT,
  already_confirmed BOOLEAN,
  pocetak TIMESTAMPTZ,
  ime_pacijenta TEXT,
  doktor TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apt appointments%ROWTYPE;
  v_ime TEXT;
  v_doktor TEXT;
BEGIN
  SELECT * INTO v_apt FROM appointments WHERE confirm_token = p_token LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'not_found'::TEXT, FALSE, NULL::TIMESTAMPTZ, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT ime INTO v_ime FROM patients WHERE id = v_apt.patient_id;
  SELECT TRIM(CONCAT_WS(' ', titula, ime, prezime)) INTO v_doktor FROM doctors WHERE id = v_apt.doctor_id;

  IF v_apt.status IN ('otkazan', 'nije_dosao', 'zavrsen') THEN
    RETURN QUERY SELECT FALSE, v_apt.status::TEXT, FALSE, v_apt.pocetak, v_ime, v_doktor;
    RETURN;
  END IF;

  IF v_apt.confirmed_at IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, 'already'::TEXT, TRUE, v_apt.pocetak, v_ime, v_doktor;
    RETURN;
  END IF;

  UPDATE appointments
     SET status = 'potvrdjen',
         confirmed_at = now(),
         confirmed_source = 'patient_link'
   WHERE confirm_token = p_token;

  RETURN QUERY SELECT TRUE, 'ok'::TEXT, FALSE, v_apt.pocetak, v_ime, v_doktor;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_appointment_by_token(UUID) TO anon;
