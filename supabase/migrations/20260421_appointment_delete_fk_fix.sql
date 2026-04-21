-- Fix: brisanje termina puca ako je poslat podsjetnik ili anketa SMS.
--
-- notifications.appointment_id i survey_sms_queue.appointment_id su imali
-- ON DELETE NO ACTION sto blokira DELETE na appointments.
-- Menjamo na SET NULL — notifications/queue redovi ostaju za audit,
-- ali appointment_id se nulira kad se termin obrise. Konzistentno sa
-- examinations/material_usage koji vec imaju SET NULL.

-- notifications
ALTER TABLE notifications
  ALTER COLUMN appointment_id DROP NOT NULL;

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_appointment_id_fkey;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

-- survey_sms_queue
ALTER TABLE survey_sms_queue
  ALTER COLUMN appointment_id DROP NOT NULL;

ALTER TABLE survey_sms_queue
  DROP CONSTRAINT IF EXISTS survey_sms_queue_appointment_id_fkey;

ALTER TABLE survey_sms_queue
  ADD CONSTRAINT survey_sms_queue_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
