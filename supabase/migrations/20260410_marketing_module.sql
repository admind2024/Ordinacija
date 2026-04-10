-- ============================================================
-- Marketing modul: Omni Messaging (Viber) + kampanje + kontakti
-- ============================================================
-- SMS nastavlja da ide preko rakunat proxy-ja (korisnikov licni SMS nalog).
-- Viber ide kroz Omni Messaging (https://api.omni-messaging.com/v1).
-- Fallback Viber -> SMS radi nas kod (webhook), ne Omni channels niz.

-- ------------------------------------------------------------
-- 1. Omni kredencijali + channel mode u reminder_settings
-- ------------------------------------------------------------
ALTER TABLE reminder_settings
  ADD COLUMN IF NOT EXISTS omni_user_id TEXT,
  ADD COLUMN IF NOT EXISTS omni_auth_key TEXT,
  ADD COLUMN IF NOT EXISTS channel_mode TEXT DEFAULT 'sms';

ALTER TABLE reminder_settings DROP CONSTRAINT IF EXISTS reminder_settings_channel_mode_check;
ALTER TABLE reminder_settings
  ADD CONSTRAINT reminder_settings_channel_mode_check
  CHECK (channel_mode IN ('sms','viber','viber_then_sms'));

-- ------------------------------------------------------------
-- 2. Contacts (non-patient kontakti za marketing)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ime TEXT NOT NULL,
  prezime TEXT,
  telefon TEXT NOT NULL,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  napomena TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_telefon ON contacts(telefon);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON contacts;
CREATE POLICY "Allow all for anon" ON contacts FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 3. Contact groups (staticke + dinamicke)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv TEXT NOT NULL,
  tip TEXT NOT NULL CHECK (tip IN ('staticka','dinamicka')),
  filter_json JSONB,   -- za dinamicke: { doctor_id, last_visit_op, last_visit_days, age_from, age_to, grad, tagovi, only_patients, only_contacts }
  napomena TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON contact_groups;
CREATE POLICY "Allow all for anon" ON contact_groups FOR ALL USING (true) WITH CHECK (true);

-- Clanovi static grupa (za dinamicke NIJE popunjeno, racunamo on-the-fly)
CREATE TABLE IF NOT EXISTS contact_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT exactly_one_ref CHECK (
    (patient_id IS NOT NULL)::int + (contact_id IS NOT NULL)::int = 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_group_patient ON contact_group_members(group_id, patient_id) WHERE patient_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_group_contact ON contact_group_members(group_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cgm_group ON contact_group_members(group_id);

ALTER TABLE contact_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON contact_group_members;
CREATE POLICY "Allow all for anon" ON contact_group_members FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 4. Campaigns
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv TEXT NOT NULL,
  channel_mode TEXT NOT NULL CHECK (channel_mode IN ('sms','viber','viber_then_sms')),

  -- SMS content
  sms_text TEXT,
  sms_sender TEXT,

  -- Viber content
  viber_text TEXT,
  viber_caption TEXT,
  viber_action_url TEXT,
  viber_image_url TEXT,

  -- Target
  target_type TEXT NOT NULL CHECK (target_type IN ('svi_pacijenti','grupa','rucni','filter')),
  target_group_id UUID REFERENCES contact_groups(id) ON DELETE SET NULL,
  target_filter JSONB,
  target_rucni_ids JSONB,  -- { patient_ids: [...], contact_ids: [...] }

  -- Scheduling
  scheduled_at TIMESTAMPTZ,  -- NULL = posalji odmah

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','completed','failed','cancelled')),
  omni_transaction_id TEXT NOT NULL UNIQUE,
  omni_sending_id TEXT,
  cost_estimation NUMERIC,
  cost_actual NUMERIC,
  total_recipients INT DEFAULT 0,
  sent_viber INT DEFAULT 0,
  sent_sms INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  error TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_at) WHERE status='scheduled';

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON campaigns;
CREATE POLICY "Allow all for anon" ON campaigns FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 5. Campaign recipients (per-primaoc log sa delivery status)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  patient_id UUID,
  contact_id UUID,
  ime TEXT NOT NULL,
  telefon TEXT NOT NULL,

  -- Omni tracking
  omni_recipient_id TEXT,  -- npr. "SD-abcd1234-000001"

  -- Delivery state
  channel_used TEXT,   -- 'viber' | 'sms'
  viber_dlr TEXT,      -- delivered, expired, failed, blocked, no_suitable_device, not_viber_user, pending
  viber_message_status TEXT,  -- seen, not_seen
  sms_dlr TEXT,        -- delivered, not_delivered, pending, invalid_msisdn, expired, call_barred
  fallbacked BOOLEAN DEFAULT false,  -- true kad je Viber failed i SMS fallback poslat kroz rakunat

  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_camp_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_recipients_omni_id ON campaign_recipients(omni_recipient_id);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON campaign_recipients;
CREATE POLICY "Allow all for anon" ON campaign_recipients FOR ALL USING (true) WITH CHECK (true);
