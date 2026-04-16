-- Jednokratni tokeni za anketa linkove.
-- Svaki red u survey_sms_queue dobija unikatan UUID token,
-- koji se salje u SMS-u kao /anketa/{token}.
-- used_at se postavlja kada pacijent preda odgovore,
-- cime se link zakljucava za ponovno otvaranje.

ALTER TABLE survey_sms_queue
  ADD COLUMN IF NOT EXISTS token UUID DEFAULT gen_random_uuid();

-- Popuni tokene za postojece redove (ako ih ima bez tokena)
UPDATE survey_sms_queue SET token = gen_random_uuid() WHERE token IS NULL;

-- Unique constraint (posebno da CREATE INDEX uz unique brzo look up)
CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_sms_queue_token ON survey_sms_queue(token);

ALTER TABLE survey_sms_queue
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
