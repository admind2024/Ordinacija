-- Fix za fiskalne uplate:
-- 1. Dodaj 'kartica' u CHECK (ranije samo 'kartica_fiskalni' — obicne kartice su fail-ovale)
-- 2. Kolone za perzistovanje fiskalnih podataka (FIC, IIC, QR) da prezive refresh
--    i omoguce stampanje racuna bez ponovne fiskalizacije

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_metoda_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_metoda_check
  CHECK (metoda IN (
    'gotovina',
    'gotovina_fiskalni',
    'kartica',
    'kartica_fiskalni',
    'administrativna_zabrana',
    'osiguranje',
    'bon',
    'online',
    'transfer'
  ));

ALTER TABLE payments ADD COLUMN IF NOT EXISTS fic TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS iic TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
