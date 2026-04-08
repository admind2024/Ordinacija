-- =============================================
-- Import pacijenata i historije procedura
-- Generisano iz Excel fajlova: dr Djordje, dr Sanja, Epilacija
-- =============================================

BEGIN;

-- =============================================
-- PACIJENTI (122 jedinstvenih)
-- =============================================

INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'a88781e4-73a0-4a02-aa7f-28e8e1784015', 'Jelena', 'Spaic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Spaic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'f96aa7a3-8a82-49ff-a569-b349927084a3', 'Sladjana', 'Bulatovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sladjana') AND LOWER(prezime) = LOWER('Bulatovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'd20b85c3-42e2-4e86-b853-b27bb0d54ca2', 'Belma', 'Djecevic', '+352661977779', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Belma') AND LOWER(prezime) = LOWER('Djecevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '6d19e664-4ee5-4ee6-af40-d64cc116223c', 'Violeta', 'Scekic', '+38269333036', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Violeta') AND LOWER(prezime) = LOWER('Scekic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'd6967334-c734-4afc-9852-25b873522646', 'Sanja', 'Rajkovic', '+38269018900', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sanja') AND LOWER(prezime) = LOWER('Rajkovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'ccc861cf-d057-47fd-8610-c5df2c7f4910', 'Danijel', 'Arnaut', '+38269414212', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Danijel') AND LOWER(prezime) = LOWER('Arnaut')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'c96fa290-69fa-4171-8a68-400f697e2287', 'Aleksandra', 'Jokanovic Korac', '+38263483484', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Aleksandra') AND LOWER(prezime) = LOWER('Jokanovic Korac')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '0b78bb4f-f609-4858-853f-4da9d71c54fe', 'Jelena', 'Vidic', '+38268433383', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Vidic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '2259d3cb-6637-48f4-9888-814adcb5cb52', 'Jovana', 'Mrvosevic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jovana') AND LOWER(prezime) = LOWER('Mrvosevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '2ae759d8-8125-46c1-8368-0bee9bd00513', 'Sofija', 'Bulatovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sofija') AND LOWER(prezime) = LOWER('Bulatovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '92ab2824-183f-4818-9b5a-be4c8358fe0c', 'Scekic', 'Vileta', '+38269333036', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Scekic') AND LOWER(prezime) = LOWER('Vileta')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '0ca42ebc-48e1-48bf-ad81-632a5773932a', 'Megert', 'Stefana', '+35795930469', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Megert') AND LOWER(prezime) = LOWER('Stefana')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '8d0bc29c-d90d-4ff4-b866-eab1b35e30cf', 'Jelena', 'Sekulic', '+38269962388', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Sekulic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'fab9730c-945e-49e0-a73e-86853d547c1d', 'Milica', 'Lucic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milica') AND LOWER(prezime) = LOWER('Lucic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'f1194c6e-3eb6-4360-8495-8c5e5a20780d', 'Gordana', 'Stojanovic', '+38267744527', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Gordana') AND LOWER(prezime) = LOWER('Stojanovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'fe3b699f-1167-497e-ac72-8c1843226a1f', 'Andjela', 'Pejovic', '+38267756755', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andjela') AND LOWER(prezime) = LOWER('Pejovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'a884bb0f-9f7b-4c2e-a7de-4620c96fec65', 'Dragana', 'Novakovic', '+38267645821', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Dragana') AND LOWER(prezime) = LOWER('Novakovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'f0aa3a5c-37ca-4c92-bd41-b0c9928a213f', 'Vojicic', 'Blazo', '+38267631610', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Vojicic') AND LOWER(prezime) = LOWER('Blazo')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'aa3e4e9e-31ff-4baa-9cd3-8926237668b9', 'Iskra', 'Zekovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Iskra') AND LOWER(prezime) = LOWER('Zekovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'a4138c73-3613-466d-af19-e4e9dcd92027', 'Gabrijela', 'Ajkovic', '+38267511702', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Gabrijela') AND LOWER(prezime) = LOWER('Ajkovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '2b0f7486-db5e-46c5-ab2e-eee11f36f925', 'Jelena', 'Saveljic', '+38269814664', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Saveljic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '52182ebe-1a70-4ffe-b339-8d564c0610f0', 'Milena', 'Ucovic', '+38267652242', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milena') AND LOWER(prezime) = LOWER('Ucovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'dac201da-a96a-453d-84f9-b9d0e1b90d81', 'Popovic', 'Andjela', '+38269460778', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Popovic') AND LOWER(prezime) = LOWER('Andjela')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '4a406589-ddb2-4af0-b16f-436c91001044', 'Tomicic', 'Nena', '+38267355998', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Tomicic') AND LOWER(prezime) = LOWER('Nena')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'd13d2dce-68ec-42f6-b3f6-574eda0579e6', 'Poleksic', 'Filip', '+38267634638', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Poleksic') AND LOWER(prezime) = LOWER('Filip')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'b946aa9d-7836-4b2c-99ad-55bb082482fc', 'Vulas', 'Vesna', '+38269673408', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Vulas') AND LOWER(prezime) = LOWER('Vesna')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'cbcaed6d-37b8-4283-a632-b5e8f785f9a9', 'Pavlicevic', 'Vesna', '+38267527478', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Pavlicevic') AND LOWER(prezime) = LOWER('Vesna')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '432daa16-6503-4c67-9ac0-275e9bee7d84', 'Djoljaj', 'Aleksandar', '+38268738005', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Djoljaj') AND LOWER(prezime) = LOWER('Aleksandar')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '3b270bc8-6b8b-4b2b-8296-3e67a9299fa8', 'Ajkovic', 'Gabriela', '+38267511702', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ajkovic') AND LOWER(prezime) = LOWER('Gabriela')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'eb7d72b9-c6cd-4355-a96b-9cf7ede982e7', 'Petrovic', 'Maja', '+38267405868', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Petrovic') AND LOWER(prezime) = LOWER('Maja')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '8ccdd580-aa9c-4ea3-abb6-c0951ecec901', 'Eren', 'Acikqoz', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Eren') AND LOWER(prezime) = LOWER('Acikqoz')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '17d32d6e-c398-4ea1-9b72-1d7275f2e3ae', 'Labovic', 'Milena', '+38267422922', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Labovic') AND LOWER(prezime) = LOWER('Milena')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'd15c679a-a831-4ec1-a2f3-6934af8410dd', 'Sergej', 'Volkov', '+38267255211', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sergej') AND LOWER(prezime) = LOWER('Volkov')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '6ea03e26-463b-40f9-80b1-746546c7918e', 'Milena', 'Ljutica', '+38269835555', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milena') AND LOWER(prezime) = LOWER('Ljutica')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '531dfd81-795e-4f54-8594-8d9a3d823263', 'Maja', 'Prelevic', '+38269111818', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Maja') AND LOWER(prezime) = LOWER('Prelevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'b0f00df4-e363-4ad3-81ce-4ced71e1f8fc', 'Jelena', 'Racic', '+38267287065', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Racic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '0bf9504e-065b-487d-bd46-ce36bafdd5b9', 'Milena', 'Raicevic', '+38267909036', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milena') AND LOWER(prezime) = LOWER('Raicevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '261785e1-767b-4170-92cf-c5d01ca3dd6d', 'Stojakovic', 'Katarina', '+38267030683', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Stojakovic') AND LOWER(prezime) = LOWER('Katarina')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '5bfefc45-e4aa-44ea-91c5-2234e257a697', 'Djurovic', 'Tamara', '+38267310432', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Djurovic') AND LOWER(prezime) = LOWER('Tamara')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'a9c3d0bb-bca2-4242-9a25-79fdc9de721b', 'Andrea', 'Magdelinic', '+38268632712', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andrea') AND LOWER(prezime) = LOWER('Magdelinic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'c2738285-956b-4730-8064-19e20422d5d5', 'Ivana', 'Stankovic', '+38267669603', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ivana') AND LOWER(prezime) = LOWER('Stankovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '97d8f824-8e14-43f2-9087-82152469969a', 'Leila', 'Vujisic', '+38267022320', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Leila') AND LOWER(prezime) = LOWER('Vujisic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '41531848-f045-437e-931e-3d14224eedfb', 'Maras', 'Jelena', '+38267185823', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Maras') AND LOWER(prezime) = LOWER('Jelena')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '768852ba-8d4c-4414-ba2a-b20824285ba8', 'Kuzman', 'Miruna', '+38269170694', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Kuzman') AND LOWER(prezime) = LOWER('Miruna')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'f48d583a-fc5e-43ad-8ef8-89a424b0be06', 'Helena', 'Sinistajn', '+38267999760', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Helena') AND LOWER(prezime) = LOWER('Sinistajn')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '3ed27aa4-37da-46fe-a5f5-067c69c1faa2', 'Andrijana', 'Jurovicki', '+38267031772', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andrijana') AND LOWER(prezime) = LOWER('Jurovicki')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '6b68a503-88ae-4700-9b99-5eef1c3de44f', 'Milena', 'Jovicevic', '+38267385772', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milena') AND LOWER(prezime) = LOWER('Jovicevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'eb6ca568-9d5f-493e-9b86-342ea9a15d9c', 'Smolovic', 'Milica', '+38267478557', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Smolovic') AND LOWER(prezime) = LOWER('Milica')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'fad6b375-3707-4000-96c1-925c3de51eeb', 'Markovic', 'Ivana', '+38267017775', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Markovic') AND LOWER(prezime) = LOWER('Ivana')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '82a8fffd-cfb3-47f1-be12-553142649e9b', 'Anja', 'Jovanovic', '+38269303603', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Anja') AND LOWER(prezime) = LOWER('Jovanovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'de2c8ab6-6d00-49ae-bafb-4593a943a49f', 'Iva', 'Puric', '+38267617473', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Iva') AND LOWER(prezime) = LOWER('Puric')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '02e7cbfe-fb3e-418d-b82e-fd6dc275ceb6', 'Bogavac', 'Dijana', '+38269472286', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Bogavac') AND LOWER(prezime) = LOWER('Dijana')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '055794ab-be97-4332-b5ac-a35ce5bd6af8', 'Milica', 'Grdinic', '+38269711878', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milica') AND LOWER(prezime) = LOWER('Grdinic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'e5772942-8b62-414c-97ae-4677e1b655ca', 'Nenezic', 'Milica', '+38269759749', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Nenezic') AND LOWER(prezime) = LOWER('Milica')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '4c9e22d7-a0b3-4a63-b5e6-f5c867068f7c', 'Milos', 'Kraljevic', '+38269303504', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milos') AND LOWER(prezime) = LOWER('Kraljevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '0233a56c-460c-49d6-a487-4b97ab8d4264', 'Radmila', 'Petrovic', '+38269915000', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Radmila') AND LOWER(prezime) = LOWER('Petrovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'd7991e03-9118-400f-8bbe-44ce8ee505e3', 'Dijana', 'Arsic', '+38268642588', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Dijana') AND LOWER(prezime) = LOWER('Arsic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'd51c66ba-722b-4ed9-a6ce-dcb2083f1f35', 'Sanja', 'Besovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sanja') AND LOWER(prezime) = LOWER('Besovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '91189712-ae7a-4c46-b9b0-e6b29dfa980f', 'Lenka', 'Bobar', '+38267860489', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Lenka') AND LOWER(prezime) = LOWER('Bobar')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '7e8314c0-5730-4caa-b5a1-299765db061a', 'Anja', 'Maros', '+38267104744', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Anja') AND LOWER(prezime) = LOWER('Maros')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '1712efb0-bbcb-4491-8ab4-f2ce486f0e70', 'Milena', 'Radulovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milena') AND LOWER(prezime) = LOWER('Radulovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'b48b82bb-9ec3-4fc5-b7d8-2dc1d8b42f38', 'Ljutica', 'Milena', '+38269835555', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ljutica') AND LOWER(prezime) = LOWER('Milena')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '6ba0f860-9d11-4a6f-990a-bd1df98db5c2', 'Vanja', 'Scepanovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Vanja') AND LOWER(prezime) = LOWER('Scepanovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '43fb877a-d7ed-4132-a817-fcbe33e3017f', 'Anastasija', 'Vujovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Anastasija') AND LOWER(prezime) = LOWER('Vujovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'c2282583-207c-42b3-88da-8782049cee3d', 'Petar', 'Belada', '+38267873380', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Petar') AND LOWER(prezime) = LOWER('Belada')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '19771cf7-ad7c-4bf3-8487-d4b19c05c5da', 'Ivana', 'Kukric', '+382641224051', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ivana') AND LOWER(prezime) = LOWER('Kukric')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '0643a331-8f1c-4504-ad28-4d611fbeb322', 'Mia', 'Jovanovic', '+38269303533', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Mia') AND LOWER(prezime) = LOWER('Jovanovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '18f696ef-2eb6-446b-b37f-75648dee3280', 'Katarina', 'Boricic', '+38267189029', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Katarina') AND LOWER(prezime) = LOWER('Boricic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'bf09039d-f82b-4d6a-94a3-407713d41fad', 'Lidija', 'Pavlovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Lidija') AND LOWER(prezime) = LOWER('Pavlovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '3dc710f3-580a-4ce3-b8f9-498205fb2811', 'Anton', 'Jurovicki', '+38267031130', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Anton') AND LOWER(prezime) = LOWER('Jurovicki')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'e1802f45-3c08-46bc-adbb-cff568514576', 'Iva', 'Zvicer', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Iva') AND LOWER(prezime) = LOWER('Zvicer')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '8b5354a0-cd19-4d5d-bcf6-34451d1fdc29', 'Dina', 'Diglisic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Dina') AND LOWER(prezime) = LOWER('Diglisic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '0777135c-5b3a-4f05-83d2-29306ba6ffff', 'Obradovic', 'Jelena', '+393297787681', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Obradovic') AND LOWER(prezime) = LOWER('Jelena')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '12a94591-af28-4944-abc3-27309400cc2a', 'Sandra', 'Dedic', '+38267443377', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sandra') AND LOWER(prezime) = LOWER('Dedic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'a6af93a2-ece9-4194-8350-ff7cb3399821', 'Lala', 'Dubljevic', '+38268058356', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Lala') AND LOWER(prezime) = LOWER('Dubljevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'fcf3482e-15e0-4b57-850e-474d668795d8', 'Katarina', 'Krstovic', '+38269795219', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Katarina') AND LOWER(prezime) = LOWER('Krstovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'e4ec7f3e-2d8c-45fe-82e1-c3415a046857', 'Jelena', 'Maras', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jelena') AND LOWER(prezime) = LOWER('Maras')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '3e315820-201b-4ca8-b2c8-033fd93ef1a2', 'Tijana', 'Delevic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Tijana') AND LOWER(prezime) = LOWER('Delevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '90e1fbfb-940f-411a-9991-8bf8ce707ea8', 'Andjela', 'Popovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andjela') AND LOWER(prezime) = LOWER('Popovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '7c67fc09-8857-4784-a957-44717faacab4', 'Tea', 'Jovovic', '+38267842067', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Tea') AND LOWER(prezime) = LOWER('Jovovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '8b6eb39d-cb23-4def-9fc5-05e4424aa3b7', 'Strugar', 'Andjela', '+38267873380', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Strugar') AND LOWER(prezime) = LOWER('Andjela')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '11a69c8b-0815-4ae6-be99-292e4b739706', 'Andrea', 'Marojevic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andrea') AND LOWER(prezime) = LOWER('Marojevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '68d9749a-e3d8-4be5-a43e-1099fad07b8b', 'Milic', 'Zorka', '+38269700075', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milic') AND LOWER(prezime) = LOWER('Zorka')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '5019ed5a-e2d0-4d1e-b42f-d1f5f2a4a9a0', 'Maja', 'Petrovic', '+38267405868', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Maja') AND LOWER(prezime) = LOWER('Petrovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'f90a0bf6-4689-4a6e-bcdd-d36cbf29f8f1', 'Zana', 'Bajceta', '+38268853565', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Zana') AND LOWER(prezime) = LOWER('Bajceta')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '93c3878f-236f-4945-a115-013c4df74db2', 'Jovanka', 'Rdicevic', '+38267399933', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jovanka') AND LOWER(prezime) = LOWER('Rdicevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '6421e79c-2677-4e04-9cbb-088aeaaeb8d1', 'Djurovic', 'Biljana', '+38267255084', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Djurovic') AND LOWER(prezime) = LOWER('Biljana')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '5c05bc15-f532-4629-98d3-ab09cc71ac44', 'Sneza', 'Dubljevic', '+38268837123', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sneza') AND LOWER(prezime) = LOWER('Dubljevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '688432cd-b51a-4d33-b0cb-2753d8b0b862', 'Ivana', 'Mugosa', '+38267894603', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ivana') AND LOWER(prezime) = LOWER('Mugosa')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '2fe1ad0e-d5f6-4876-bdae-fc86b21d64ac', 'Jana', 'Cvijic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jana') AND LOWER(prezime) = LOWER('Cvijic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '796f0899-099e-44d2-8ea0-1cbc8f3e5a99', 'Andrea', 'Kljajevic', '+38269612873', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andrea') AND LOWER(prezime) = LOWER('Kljajevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'ecf06259-5149-46a5-b661-106d1194cdf4', 'Sladjana', 'Spanjevic', '+38267644040', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sladjana') AND LOWER(prezime) = LOWER('Spanjevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '6b9529a6-b321-4f28-99d8-a2ff82f8d921', 'Vujovic', 'Aleksandar', '+38267333971', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Vujovic') AND LOWER(prezime) = LOWER('Aleksandar')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '7a2279cb-ccc5-42e9-be31-1ceb293c35c2', 'Djurisic', 'Ivona', '+38269838223', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Djurisic') AND LOWER(prezime) = LOWER('Ivona')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'bc656fba-39b6-4ccc-a1da-62038a0cf986', 'Milosevic', 'Campar Iva', '+38267400080', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Milosevic') AND LOWER(prezime) = LOWER('Campar Iva')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '40e6760b-42ef-41bb-9426-22d9efc967fa', 'Vera', 'Milosevic', '+38267615501', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Vera') AND LOWER(prezime) = LOWER('Milosevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '1695af32-03b8-4a0f-951a-026419cd9e57', 'Marija', 'Dabic', '+38269776690', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Marija') AND LOWER(prezime) = LOWER('Dabic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '0db8f653-1c67-4b92-ba44-b3779f4432af', 'Mina', 'Tomasevic', '+38269333097', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Mina') AND LOWER(prezime) = LOWER('Tomasevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '54a74d86-e5f9-4353-a745-7cdb50d692d6', 'Dalida', 'Mucic', '+38268448444', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Dalida') AND LOWER(prezime) = LOWER('Mucic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '81c990a9-76d0-4e6e-8812-1f478be0db37', 'Ivanovic', 'Ana', '+38267202020', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ivanovic') AND LOWER(prezime) = LOWER('Ana')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'b370e3f3-b238-4bc3-8a2d-5c986ecbf2fd', 'Sonja', 'Bajraktarovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Sonja') AND LOWER(prezime) = LOWER('Bajraktarovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '9063f139-6378-4cfc-a011-123b9a5596e5', 'Kristina', 'Vucinic', '+38269215355', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Kristina') AND LOWER(prezime) = LOWER('Vucinic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '601d681f-16aa-40e6-954d-6f877c875330', 'Bojana', 'Maras', '+38268100603', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Bojana') AND LOWER(prezime) = LOWER('Maras')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'ebd15f5c-9de2-49b0-8bd9-18658d7e5f2d', 'Maja', 'Milos', '+38268101941', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Maja') AND LOWER(prezime) = LOWER('Milos')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '1bffa14d-2e39-45a6-a11a-b7fecd037fd3', 'Iva', 'Milosevic Campar', '+38267400080', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Iva') AND LOWER(prezime) = LOWER('Milosevic Campar')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'a2eea69c-d7a2-4a67-9f59-7566d3a1045d', 'Stanisic', 'Sara', '+38267483393', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Stanisic') AND LOWER(prezime) = LOWER('Sara')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'b6a98b0c-f4b8-4e90-bd05-8da3e6d02619', 'Bulatovic', 'Tijana', '+38267052301', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Bulatovic') AND LOWER(prezime) = LOWER('Tijana')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '63eac6a8-eae1-4e5a-a8af-a0e0c1fb19b7', 'Nikoleta', 'Perovic', '+38269875503', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Nikoleta') AND LOWER(prezime) = LOWER('Perovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '4a2ee775-956b-44f3-a3a4-efc1a3a4c0ef', 'Danka', 'Knezevic', '+38269020390', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Danka') AND LOWER(prezime) = LOWER('Knezevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '5f0b852b-4469-4349-a524-c8bb714f3428', 'Kostic', 'Jovana', '+38267419777', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Kostic') AND LOWER(prezime) = LOWER('Jovana')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '94920b33-047b-46fa-b895-ec067da4ee40', 'Zivkovic', 'Ivona', '+38267334994', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Zivkovic') AND LOWER(prezime) = LOWER('Ivona')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'dcc414a0-9edd-4569-9809-dd0918f63b68', 'Pesic', 'Anja', '+38267425905', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Pesic') AND LOWER(prezime) = LOWER('Anja')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'ed4d7948-0827-4e98-8996-008e9c7844a7', 'Ema', 'Kurgas', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ema') AND LOWER(prezime) = LOWER('Kurgas')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'f993970d-ebdd-4f7c-ae98-aee1d1afefaa', 'Nikolija', 'Miranovic', '+38268874447', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Nikolija') AND LOWER(prezime) = LOWER('Miranovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '9eea0cf0-71ef-4cfc-b5b9-8a5b6bc398ff', 'Jovana', 'Kostic', '+38267419777', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Jovana') AND LOWER(prezime) = LOWER('Kostic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'bf891feb-8faa-4016-9bfb-f7e03e35ec95', 'Stojanovic', 'Gordana', '+38267744527', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Stojanovic') AND LOWER(prezime) = LOWER('Gordana')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT 'd3b8a7fd-ff99-43a6-a763-bd28b59b078d', 'Marina', 'Vukovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Marina') AND LOWER(prezime) = LOWER('Vukovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '546379fe-d19b-4650-90f4-93a8285839b3', 'Kristina', 'Markovic', '', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Kristina') AND LOWER(prezime) = LOWER('Markovic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '0082a563-1ef5-4b2a-9cbc-79105fc5d383', 'Andjela', 'Lucic', '+38268069643', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Andjela') AND LOWER(prezime) = LOWER('Lucic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '960f3a69-d818-4139-a205-67e834968e28', 'Ivana', 'Kovacevic', '+38269887711', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Ivana') AND LOWER(prezime) = LOWER('Kovacevic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '0e831b19-f12e-4cd8-a402-e34cd6161230', 'Nadja', 'Pesic', '+38267809005', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Nadja') AND LOWER(prezime) = LOWER('Pesic')
);
INSERT INTO patients (id, ime, prezime, telefon, popust, pocetno_stanje, saldo, tagovi, gdpr_saglasnost)
SELECT '582a703a-5e0e-445c-96e9-a0a9d2584517', 'Anja', 'Zivanovic', '+38269156098', 0, 0, 0, ARRAY[]::text[], false
WHERE NOT EXISTS (
  SELECT 1 FROM patients WHERE LOWER(ime) = LOWER('Anja') AND LOWER(prezime) = LOWER('Zivanovic')
);

-- =============================================
-- HISTORIJA PREGLEDA / PROCEDURA (143 zapisa)
-- =============================================

INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '8a703b3b-b099-4ea0-a389-e0701fb326b8',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '102449f7-2362-4fc1-b680-1a2921d5fe26'),
  '2026-03-03',
  '0,65ml alergan',
  'Cijena: 40EUR (kes) | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Spaic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '9f6cf4ce-9f2d-4f51-911b-db4de91015ab',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '910709c5-304a-40bf-83b7-5aedc62c210c'),
  '2026-03-03',
  'kontrola btx 0,45ml alergan',
  'Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sladjana') AND LOWER(p.prezime) = LOWER('Bulatovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'a7a085eb-a1c9-4691-b66a-c872ae66bc6a',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '05f6841a-6b24-456d-8eaa-6e7012cd0b03'),
  '2026-03-10',
  'btx 3 regije- Alergan 1,2ml',
  'Cijena: 250EUR (kes) | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Belma') AND LOWER(p.prezime) = LOWER('Djecevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'c71a6d95-aa53-4714-8e59-fef5d926bc19',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'c5b598b1-4591-4dea-a98e-c31ce15480c2'),
  '2026-03-10',
  'alergan 1.5',
  'Cijena: 200EUR (kes) | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Violeta') AND LOWER(p.prezime) = LOWER('Scekic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '32915e29-2e16-4813-9285-2f75d9686471',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '28afb686-e246-4f73-9c4b-2ecf457cfebf'),
  '2026-03-10',
  'angkor 1ml',
  'Cijena: 130EUR (kes) | 100E KES | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sladjana') AND LOWER(p.prezime) = LOWER('Bulatovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'c45d87bd-ec83-4c89-a989-77d633bb8c00',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '2c8f1689-89d3-487e-bb88-382fdc61aa69'),
  '2026-03-11',
  'twine- 2 flakona',
  'Cijena: 250EUR (kartica) | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sanja') AND LOWER(p.prezime) = LOWER('Rajkovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'e6af6458-f6f0-4756-bce4-9173afb76b31',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '7f53fc66-9614-4ab9-9aed-e237f542edd5'),
  '2026-03-11',
  'egzozomi-2ml',
  'Cijena: 250EUR (kes) | 1.tretman | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Danijel') AND LOWER(p.prezime) = LOWER('Arnaut')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '95a958b5-2ecb-4e08-8bb2-f64222d93987',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '43e6f2e6-2613-47d4-a1a8-a545248fce67'),
  '2026-03-11',
  'alergan 0,35ml',
  'kontrola | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Aleksandra') AND LOWER(p.prezime) = LOWER('Jokanovic Korac')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'dfa70dd1-fbea-4218-816e-5d11aa652867',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'f4229e31-8b48-4a19-86bc-2b83df32e7bb'),
  '2026-03-11',
  'Viskoderm skinKoe 2,5ml',
  'Cijena: 150EUR (kes) | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Vidic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '3391da2b-247b-49dd-a489-eefdd798bebc',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '09510aed-5fec-4a27-840c-8f64c8409fe6'),
  '2026-03-17',
  'topljenje usana',
  'Cijena: 100EUR (kes) | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jovana') AND LOWER(p.prezime) = LOWER('Mrvosevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '996feec3-e547-4ae9-8ea4-4a0473e2848b',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'fd35f309-5bc9-4da6-8f60-c4bc04299b39'),
  '2026-03-18',
  'angkor 1ml',
  'Cijena: 130EUR (kes) | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sofija') AND LOWER(p.prezime) = LOWER('Bulatovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '923f5ac3-def8-4c27-a82c-773806757dcb',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'ba5e2a83-3086-474d-afff-0d6da846e137'),
  '2026-03-18',
  'Stzlage S1ml',
  'Cijena: 250EUR (kes) | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sladjana') AND LOWER(p.prezime) = LOWER('Bulatovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '04c1179e-0c7f-46d7-adc2-90b78f8a0766',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '5bb0a86f-4b06-4ca7-a5e5-7383e0a7d2fe'),
  '2026-03-18',
  'btx alergan 0,05ml+0.2 ml stilage M',
  'kontrola | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Aleksandra') AND LOWER(p.prezime) = LOWER('Jokanovic Korac')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '485da02e-4c76-471e-9a50-bdb732ea1e6f',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '3661b156-efb4-416e-8c41-dcd12dbb8b87'),
  '2026-03-24',
  'kontrola btx 0,3ml',
  'Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Scekic') AND LOWER(p.prezime) = LOWER('Vileta')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '769b346b-b753-45ed-8aa8-97cfb7a6973c',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'ddfc1ad2-0aef-4377-bc4c-011b4b5a1cb8'),
  '2026-03-24',
  'btxnabota 0,6ml',
  'Cijena: 100EUR (kes) | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Megert') AND LOWER(p.prezime) = LOWER('Stefana')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '07badf2b-cfd3-4062-88c9-7632e6d0ed5c',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '9088232a-6e04-4493-88bb-dd778d00da29'),
  '2026-03-25',
  'kontrola',
  'Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Spaic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'b42d1ed2-7ce3-4e15-8a86-2b8a9eb2bb37',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '328201ee-cf8e-4c4a-ba83-7ecad6479159'),
  '2026-03-25',
  'kontrola',
  'Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jovana') AND LOWER(p.prezime) = LOWER('Mrvosevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '64dc3874-6a9b-462b-bf88-a7ff80ea9048',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '9696db8c-f6ec-46aa-ab9c-fba9f8f1fa57'),
  '2026-03-25',
  'btxnabota 0,5ml',
  'kontrola | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Sekulic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'ba5ae921-e72d-4417-88b0-82318bccc64f',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'd882bfc9-9105-4745-92e2-404aa6847c54'),
  '2026-03-31',
  '3ml nabota - hiperhidroza saka',
  'Cijena: 250EUR (kartica) | Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milica') AND LOWER(p.prezime) = LOWER('Lucic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'e615aaae-b686-437f-8af1-0fd304cb4d06',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'a66bf29f-7bd9-4bd8-9dcf-7d747f08ae8e'),
  '2026-03-31',
  '0.5ml nabota - kontrola botoksa',
  'Izvor: Dr Djordje Kaludjerovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sladjana') AND LOWER(p.prezime) = LOWER('Bulatovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '03c7ede3-7729-4566-a0ec-c0683e68de04',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'f88e4cb9-12ef-4e82-86e6-4955d9b3b981'),
  '2026-03-02',
  'clear lift',
  'Cijena: 75EUR (kes) | dr Sanja rekla 75e | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Gordana') AND LOWER(p.prezime) = LOWER('Stojanovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '084a24c8-19f5-4bfb-a05c-a6f958ead901',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'bc737e1c-f122-400f-99a0-a8f75387aa79'),
  '2026-03-02',
  'kontola-predhodno uklanjanje bradavica',
  'Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Andjela') AND LOWER(p.prezime) = LOWER('Pejovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'e1f03f5e-7fcf-4c01-baf1-6dd445a155b8',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '82ef79ae-4081-4d69-a5e5-072d46da0aa9'),
  '2026-03-02',
  'kontr.pregled',
  'Cijena: 30EUR (kes) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Dragana') AND LOWER(p.prezime) = LOWER('Novakovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '004da17a-1727-4f4f-9275-1a565ad44578',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '276f65e7-17bd-4e76-b331-ce2bc80b484e'),
  '2024-03-06',
  'pregled',
  'MilenIN ZET | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Vojicic') AND LOWER(p.prezime) = LOWER('Blazo')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '3be30f28-664d-40cb-85fd-cc42cd2a505b',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '483f0277-6a81-4b60-acae-76b59032fee6'),
  '2024-03-06',
  'lear skin',
  'Cijena: 160EUR (kes) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Iskra') AND LOWER(p.prezime) = LOWER('Zekovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '3e2ad783-70fa-4921-8eaf-e6755b0a3c95',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '29b994c9-1646-40ba-a351-a84d6f556d86'),
  '2026-03-09',
  'pregled',
  'povodom dana zena | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Gabrijela') AND LOWER(p.prezime) = LOWER('Ajkovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '9efbc3d3-5159-4201-96c2-7d054cc1dacf',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '32195013-1e5f-438a-8d61-d2073977fdaf'),
  '2026-03-09',
  'pregled mladeza',
  'povodom dana zena | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Saveljic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '1dbcb899-b086-48a1-a846-aa657f6065d3',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '80f46614-ed2c-4356-b198-8431b626b771'),
  '2026-03-09',
  'kontrola',
  'Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Ucovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '722e3e39-e8f1-4581-873c-2adec1666702',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'b3ff9929-24cd-43a0-aafd-66bee182be5d'),
  '2026-03-13',
  'clear skin',
  'Cijena: 200EUR (kes) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Popovic') AND LOWER(p.prezime) = LOWER('Andjela')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '652053a8-71ca-4699-8391-34b17c035f66',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '2794a37f-f220-4d40-852f-1d78560bc233'),
  '2026-03-13',
  'CLEAR SKIN',
  'Cijena: 200EUR (bon/vaucer) | POKL.VAUCER BR No015 | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Tomicic') AND LOWER(p.prezime) = LOWER('Nena')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'b60cb7a6-7605-4f7a-b07c-ad9bbbafb57a',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'a660dd9c-673b-41e6-a367-ef4bf11ee3b8'),
  '2026-03-13',
  'predhodno uklanjanje bradavica',
  'Cijena: 80EUR (kartica) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Poleksic') AND LOWER(p.prezime) = LOWER('Filip')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '48dd7750-95ae-4d9e-af55-646a49ad0a64',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '2d360a13-9d2f-447d-97b7-e9f5cbae7f7d'),
  '2026-03-13',
  'dvl',
  'Cijena: 135EUR (kes) | 10% dala dr | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Vulas') AND LOWER(p.prezime) = LOWER('Vesna')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '3a63a807-711e-4dfa-9d8d-abd4211f3af8',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'ebbf977b-efde-47bc-b090-c028a8490779'),
  '2026-03-16',
  'dvl',
  'Cijena: 150EUR (kes) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Pavlicevic') AND LOWER(p.prezime) = LOWER('Vesna')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '49ef62d1-1746-48e1-869d-6c7b198eed59',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'e58f4ce5-3c6f-4dfc-8899-3110e394e818'),
  '2026-03-20',
  'kontr.pregled',
  'Cijena: 30EUR (kes) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Djoljaj') AND LOWER(p.prezime) = LOWER('Aleksandar')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'a7c39e40-e89f-4ca8-99eb-67cda7dce86e',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '7dfc65f4-b4ec-4d53-a101-304af2491dbc'),
  '2026-03-23',
  'kontr.pregled',
  'Cijena: 30EUR (kes) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Ajkovic') AND LOWER(p.prezime) = LOWER('Gabriela')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '67009081-973d-4563-bc5d-881d50f78251',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '0581fc58-29fa-48d6-bb4b-a5f53f87ef40'),
  '2026-03-23',
  'pregled mladeza',
  'Cijena: 40EUR (kartica) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Petrovic') AND LOWER(p.prezime) = LOWER('Maja')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '08cebd81-e2eb-459c-bfd5-202ca53f843f',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'd07ab340-8a00-4bf3-8baa-b2870cea95f2'),
  '2026-03-27',
  'prvi pregled',
  'Cijena: 50EUR (kes) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Eren') AND LOWER(p.prezime) = LOWER('Acikqoz')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'f5989305-e6c5-46a1-a501-8329924096ae',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '93613633-0cfb-406d-bea8-4003704e3556'),
  '2026-03-27',
  'clear lift',
  'Cijena: 200EUR (kartica) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Labovic') AND LOWER(p.prezime) = LOWER('Milena')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'ed883ca5-e142-4446-a429-65cabbed9912',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '913f6520-ab48-4b26-bb3e-d76a6e379ee2'),
  '2026-03-28',
  'clear skin',
  'Cijena: 200EUR (kes) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sergej') AND LOWER(p.prezime) = LOWER('Volkov')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '391985c3-0aa8-42e9-b454-bf35c346f15d',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '1f116b20-6bd6-4d4c-bffa-408e84b36bf8'),
  '2026-03-28',
  'clear skin',
  'Cijena: 200EUR (kes) | kes kucano | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Ljutica')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '87d3a1aa-0597-4748-888b-558a3c8cb6ea',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '99bfe5bd-8140-4ca4-bf55-3f489d9413b3'),
  '2026-03-28',
  'uklanjane vir.bradavica- do 5 promjena',
  'Cijena: 80EUR (kes) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Violeta') AND LOWER(p.prezime) = LOWER('Scekic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '72fe1b4b-6080-41e5-b830-08249ec938fa',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '25f7a5b1-a444-42d6-9d2c-02cc50d2f4d7'),
  '2026-03-28',
  'uklanjanje vir.bradavica',
  'Cijena: 80EUR (kes) | Izvor: Dr Sanja Vujanovic',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Maja') AND LOWER(p.prezime) = LOWER('Prelevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '03de1c73-78a6-4796-8241-1da93e018aec',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '05bd4afb-15ef-42f8-a9f2-9bfc95530ed3'),
  '2026-03-02',
  'ep.pola nogu',
  'placeno sve | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Racic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '7d20d60b-058c-4b7e-a09f-03fa89e209aa',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '8a1cdbb8-20ab-47c7-b2cc-520b6649528b'),
  '2026-03-03',
  'ep. velikih regija',
  'placeno sve | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Raicevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '93c05ce4-235f-4460-864b-96e09e99fee8',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '0c94b0d6-8393-4264-9232-9773d9987875'),
  '2026-03-03',
  'ep. cijelog tijela',
  'Cijena: 445EUR (kartica) | dug 445 preostalo na trecem tretmanu | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Stojakovic') AND LOWER(p.prezime) = LOWER('Katarina')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '77c25be7-1412-4de8-aa01-74ac65b2d5e4',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '55798947-a598-4ce7-8613-e9023b7eb942'),
  '2026-03-03',
  'ep. cijelog tijela',
  'placeno sve | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Djurovic') AND LOWER(p.prezime) = LOWER('Tamara')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'cb2e431d-dd02-41a1-a5a8-cfe82253e4f7',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'a44c4441-9d63-45a2-8c1c-757216268b93'),
  '2026-03-04',
  'ep. intime',
  'Cijena: 50EUR (kes) | PLACA POJEDINACNO | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Andrea') AND LOWER(p.prezime) = LOWER('Magdelinic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'edec6bc8-c57b-463a-8e23-7a8f08c01214',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'df1ee281-4138-4f3d-97ea-329a4f5fc593'),
  '2026-03-05',
  'ep. velikih regija',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Ivana') AND LOWER(p.prezime) = LOWER('Stankovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '1fb203f8-518d-41e6-8e93-a9d30b34dd53',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '140bf27f-11d6-4228-a55a-0afa32812455'),
  '2026-03-05',
  'ep.malih regija',
  'placeno sve | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Leila') AND LOWER(p.prezime) = LOWER('Vujisic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '9e8d6d5d-2e82-495c-907c-bab05b5c562e',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '9f380956-20d6-4a8d-80eb-8b39dd76c605'),
  '2026-03-05',
  'ep. cijelog tijela',
  'placeno sve | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Maras') AND LOWER(p.prezime) = LOWER('Jelena')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '86f0f0ff-ef00-446b-a49e-ad31bc1217e2',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '7525d2b1-8e2d-4f20-a63f-5866a475893e'),
  '2026-03-05',
  'ep. cijelog tijela',
  'placeno sve | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Kuzman') AND LOWER(p.prezime) = LOWER('Miruna')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'adedf47e-5e00-4931-9a88-14d06b092362',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '4e1a73f5-202d-42b7-8111-06903c422de0'),
  '2026-03-06',
  'ep. velikih regija',
  'placeno sve | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Helena') AND LOWER(p.prezime) = LOWER('Sinistajn')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '11084477-4b11-4167-a9f8-79e0b170ec01',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '12d67dc8-26c6-4c9c-a747-37d68b62fb23'),
  '2026-03-06',
  'ep. cijelo tijelo',
  'placeno sve | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Andrijana') AND LOWER(p.prezime) = LOWER('Jurovicki')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'b460bfaf-14f7-46c0-b62c-2cde94750dbe',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '7df9dcf9-1ef3-42a3-b744-248e0a950291'),
  '2026-03-06',
  'ep. velikih regija',
  'placeno sve | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Jovicevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '11549a34-445c-487b-988a-7b8df433f5b0',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '6c7cdbc1-ce70-40dc-bb95-1c1562dc7274'),
  '2026-03-06',
  'ep.pazuh',
  'Cijena: 30EUR (kartica) | PLACA POJEDINACNO | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Smolovic') AND LOWER(p.prezime) = LOWER('Milica')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '9be9dae2-8472-4ef4-aa21-c0f05bf2d637',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '673ed8a8-97e3-4b2a-802c-e79e3e8a4245'),
  '2026-03-06',
  'ep. velikih regija',
  'placeno sve | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Markovic') AND LOWER(p.prezime) = LOWER('Ivana')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'bf73037f-0d3b-4274-baf8-103c243c9d1b',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '2ced76e0-20c9-4169-88bf-345cd9cf4d12'),
  '2026-03-09',
  'epilacija intimne regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Anja') AND LOWER(p.prezime) = LOWER('Jovanovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '13085198-999f-425d-b721-4862729a5500',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '4e09c7c0-b2be-42d0-8cb7-7f3d80ae4fe8'),
  '2026-03-09',
  'epilacija malih regija',
  'dug za paket za noge 250e | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Iva') AND LOWER(p.prezime) = LOWER('Puric')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'cd9e0528-9269-4269-89f4-f4f4aae739ab',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '23a3f709-bd31-474b-8595-4e56d1551941'),
  '2026-03-09',
  'epilacija malih regija',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Bogavac') AND LOWER(p.prezime) = LOWER('Dijana')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'c3eaa0b9-5ab7-4b44-9d6d-769ddeeb35e3',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'bb9fed69-8e5e-493a-b024-b45c637f0d5d'),
  '2026-03-10',
  'epil.pazuha,prepona i pola nogu',
  'Cijena: 180EUR (kartica) | dug jos 370e-to ce jos iz 2x | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milica') AND LOWER(p.prezime) = LOWER('Grdinic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'fa4935a2-54e6-4306-84ce-69a94e5739d8',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '51dbfc5b-dd1c-4073-8e5d-d40b2f34722f'),
  '2026-03-10',
  'epilacija malih regija',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Nenezic') AND LOWER(p.prezime) = LOWER('Milica')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'fac9edce-b88a-4d64-ba45-50ce7ebcaf05',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '7c92326e-be91-4e65-a9cf-0b00b42d03ad'),
  '2026-03-11',
  'epilacija gornji dio tijela',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milos') AND LOWER(p.prezime) = LOWER('Kraljevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'bea13742-888c-41bf-b430-f638a83c6a3a',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '307a6a25-e89a-4195-94b7-731c0754f204'),
  '2026-03-11',
  'epilacija cijelo tijelo',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Radmila') AND LOWER(p.prezime) = LOWER('Petrovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '3ee64544-fc39-44aa-b60e-4a05c27c24c2',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'dfa42bb4-30b1-4fdf-b35d-40c02e7602fb'),
  '2026-03-11',
  'ep. cijelo tijelo',
  'paket 7 tretmana-platit ce na sled.terminu | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Dijana') AND LOWER(p.prezime) = LOWER('Arsic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'a4ddfe49-c11b-4617-93f8-5e7fa387cfa5',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'b03f2478-14df-4b07-bfb5-c7200fa216f3'),
  '2026-03-12',
  'epilacija pazuha',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sanja') AND LOWER(p.prezime) = LOWER('Besovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'a1421d56-1e8e-48ca-8e42-7d152ad66ef5',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'd6e18ee5-db5c-47a6-b0f7-360ea01bdff1'),
  '2026-03-12',
  'epilacija pola nogu, intime i pazuha',
  'Cijena: 140EUR (kartica) | placa pojedinacno | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Lenka') AND LOWER(p.prezime) = LOWER('Bobar')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '913202dd-c0a1-464f-88c5-432075cc6544',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '63159585-6570-4315-b29d-a6677b43f759'),
  '2026-03-12',
  'epilacija velikih regija',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Anja') AND LOWER(p.prezime) = LOWER('Maros')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'f60aacc4-86cc-4834-99ef-42904553a47e',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'bfbe74d2-9972-4229-aca8-dc1e030796d9'),
  '2026-03-12',
  'epilacija lica',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Radulovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '747fbb39-f237-4ebb-b1b4-97191f2f364b',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'd3a5c167-ac60-4fec-9ba3-06334f605cf7'),
  '2026-03-12',
  'ep.pazuha',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Ljutica') AND LOWER(p.prezime) = LOWER('Milena')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '41b59d4b-ccea-466c-8a37-1e844064b1d4',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '7e6b274e-661b-4e31-be5a-f8cb2ed823ba'),
  '2026-03-12',
  'ep.pazuha i prepona',
  'na sledeci tretman plaxca | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Vanja') AND LOWER(p.prezime) = LOWER('Scepanovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'f1e73594-15cc-44a7-b1dd-e1698aae396e',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'c04a842f-d67c-4587-8af0-81a3e316bb9b'),
  '2026-03-12',
  'ep.pazuha i prepona',
  'Cijena: 100EUR (kes) | 200e na sledeco trettman | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Anastasija') AND LOWER(p.prezime) = LOWER('Vujovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'd0d5ee24-6913-4a56-b2c7-1c5c8951072a',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '1de2d77f-16c2-47c9-af8d-546f270e989b'),
  '2026-03-13',
  'epilacija lica',
  'placeno pola od paketa, danas drugi tretman | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Petar') AND LOWER(p.prezime) = LOWER('Belada')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '7bae2f2e-007e-4fe9-80d0-6ad0b6b7d9a2',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '46a82a90-1f17-460d-89f2-39eaba53efa8'),
  '2026-03-13',
  'epilacija nogu, intime i pazuha',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Ivana') AND LOWER(p.prezime) = LOWER('Kukric')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '0d138bb5-0bb5-4902-9caa-62b953426b44',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'dec7dfa9-d5ab-4f42-8238-1c8a2ec46aa3'),
  '2026-03-13',
  'epilacija intimne regije',
  'Cijena: 50EUR (kes) | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Mia') AND LOWER(p.prezime) = LOWER('Jovanovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '926b7eb5-afaa-496f-8de9-26c94e699b0b',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '3d7a660d-4b2c-4ade-aa56-6fab00348e80'),
  '2026-03-14',
  'epilacija male regije',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Katarina') AND LOWER(p.prezime) = LOWER('Boricic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'b68a5866-3f25-401c-9b39-f47b75d7cc64',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '003797a5-f43b-463c-8f06-1171bc62e117'),
  '2026-03-14',
  'epilacija velike regije',
  'ima dug 375e | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Lidija') AND LOWER(p.prezime) = LOWER('Pavlovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '62946f77-4cfa-4001-a72a-2a7069571ce4',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'cd8e8b09-f762-4dc7-926f-a226e56fc297'),
  '2026-03-14',
  'epilacija velike regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Anton') AND LOWER(p.prezime) = LOWER('Jurovicki')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'a6c24226-35c3-4aa6-9874-677837f3378e',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'b789290b-6309-4af0-bb5f-0d701dbb835d'),
  '2026-03-16',
  'epilacija male regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Iva') AND LOWER(p.prezime) = LOWER('Zvicer')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '7a733f09-446a-4d9c-93ee-a97b5a21a81b',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '6bae8713-211a-44b3-8156-fb74d4fdd0a3'),
  '2026-03-16',
  'ep. cijelo tijelo',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Dina') AND LOWER(p.prezime) = LOWER('Diglisic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '1a067295-4fbd-463f-b47c-69a6412f7c00',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '08a468c5-400d-4a9c-b2f2-6ebbe2d4414a'),
  '2026-03-16',
  'ep. cijelo tijelo',
  'Cijena: 200EUR (kes) | odrazvanje | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Obradovic') AND LOWER(p.prezime) = LOWER('Jelena')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '2f06dd75-95cd-464f-a034-a26249af2608',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '4300d9e9-fa24-4d6f-87cf-bb19d92edd08'),
  '2026-03-17',
  'ep. male regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sandra') AND LOWER(p.prezime) = LOWER('Dedic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '8a378e0c-85f7-4ba7-8f5e-827378965046',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'd68901b1-cce2-4ed8-b818-814fe94f3b37'),
  '2026-03-17',
  'ep. cijelo tijelo',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Maja') AND LOWER(p.prezime) = LOWER('Prelevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'ae9a1fb5-06d0-431a-b88b-e7d662ebcc60',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '921f1964-8e4e-42d1-bfbb-cfe1d883f891'),
  '2026-03-17',
  'ep. male regije',
  'Cijena: 445EUR (kes) | platila cijeli paket ( druga rata placena) | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Lala') AND LOWER(p.prezime) = LOWER('Dubljevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '8dca62ed-1a0d-40d8-abe2-f0104a7833b9',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '9f171e79-a686-4b2e-b6ed-2dc36e7cc7c9'),
  '2026-03-17',
  'epilacija male regije',
  'placen tretman | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Katarina') AND LOWER(p.prezime) = LOWER('Krstovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '2716138b-d1bc-4e99-b353-9b71e4e8845a',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'a66c07f4-fbd4-40fc-bb41-461b464885b6'),
  '2026-03-17',
  'epilacija velike regije',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Maras')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'a9da6616-ba7f-4d18-bb35-7c09c2cf54bd',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'd15812d4-9f7c-4b67-833f-bb60c2d2418c'),
  '2026-03-18',
  'ep[ilacija intime+pazuh',
  'Cijena: 30EUR (kartica) | epi.intima(dug jos 125e) pazuh placa pojedinacno | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Tijana') AND LOWER(p.prezime) = LOWER('Delevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '34bc2144-35e7-4123-83d5-146bd7b6bf9f',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '1d03c6bf-5f53-4785-a180-968517675bf0'),
  '2026-03-18',
  'ep. velikih regija i male regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Andjela') AND LOWER(p.prezime) = LOWER('Popovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'b2864966-f2a4-4fa3-9162-074757b15c25',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'f39366eb-0c21-4b8e-9e0f-ffe29e4eeaec'),
  '2026-03-18',
  'epilacija male regije',
  'Cijena: 525EUR (kartica) | placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Lidija') AND LOWER(p.prezime) = LOWER('Pavlovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '3cd0ee9c-11e7-4575-abc3-1849708f8e07',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '0e02ba95-0a5d-4a56-a476-9eaae41d310f'),
  '2026-03-18',
  'epilacija male regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jelena') AND LOWER(p.prezime) = LOWER('Racic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '49b9c1f0-12df-4689-a8ba-ea9c68a69881',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'b72a92c8-88d1-44cd-b9cb-c2abfff2bb52'),
  '2026-03-18',
  'epilacija male regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Tea') AND LOWER(p.prezime) = LOWER('Jovovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '7d50873f-594e-4b00-a026-a99136d3b107',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'e63b95a5-4acf-4935-ab6e-0844238e7185'),
  '2026-03-18',
  'epilacija velike regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Strugar') AND LOWER(p.prezime) = LOWER('Andjela')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'e46e8a12-ae33-412d-a616-1e890e363bd5',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'efd3cbba-5ef2-43ad-ab57-0e9547779be1'),
  '2026-03-18',
  'epilacija male i velike regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Andrea') AND LOWER(p.prezime) = LOWER('Marojevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'b0acb4c4-871f-4aca-9c02-b58ef82c58d2',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '5cb96c30-2d27-4884-90b3-18f06979e701'),
  '2026-03-18',
  'ep. cijelo tijelo',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milic') AND LOWER(p.prezime) = LOWER('Zorka')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'c296e0a7-1256-4eed-b47b-fb63a3c37342',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '85c6a3de-7142-4fa4-a3a8-0c750733655e'),
  '2026-03-18',
  'ep. male regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Ivana') AND LOWER(p.prezime) = LOWER('Stankovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '68e3826c-5d6e-4a92-b16a-02ab42200b61',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '79b4b266-11a1-493e-ad59-6eabd485bb33'),
  '2026-03-19',
  'epilacija male regije',
  'Cijena: 350EUR (kartica) | placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Maja') AND LOWER(p.prezime) = LOWER('Petrovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'ac252e19-ac72-4804-96c3-0feadcd8c16a',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'd88f01b6-42cd-4162-a0cc-15459ffe5877'),
  '2026-03-19',
  'epilacija velike regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Zana') AND LOWER(p.prezime) = LOWER('Bajceta')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'cd25f5c2-4611-427c-9824-6d2c75244cfe',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '7b54aa37-e48c-4cad-9765-a29f8bd351ef'),
  '2026-03-19',
  'ep.cijele ruke',
  'Cijena: 75EUR (kes) | PLACA POJEDINACNO | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jovanka') AND LOWER(p.prezime) = LOWER('Rdicevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'e56012fb-7994-4a46-a5fd-06cea87bda55',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '514ade80-f7e3-47ec-9fcf-82f7d4253252'),
  '2026-03-19',
  'ep. pola nogu',
  'platit ce paket sl.tretman | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Djurovic') AND LOWER(p.prezime) = LOWER('Biljana')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '161ded19-0c45-4ab8-993d-17b075440ece',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '85af8145-0bb6-47a2-b642-1e157b8cfc7b'),
  '2026-03-19',
  'ep.pola nogu',
  'platit ce paket sl.tretman | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sneza') AND LOWER(p.prezime) = LOWER('Dubljevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '411a2cd3-568e-4971-bae9-9d4e73e34c66',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'de6b0acd-c3b8-4fc9-ac53-b9ec550d88a2'),
  '2026-03-20',
  'epilacija nogu',
  'placeno pola od paketa | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Ivana') AND LOWER(p.prezime) = LOWER('Mugosa')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '671a1db4-0a6c-4b38-941b-bd4a7f89234d',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '456d3e9d-6a1a-49c1-9329-6c62f779345f'),
  '2026-03-20',
  'ep. cijelo lice',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jana') AND LOWER(p.prezime) = LOWER('Cvijic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'b72959a4-3e29-48a9-bf4a-b6175194c878',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '13284af4-6c86-4ddf-948f-eb7eb5ffb51f'),
  '2026-03-20',
  'ep. velike regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Andrea') AND LOWER(p.prezime) = LOWER('Kljajevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '5b213071-a948-41e0-86b4-9ee0b82ce10e',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '3e215ac6-6ce8-4635-8ad2-553cb87dbdb2'),
  '2026-03-20',
  'ep. ruku',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sladjana') AND LOWER(p.prezime) = LOWER('Spanjevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '56c02962-0080-4afe-9e6a-b98df0088cf4',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '7a808f5f-7533-4e3f-b365-657ede499949'),
  '2026-03-20',
  'epilacija male regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Vujovic') AND LOWER(p.prezime) = LOWER('Aleksandar')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '7e46b260-ee9b-4981-80bc-585a8e92b65f',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'a9bc78e0-2189-48b7-95df-7e57be7aac83'),
  '2026-03-20',
  'epilacija male regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Markovic') AND LOWER(p.prezime) = LOWER('Ivana')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '4c7c326f-cd33-4984-8bf3-7d8cc6a8438e',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '28147e67-307f-454d-aa8d-815dd2215bf9'),
  '2026-03-20',
  'epilacija male regije',
  'Cijena: 440EUR (kes) | placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Djurisic') AND LOWER(p.prezime) = LOWER('Ivona')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'ae21c1ad-9354-4b9f-9ebb-52c832323435',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'd97462dd-12b0-49a5-a75f-51ba638b8162'),
  '2026-03-21',
  'ep. pazuha 1 tretman',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milosevic') AND LOWER(p.prezime) = LOWER('Campar Iva')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'ca25d4c1-cc5c-4e6a-bc9a-d00ba8fa4618',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '1650363a-9137-46cc-b2d1-79769f71453b'),
  '2026-03-21',
  'ep. potkoljenica,intime i pazuha',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sanja') AND LOWER(p.prezime) = LOWER('Rajkovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '7a8ca628-ce19-411e-be76-770d443a7229',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '8d0b5d02-8d7f-4a8a-988a-d552a5e90d4b'),
  '2026-03-21',
  'ep. velikih regija',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Vera') AND LOWER(p.prezime) = LOWER('Milosevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '423ff3c6-7e55-4035-a8f8-321af8f58772',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '034cf243-20cb-4868-9bdd-57e78486677a'),
  '2026-03-21',
  'ep. velikih regija',
  'treba da plati 350e na termin koji je zakazan 09.05.2026. | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Marija') AND LOWER(p.prezime) = LOWER('Dabic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'ef30db07-b1b6-4308-9ed8-41e39f1de3a2',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '41a43b9f-61be-4c79-a1cb-24fc5f2fc8b3'),
  '2026-03-23',
  'ep. male regije',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Mina') AND LOWER(p.prezime) = LOWER('Tomasevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '6f2b2138-fb06-49ed-b056-a85ffeb4b640',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'e2fdef48-34cc-4758-9ea1-00fb03fd9ad6'),
  '2026-03-23',
  'epilacija velikih regija',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Dalida') AND LOWER(p.prezime) = LOWER('Mucic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '13c5fabe-d5d0-4305-84eb-ba87fcc23f33',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '792bded1-d099-4e1d-bbc1-1a07a942b376'),
  '2026-03-23',
  'epilacija cijelog lica',
  'Cijena: 50EUR (kes) | preostalo jos 100e jer je na prvom tetmanu platila 100e | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Ivanovic') AND LOWER(p.prezime) = LOWER('Ana')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'de17a2ca-d390-4506-ae2c-c4d6e111e9d2',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '303de982-8163-421b-bb67-fe7e99f1431a'),
  '2026-03-24',
  'ep. velikih regija',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sandra') AND LOWER(p.prezime) = LOWER('Dedic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '3aaf541f-6aee-42a7-bd36-0cdcadd250ab',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'bf814675-c3d9-44d5-8430-e08e893437c0'),
  '2026-03-24',
  'epilacija cijelo tijelo',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Sonja') AND LOWER(p.prezime) = LOWER('Bajraktarovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '4539d3ac-9c6e-4132-b8a2-69e5d616e371',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'd6a68856-f12d-4e53-87f0-4d150fa17979'),
  '2026-03-24',
  'epilacija cijelo tijelo',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Kristina') AND LOWER(p.prezime) = LOWER('Vucinic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '9d3f6d41-b53c-4c89-a6df-06d19ffb83f2',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'dd7b3365-4134-49c2-a3fe-19fc13e80e73'),
  '2026-03-25',
  'ep. male regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Bojana') AND LOWER(p.prezime) = LOWER('Maras')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '2eb8aacf-e7f0-4109-bfc8-4c8e2313f285',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '853613c8-645b-4828-9d2a-3d012cafa660'),
  '2026-03-25',
  'ep. lica',
  '200e duga | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Maja') AND LOWER(p.prezime) = LOWER('Milos')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '52e2134d-e706-4470-9ae8-ff586225cfc0',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '5021a51f-19f5-4bcf-944c-1a257155c5de'),
  '2026-03-25',
  'ep. male regije',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Raicevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'e3b79668-fd26-4c99-8578-c3932f952941',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '2e34090e-5e4f-4d56-a4f7-9a0787996deb'),
  '2026-03-25',
  'ep. pola ruku',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Iva') AND LOWER(p.prezime) = LOWER('Milosevic Campar')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '8143bd36-ad64-4655-b5bf-ddf3dfff6e3b',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '5ccdd09c-5417-446a-8b9e-591d403ebd34'),
  '2026-03-25',
  'ep.pazu pojedincno',
  'Cijena: 30EUR (kes) | pojedinacno placanje 30e | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Stanisic') AND LOWER(p.prezime) = LOWER('Sara')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '04eb8965-1234-4aa6-94a2-7a17a5c95b64',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'ae7e23f5-d9e8-4fbc-ae37-099f1fdb8b64'),
  '2026-03-25',
  'epilacija cijelo tijelo',
  'Cijena: 445EUR (kartica) | NA TRECEM DA PLATI JOS 445E | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Bulatovic') AND LOWER(p.prezime) = LOWER('Tijana')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '2fbc99d1-c4f5-4171-b6be-20edb8f1381a',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '6a6b5dee-dd90-4c15-b4c7-c7b282c1df3b'),
  '2026-03-26',
  'ep. male regije',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Nikoleta') AND LOWER(p.prezime) = LOWER('Perovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'a417d2ba-efd3-490f-b25d-26dcfdf69f65',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '1a52c102-527f-4f19-8ce1-8237b13512e1'),
  '2026-03-26',
  'ep. male regije',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Andrea') AND LOWER(p.prezime) = LOWER('Kljajevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'eea5bc6d-6855-468c-ad09-31b17ce21520',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '3f0be992-b024-4b4d-b50f-59a3ddedf577'),
  '2026-03-26',
  'ep. nogu i prepona',
  'DUG 350E treba da plati na tretman koji joj je 7.05.2026. | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Danka') AND LOWER(p.prezime) = LOWER('Knezevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '209647c0-b193-4cb7-80ab-3d60dbc44254',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '3c31e17f-8ab5-4d7a-881f-fc14d79d43f0'),
  '2026-03-26',
  'ep. malih regija',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Milena') AND LOWER(p.prezime) = LOWER('Jovicevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'af2619ba-6e34-412c-9636-4d08d69e2cb1',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '3162607b-b349-48af-88ae-b31587ac76b1'),
  '2026-03-26',
  'ep. male regije',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Kostic') AND LOWER(p.prezime) = LOWER('Jovana')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '534f2af4-f47a-4c78-8246-9b0c023e8453',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '20becd12-0c87-40b9-9dfa-ece4b96e4816'),
  '2026-03-26',
  'ep. male regije',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Zivkovic') AND LOWER(p.prezime) = LOWER('Ivona')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '69a07150-af13-4f46-abb6-fa0376f6c7d6',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '6fb15259-37ed-4c20-bb4e-8576106d3451'),
  '2026-03-26',
  'ep. male regije',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Pesic') AND LOWER(p.prezime) = LOWER('Anja')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '2b99ab65-a78a-4f95-bd86-bbbf7cf0fe37',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '74fb4aca-585a-40f7-b22c-a55c6edcb1d6'),
  '2026-03-27',
  'ep. malih regija',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Ema') AND LOWER(p.prezime) = LOWER('Kurgas')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'fc5a98b3-dc80-417f-b8cc-54c2a4b3e577',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '94dcd092-bde1-48ce-875e-2479ad2b5d61'),
  '2026-03-27',
  'ep. malih regija',
  'Cijena: 25EUR (kartica) | PLACA POJEDINACNO | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Nikolija') AND LOWER(p.prezime) = LOWER('Miranovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'bee676d2-27b0-442f-8651-898f0c4807a0',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '578fdacc-4f52-4553-8822-9a299a326d08'),
  '2026-03-27',
  'epi. velikih regija',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Jovana') AND LOWER(p.prezime) = LOWER('Kostic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'dcd3b483-da60-4398-a54e-02b50b74f2e0',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '00a1d623-9ad3-4270-bd73-4c822f10491b'),
  '2026-03-27',
  'ep.pazuha',
  'Cijena: 25EUR (kartica) | PLACA POJEDINACNO | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Stojanovic') AND LOWER(p.prezime) = LOWER('Gordana')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'dc600966-5de9-4e4d-b713-0774b38d46ca',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '5f8a13fc-658b-4cf5-8f37-c2f507448564'),
  '2026-03-28',
  'ep.nausnica',
  'Cijena: 25EUR (kartica) | PLACA POJEDINACNO | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Marina') AND LOWER(p.prezime) = LOWER('Vukovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '5f04b6c0-243c-4378-bd9b-f8333ccce786',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '1a8b8ba9-eef2-4e47-8146-39d282c04fa1'),
  '2026-03-28',
  'ep.pazuha',
  'Cijena: 30EUR (kes) | pojedinacno placanje | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Kristina') AND LOWER(p.prezime) = LOWER('Markovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '783079ca-e40d-41e0-a921-81957a4f5182',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'd8b65ea8-9d56-402a-b0d6-264f71dc4bda'),
  '2026-03-28',
  'ep.cijeko tijelo',
  'placeno sve | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Leila') AND LOWER(p.prezime) = LOWER('Vujisic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'c90dc015-dba2-4781-ac80-67ec7271dcd2',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '87a11f36-d270-4421-b4b9-69b6291a3e0f'),
  '2026-03-30',
  'ep. male regije',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Andjela') AND LOWER(p.prezime) = LOWER('Lucic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '5249af4a-04ac-4dfc-8785-47c4ff620706',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '18cd8851-cd59-43aa-a510-b565b30e6dfa'),
  '2026-03-30',
  'ep. malih regija',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Helena') AND LOWER(p.prezime) = LOWER('Sinistajn')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '658d3862-22d2-4a4f-bfc1-b8cd10d33000',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'aa1a5f50-246b-4866-a7e9-9ac45e428ff9'),
  '2026-03-30',
  'ep.cijelo tijelo',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Ivana') AND LOWER(p.prezime) = LOWER('Kovacevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'b3736162-95a7-41f4-af54-45366f45ff5c',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'f870da59-366c-469b-9790-326240dbb3f2'),
  '2026-03-30',
  'ep. velike regije',
  'Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Nadja') AND LOWER(p.prezime) = LOWER('Pesic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '5bd7d3ec-5638-4494-8463-42aa4364a472',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), 'dc5e4914-6713-4c7a-bf84-fdcbe81fe0d5'),
  '2026-03-31',
  'ep. velikih regija',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Maja') AND LOWER(p.prezime) = LOWER('Petrovic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT '9e94bc0a-0c87-4bed-8ca3-6503c25c98d2',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '95d9e993-2f7a-4fbe-b86f-a9fbfbbfd82a'),
  '2026-03-31',
  'ep. velikih regija',
  'placen paket | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Lala') AND LOWER(p.prezime) = LOWER('Dubljevic')
LIMIT 1;
INSERT INTO examinations (id, patient_id, doctor_id, datum, nalaz, napomena, status, created_at, updated_at)
SELECT 'f6082a63-94e0-4107-b373-5bcb590aceba',
  p.id,
  COALESCE((SELECT id FROM doctors LIMIT 1), '667fe77a-f1af-4eeb-9e07-8869129f8627'),
  '2026-03-31',
  'ep cij.lice',
  'Cijena: 50EUR (kes) | pojedinacno placanje | Izvor: Epilacija',
  'zavrsen',
  NOW(),
  NOW()
FROM patients p
WHERE LOWER(p.ime) = LOWER('Anja') AND LOWER(p.prezime) = LOWER('Zivanovic')
LIMIT 1;

COMMIT;