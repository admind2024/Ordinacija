# Prenos podataka iz Hipokratije u MOA

Stanje 26.10.2026. uveče. Ništa iz Hipokratije još nije upisano u MOA bazu.

## Šta je urađeno

- Izvezen cjenovnik iz Hipokratije (Ustanova → Kategorije i vrsta pregleda → Izvezi → Excel).
  Poređenje sa MOA cjenovnikom je u `cjenovnik-poredjenje.csv`:

  | Stanje | Broj |
  |---|---|
  | ista usluga, ista cijena i trajanje | 7 |
  | ista usluga, druga cijena ili trajanje | 31 |
  | postoji samo u Hipokratiji | 246 |
  | postoji samo u MOA | 135 |

  MOA cjenovnik je dakle zastario ili drugačije imenovan. Hipokratija ima 284 usluge u 26 kategorija, bez šifara.

## Zašto nije prenijeto sve

1. **Direktno čitanje iz Hipokratije (njihov API) je blokirano** kao zaobilaženje pristupa sajtu. To se ne radi.
2. **Izvoz preko njihovih dugmadi „Izvezi“ radi**, ali preuzimanje fajla sa podacima pacijenata
   čeka tvoju potvrdu u aplikaciji (drugi izvoz, Zakazani termini, ostao je nedovršen u Preuzimanjima).
3. **Lista pacijenata u Hipokratiji nema dugme za izvoz.** Kartoni, nalazi i dokumenta takođe ne.
4. Upis medicinskih podataka u produkcijsku bazu ne treba raditi bez tebe — prvo pregled, pa spajanje.

## Predlog (redom)

1. **Zatraži od Hipokratije kompletan izvoz baze** za MOA (pacijenti, termini, kartoni,
   specijalistički izvještaji, nalazi, dokumenta, naplata). Podaci su vlasništvo klinike i
   imate pravo na njih (prenosivost podataka, GDPR čl. 20). Ovo je jedini put do kartona i dokumenata.
2. Dok to ne stigne, uz tebe za računarom izvozimo ono što ima dugme „Izvezi“:
   - Zakazani termini (filter datuma na cijeli period) — iz toga se dobijaju i pacijenti sa telefonima
   - Specijalistički izvještaji (izvoz po dijagnozama)
   - Protokol bolesnika
   - Vaučeri
   - Utrošci materijala
3. Svaki fajl prvo ide u posebnu uvoznu šemu `hipokratija_uvoz` (nije dostupna aplikaciji),
   pa pravim izvještaj: koliko pacijenata je novo, koliko se poklapa sa postojećim po telefonu/JMBG.
4. Tek posle tvog pregleda spajamo u prave tabele (pacijenti, termini, cjenovnik).
   Cjenovnik: predlog je da Hipokratijin cjenovnik postane glavni, a 135 MOA usluga koje
   ne postoje tamo označimo kao neaktivne (ne brišemo — stari termini ih koriste).
