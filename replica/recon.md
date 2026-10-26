# Recon: Hipokratija Zakazivač → MOA

Pregledano 26.10.2026. kroz MOA nalog u Hipokratiji (uloga tehničar), samo čitanjem:
forme su otvarane i zatvarane bez čuvanja. Podaci pacijenata nisu prepisivani.
Cilj nije kopija nego paritet: svaka funkcija koju Hipokratija ima, a MOA nema,
pravi se ovdje iznova, našim kodom i našim tekstom.

## Mapa ekrana Hipokratije

| ID | Ekran | Šta radi |
|----|-------|----------|
| H01 | Oglasna tabla | Bilješke za tim: naslov, tekst, boja, oznake, dodjela korisniku, filter "meni dodijeljene" i po oznaci |
| H02 | Kalendar | Dan / sedmica / mjesec / agenda, filter doktora (više kolona), filter ordinacija, pretraga pacijenta |
| H03 | Kalendar po ordinacijama / opremi | Kolona po ordinaciji/aparatu, filter lokacija |
| H04 | Zakazani termini | Tabela svih termina: filteri (pacijent, doktor, usluga, ordinacija, način plaćanja, status naplate, status pregleda, tagovi, period), izvoz, akcije (naplata, izmjena, započni pregled, uput, otkaži termin / cijelu posjetu) |
| H05 | Lista čekanja | Pacijent, kontakt, željeni termin, usluga, doktor, cijena, napomena |
| H06 | Protokol bolesnika | Zakonska knjiga: redni broj, datum, pacijent, godina rođenja, adresa, anamneza i nalaz, dijagnoza, terapija, upućen, ponovno javljanje, cijena, doktor; izvoz |
| H07 | Lista pacijenata | Ukupan iznos, ukupna naplata, saldo po pacijentu; filter po osiguranju |
| H08 | Karton pacijenta | Kartice: osnovno, istorija termina, poslate poruke, med. istorija (MKB dijagnoze lične/porodične), alergije, rizici, invaliditeti, rast djeteta, izvještaji, dokumentacija (upload PDF/slika/DICOM), dekurzus, recepti, uputi |
| H09 | Specijalistički izvještaj | Anamneza, nalaz, dijagnoze (MKB), lab. analize, terapija, kontrola, uput, savjet; šabloni po polju i "sačuvaj kao šablon"; "otvori prethodni izvještaj"; recepti; PDF |
| H10 | Nalazi | Papa testovi, VS brisevi (ginekologija) |
| H11 | Radno vrijeme | Raspored po doktoru: sedmični i mjesečni pregled, radno vrijeme za određeni datum, pauze, smjene |
| H12 | Odsustva | Doktor, period, broj dana, razlog (godišnji, bolovanje, lični, službeni put, ostalo), napomena |
| H13 | Naplata | Evidencija računa: broj, pacijent, doktor, ko je naplatio, stavke, načini plaćanja, fiskalni status; rekapitulacija po vrstama plaćanja (presjek smjene) za štampu |
| H14 | Vaučeri | Plaćeni / besplatni, broj (auto), klijent, iznos, preostalo, status, izdao, ističe; vaučer kao način plaćanja |
| H15 | Materijali: cjenovnik | Šifra, kategorija, brend, jedinica, prag upozorenja, aktivan |
| H16 | Lager | Stanje, prag, status; dodaj zalihe, grupna nabavka (faktura, stavke, nabavna cijena), istorija kretanja |
| H17 | Popis | Sistemsko stanje naspram popisanog, razlika, napomena |
| H18 | Utrošci | Utrošak po terminu ili ručno, norma naspram stvarnog utroška, čeka potvrdu kad nema na lageru |
| H19 | Ustanova | Osnovno, ordinacije/oprema (boja), osiguranja, pravna lica, kategorije i vrste pregleda (šifra, naziv na engleskom, boja, prikaz na online widget-u, tagovi; uvoz/izvoz) |
| H20 | Termin (forma) | Više usluga u jednoj posjeti sa posebnim vremenom, osiguranje/pravno lice, način plaćanja, popusti |
| H21 | Događaj (forma) | Interni događaj: naslov, ordinacija, početak/kraj, boja, opis, učesnici |

Načini plaćanja u Hipokratiji: gotovina fiskal, kartica fiskal, gotovina,
administrativna zabrana, vaučer, prenos na račun, osiguranje.
Statusi termina: na čekanju, zakazan, stigao, otkazan, završen, nije se pojavio.

## Šta MOA već ima (ne pravi se ponovo)

Kalendar (4 prikaza, filteri), pacijenti sa kartonom, pregled sa štampom nalaza,
cjenovnik, naplata sa EFI fiskalizacijom, dugovanja sa ratama, SMS/Viber
podsjetnici i potvrda dolaska, marketing kampanje, ankete, izvještaji, dashboard.
MOA ima i stvari kojih Hipokratija nema: marketing, ankete, dugovanja.

Detaljno poređenje je u `features.csv`.
