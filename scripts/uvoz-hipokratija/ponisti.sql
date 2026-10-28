-- Ponistava jedan uvoz iz Hipokratije. Zamijeni :batch nazivom batch-a iz izvjestaja uvoza.
-- Redoslijed: prvo termini (appointment_services se brisu kaskadno), pa sifrarnici.
BEGIN;
DELETE FROM appointments WHERE id IN (SELECT red_id FROM hipokratija_uvoz.uneseno WHERE batch = :'batch' AND tabela = 'appointments');
DELETE FROM hipokratija_uvoz.termini WHERE batch = :'batch';
DELETE FROM patients WHERE id IN (SELECT red_id FROM hipokratija_uvoz.uneseno WHERE batch = :'batch' AND tabela = 'patients');
DELETE FROM services WHERE id IN (SELECT red_id FROM hipokratija_uvoz.uneseno WHERE batch = :'batch' AND tabela = 'services');
DELETE FROM service_categories WHERE id IN (SELECT red_id FROM hipokratija_uvoz.uneseno WHERE batch = :'batch' AND tabela = 'service_categories');
DELETE FROM rooms WHERE id IN (SELECT red_id FROM hipokratija_uvoz.uneseno WHERE batch = :'batch' AND tabela = 'rooms');
DELETE FROM doctors WHERE id IN (SELECT red_id FROM hipokratija_uvoz.uneseno WHERE batch = :'batch' AND tabela = 'doctors');
DELETE FROM hipokratija_uvoz.uneseno WHERE batch = :'batch';
COMMIT;
