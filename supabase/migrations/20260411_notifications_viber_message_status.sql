-- Dodaj viber_message_status kolonu u notifications (seen / not_seen).
-- Marketing Izvjestaj tab select-uje ovu kolonu iz notifications za objedinjeni
-- hronoloski feed, ali kolona je do sada postojala samo na campaign_recipients.
-- Bez ove kolone Supabase select vraca gresku i feed ostaje prazan.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS viber_message_status TEXT;
