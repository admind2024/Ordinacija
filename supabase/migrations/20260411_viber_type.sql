-- Viber message type za kampanje — 5 varijanti kao u Omni native composer-u
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS viber_type TEXT DEFAULT 'text_image_button',
  ADD COLUMN IF NOT EXISTS viber_video_url TEXT;

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_viber_type_check;
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_viber_type_check
  CHECK (viber_type IN ('text_only','text_button','text_image_button','video_text','media_only'));
