-- ============================================
-- pg_cron job za automatske SMS podsjetnike
-- ============================================
-- Ovo se pokrece jednom rucno u Supabase SQL Editoru.
--
-- Prije pokretanja:
-- 1. Omogucite pg_cron i pg_net ekstenzije u Supabase Dashboard > Database > Extensions
-- 2. Deploy-ujte Edge Function kao javnu (bez JWT verifikacije):
--      supabase functions deploy send-reminders --no-verify-jwt
--    Funkcija iznutra koristi SUPABASE_SERVICE_ROLE_KEY pa joj ne treba auth na ulazu.
-- 3. Pokrenite SQL ispod.
--
-- Schedule: svakih 15 minuta od 06:00 do 21:59 UTC (08:00-23:59 CG lokalno).
-- Edge Function sam odlucuje da li i kome treba slati bazirano na reminder_settings.

/*
SELECT cron.unschedule('send-sms-reminders');  -- ako vec postoji

SELECT cron.schedule(
  'send-sms-reminders',
  '*/15 6-21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
*/

-- Dijagnostika:
-- SELECT jobid, jobname, schedule, active FROM cron.job;
-- SELECT jobid, status, return_message, start_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- SELECT id, status_code, LEFT(content::text, 300), created FROM net._http_response ORDER BY created DESC LIMIT 10;
-- Brisanje:
-- SELECT cron.unschedule('send-sms-reminders');
