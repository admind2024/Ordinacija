-- Dodaj 'sat_prije' kao validnu vrijednost za reminder_settings.timing

ALTER TABLE reminder_settings DROP CONSTRAINT IF EXISTS reminder_settings_timing_check;

ALTER TABLE reminder_settings
  ADD CONSTRAINT reminder_settings_timing_check
  CHECK (timing IN ('dan_termina', 'dan_prije', 'sat_prije'));
