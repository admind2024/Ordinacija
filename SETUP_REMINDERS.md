# Podsjetnici — setup za serverski cron

Klijent (`useAutoReminders` u browseru) radi samo dok je aplikacija otvorena.
Za pouzdane automatske podsjetnike koristi se Supabase Edge Function
`send-reminders` + `pg_cron` koji je zove na intervalu.

## 1. Deploy Edge Function

Potrebni su Supabase CLI i login:

```bash
npm install -g supabase
supabase login
supabase link --project-ref TVOJ_PROJECT_REF
supabase functions deploy send-reminders
```

`TVOJ_PROJECT_REF` je string iz Supabase URL-a (npr. `abcdefghijkl`).
Nalaziš ga na Settings → General → Reference ID.

Alternativa bez CLI-a: Dashboard → Edge Functions → Deploy → upload
`supabase/functions/send-reminders/index.ts`.

## 2. Omogući pg_cron i pg_net

Supabase Dashboard → Database → Extensions → uključi:
- `pg_cron`
- `pg_net`

## 3. Zakaži cron

Otvori SQL Editor i pokreni (zamijeni TVOJ_PROJECT_REF i TVOJ_ANON_KEY):

```sql
-- Ocisti stari job ako postoji
SELECT cron.unschedule('send-sms-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-sms-reminders'
);

-- Novi job: svakih 15 minuta od 6:00 do 21:45
-- Edge function sama provjerava settings.timing i vrijeme
SELECT cron.schedule(
  'send-sms-reminders',
  '*/15 6-21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://TVOJ_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer TVOJ_ANON_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

Anon key: Dashboard → Settings → API → `anon public`.

## 4. Test

Ručni poziv (provjerava da li edge funkcija radi):

```bash
curl -X POST \
  'https://TVOJ_PROJECT_REF.supabase.co/functions/v1/send-reminders' \
  -H 'Authorization: Bearer TVOJ_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Očekivani JSON odgovori:
- `{"message":"Podsjetnici nisu aktivni ili SMS nije konfigurisan","sent":0}` — `reminder_settings.enabled` je false ili nema SMS kredencijala
- `{"message":"Jos nije vrijeme za slanje (HH:mm)","sent":0}` — pre vremena (samo za `dan_termina`/`dan_prije`)
- `{"message":"Nema termina...","sent":0}` — nema termina u prozoru
- `{"message":"Podsjetnici poslani: N uspjesno, M neuspjesno",...}` — slanje izvršeno

## 5. Monitoring

```sql
-- Aktivni cron job-ovi
SELECT * FROM cron.job;

-- Historija (najnovije prvo)
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Notifikacije poslane danas
SELECT patient_ime, patient_telefon, status, tip, datum_slanja, error
FROM notifications
WHERE datum_slanja >= now()::date
ORDER BY datum_slanja DESC;
```

## Brisanje cron job-a

```sql
SELECT cron.unschedule('send-sms-reminders');
```
