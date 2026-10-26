-- Interni dogadjaji u kalendaru: sastanak, edukacija, servis aparata...
-- Ako je izabrana ordinacija/oprema, ona je blokirana za termine u tom periodu.
CREATE TABLE IF NOT EXISTS kalendar_dogadjaji (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naslov TEXT NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  pocetak TIMESTAMPTZ NOT NULL,
  kraj TIMESTAMPTZ NOT NULL,
  boja TEXT NOT NULL DEFAULT '#94A3B8',
  opis TEXT,
  ucesnici UUID[] NOT NULL DEFAULT '{}',   -- doctor_ids
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (kraj > pocetak)
);
CREATE INDEX IF NOT EXISTS kalendar_dogadjaji_period_idx ON kalendar_dogadjaji(pocetak, kraj);

-- Isti model pristupa kao ostale tabele aplikacije (vidi napomenu o auth-u u replica/build-log.md).
ALTER TABLE kalendar_dogadjaji ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON kalendar_dogadjaji;
CREATE POLICY "Allow all for anon" ON kalendar_dogadjaji FOR ALL USING (true) WITH CHECK (true);
