-- Poslovne jedinice, korak 2: radnik pripada jedinici.
-- NULL = korisnik vidi sve jedinice i bira aktivnu u zaglavlju (admin/vlasnik).
-- Popunjeno = korisnik vidi samo ljekare, ordinacije, cjenovnik i termine te jedinice.
ALTER TABLE users ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id);
COMMENT ON COLUMN users.establishment_id IS 'Poslovna jedinica radnika. NULL = vidi sve jedinice i moze da bira (admin).';
