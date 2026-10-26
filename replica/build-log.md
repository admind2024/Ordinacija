# Build log

| ID | Datum | Stanje | Šta fali | Šta je bilo teže |
|----|-------|--------|----------|------------------|
| S01 Raspored | 2026-10-26 | done | smjene (F05); šrafiranje neradnog vremena u samom kalendaru | doctor_schedules je postojala bez dana u sedmici — proširena migracijom |
| S02 Termini + lista čekanja | 2026-10-26 | done | otkazivanje cijele posjete iz tabele (akcije su i dalje u kalendaru) | AppointmentModal dobio predpopunjavanje (pacijent/ljekar/usluga) |
| S03 Oglasna tabla | 2026-10-26 | done | obavještenje kad ti neko dodijeli bilješku | — |
| S04 Vaučeri + presjek smjene | 2026-10-26 | done | administrativna zabrana/osiguranje kao način (čeka pravna lica) | naplata postoji na dva mjesta (Dashboard i PaymentForm) — vaučer dodat u oba; usput ispravljena greška: kartica bez fiskalnog računa bilježila se kao fiskalna |
| S05 Karton: zdravlje, dokumenta, poruke | 2026-10-26 | done | cijeli MKB-10 šifarnik (sad 33 česte + ručni unos); recepti i uputi (F21) | dokumenta su u privatnom bucket-u, ali pravila pristupa su ista kao za ostatak aplikacije (anon) — vidi napomenu o auth-u |
