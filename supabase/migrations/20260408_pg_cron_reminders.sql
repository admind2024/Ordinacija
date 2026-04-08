-- ============================================
-- pg_cron job za automatske SMS podsjetnike
-- ============================================
-- NAPOMENA: Ovo se pokrece rucno u Supabase SQL Editor
-- jer pg_cron zahtijeva superuser privilegije.
--
-- Prije pokretanja:
-- 1. Omogucite pg_cron i pg_net ekstenzije u Supabase Dashboard > Database > Extensions
-- 2. Deploy-ujte Edge Function: supabase functions deploy send-reminders
-- 3. Pokrenite ovaj SQL u SQL Editoru

-- Omoguci ekstenzije (ako vec nisu)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Cron job koji poziva Edge Function svaki sat od 6:00 do 21:00
-- Edge Function sam provjerava da li je doslo vrijeme za slanje
-- bazirano na podesavanjima u reminder_settings tabeli.
--
-- Zamijenite YOUR_PROJECT_REF sa vasim Supabase project ref-om
-- i YOUR_ANON_KEY sa anon kljucem.

/*
SELECT cron.schedule(
  'send-sms-reminders',          -- naziv job-a
  '0 6-21 * * *',                -- svaki sat od 6:00 do 21:00
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
*/

-- Za brisanje cron job-a:
-- SELECT cron.unschedule('send-sms-reminders');

-- Za pregled aktivnih cron job-ova:
-- SELECT * FROM cron.job;

-- Za pregled historije izvrsavanja:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
