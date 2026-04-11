-- Dodaj 'test' kao validan tip za notifications (za test poruke iz UI-a)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tip_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_tip_check
  CHECK (tip IN ('podsjetnik','potvrda','post_procedura','kontrola','kampanja','otkazivanje','potvrdjivanje','test'));
