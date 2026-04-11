-- Dodatni agregirani counteri za Viber izvjestaje
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS seen_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS viber_delivered_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sms_delivered_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fallback_count INT DEFAULT 0;

-- Click tracking na campaign_recipients (opciono, popunjava se kad webhook radi)
ALTER TABLE campaign_recipients
  ADD COLUMN IF NOT EXISTS clicked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
