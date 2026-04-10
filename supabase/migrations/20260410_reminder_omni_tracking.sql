-- Dodaj Omni tracking polja u notifications da webhook omni-delivery-report
-- moze da mapira povratne DLR-ove na podsjetnike i da radi SMS fallback.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS omni_recipient_id TEXT,
  ADD COLUMN IF NOT EXISTS omni_sending_id TEXT,
  ADD COLUMN IF NOT EXISTS channel_used TEXT,
  ADD COLUMN IF NOT EXISTS fallbacked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS viber_dlr TEXT,
  ADD COLUMN IF NOT EXISTS sms_dlr TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_omni_recipient_id ON notifications(omni_recipient_id);
