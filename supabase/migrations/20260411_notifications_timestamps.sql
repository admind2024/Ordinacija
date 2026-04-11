-- Dodaj created_at i updated_at na notifications.
-- poll-omni-status (i buducnost) ocekuje updated_at kolonu kod svakog write-a;
-- prije ovoga su svi DLR update-ovi silently failovali jer kolona nije postojala.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill: postojeci redovi dobijaju updated_at = datum_slanja (ili now kao fallback)
UPDATE notifications
   SET created_at = COALESCE(datum_slanja, now()),
       updated_at = COALESCE(datum_slanja, now())
 WHERE created_at IS NULL OR updated_at IS NULL;
