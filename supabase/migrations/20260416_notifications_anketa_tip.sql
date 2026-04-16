-- Dodaj 'anketa' kao validan tip u notifications (za SMS anketa nakon pregleda).
-- Bez ovoga, insert iz edge funkcije send-survey-sms tiho fail-uje i anketa se
-- ne prikazuje u izvjestaju poslatih poruka.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tip_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_tip_check
  CHECK (tip IN ('podsjetnik','potvrda','post_procedura','kontrola','kampanja','otkazivanje','potvrdjivanje','test','anketa'));
