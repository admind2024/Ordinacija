#!/usr/bin/env python3
"""Uvoz termina iz Hipokratijinog Excel izvoza (Termini → Izvezi) u MOA bazu.

Generise jedan SQL fajl (jedna transakcija) koji:
  - pravi seme hipokratija_uvoz (nije izlozena aplikaciji) za evidenciju uvoza,
  - dodaje kategorije, usluge, ordinacije i osoblje koje u MOA ne postoje,
  - dodaje pacijente koji ne postoje (poredjenje po imenu i prezimenu),
  - unosi termine i njihove usluge, preskacuci termine koji su vec uvezeni.

Svaki uneseni red se upisuje u hipokratija_uvoz.uneseno, pa se uvoz moze ponistiti
(vidi ponisti.sql). Podaci pacijenata se ne stampaju — samo brojevi.

Upotreba:
  termini.py --katalog services_export.xlsx --moa moa_snapshot.json --out uvoz.sql termini1.xlsx [termini2.xlsx ...]
moa_snapshot.json: {"patients":[...], "doctors":[...], "rooms":[...], "services":[...],
                    "categories":[...], "uvezeni_kljucevi":[...]}
"""
import argparse
import collections
import json
import re
import sys
import unicodedata
import uuid
from datetime import datetime

import openpyxl

TZ = 'Europe/Podgorica'
OPREMA = re.compile(r'alma|exion|em ?sculpt|emface|em face', re.I)
BOJE = ['#2BA5A5', '#C4956F', '#A855F7', '#F97316', '#22C55E', '#3B82F6', '#EC4899', '#14B8A6', '#EAB308', '#64748B']


def norm(s):
    s = str(s or '').replace('đ', 'dj').replace('Đ', 'Dj')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'^(dr|prof\.?|med\.?sestra)\s+', '', s.strip())
    return re.sub(r'\s+', ' ', s).strip()


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, (int, float)):
        return repr(round(v, 2)) if isinstance(v, float) else str(v)
    return "'" + str(v).replace("'", "''") + "'"


def read_xlsx(path):
    rows = list(openpyxl.load_workbook(path, read_only=True).worksheets[0].iter_rows(values_only=True))
    return [dict(zip(rows[0], r)) for r in rows[1:] if any(r)]


def lokalno(s):
    # "27.10.2026 10:00" -> "2026-10-27 10:00"
    return datetime.strptime(s.strip(), '%d.%m.%Y %H:%M').strftime('%Y-%m-%d %H:%M')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--katalog', required=True)
    ap.add_argument('--moa', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--batch', default=datetime.now().strftime('hipokratija-%Y%m%d-%H%M%S'))
    ap.add_argument('fajlovi', nargs='+')
    a = ap.parse_args()

    moa = json.load(open(a.moa))
    katalog = read_xlsx(a.katalog)
    termini = [r for f in a.fajlovi for r in read_xlsx(f)]

    sql = ['BEGIN;', f"-- batch {a.batch}",
           'CREATE SCHEMA IF NOT EXISTS hipokratija_uvoz;',
           'CREATE TABLE IF NOT EXISTS hipokratija_uvoz.uneseno (batch TEXT NOT NULL, tabela TEXT NOT NULL, red_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());',
           'CREATE TABLE IF NOT EXISTS hipokratija_uvoz.termini (kljuc TEXT PRIMARY KEY, batch TEXT NOT NULL, appointment_id UUID, red JSONB NOT NULL);',
           'REVOKE ALL ON SCHEMA hipokratija_uvoz FROM anon, authenticated;']
    stat = collections.Counter()

    def zabiljezi(tabela, rid):
        sql.append(f"INSERT INTO hipokratija_uvoz.uneseno(batch, tabela, red_id) VALUES ({q(a.batch)}, {q(tabela)}, {q(rid)});")

    # --- kategorije i usluge -------------------------------------------------
    kat_id = {norm(c['naziv']): c['id'] for c in moa['categories']}
    usl_id = {norm(s['naziv']): s for s in moa['services']}
    kat_po_usluzi = {}
    for k in katalog:
        if not k.get('Naziv'):
            continue
        kn = norm(k.get('Kategorija') or 'Ostale usluge')
        if kn not in kat_id:
            nid = str(uuid.uuid4())
            kat_id[kn] = nid
            sql.append(f"INSERT INTO service_categories(id, naziv, redoslijed) VALUES ({q(nid)}, {q(k.get('Kategorija') or 'Ostale usluge')}, {100 + len(kat_id)});")
            zabiljezi('service_categories', nid)
            stat['kategorija_novih'] += 1
        kat_po_usluzi[norm(k['Naziv'])] = (k, kat_id[kn])

    def usluga(nn):
        if nn in usl_id:
            return usl_id[nn]
        k, kid = kat_po_usluzi[nn]
        nid = str(uuid.uuid4())
        s = {'id': nid, 'naziv': k['Naziv'], 'cijena': float(k.get('Cijena') or 0), 'trajanje': int(k.get('Trajanje (min)') or 30)}
        sql.append(f"INSERT INTO services(id, kategorija_id, naziv, cijena, trajanje, aktivan) VALUES ({q(nid)}, {q(kid)}, {q(s['naziv'])}, {s['cijena']}, {s['trajanje']}, true);")
        zabiljezi('services', nid)
        usl_id[nn] = s
        stat['usluga_novih'] += 1
        return s

    # Sve usluge iz kataloga ulaze u MOA (cjenovnik), ne samo one iz termina
    for nn in kat_po_usluzi:
        usluga(nn)

    katalog_imena = sorted(kat_po_usluzi, key=len, reverse=True)

    def razdvoji(s, n):
        s = norm(s)
        out = []
        while s:
            for c in katalog_imena:
                if s.startswith(c):
                    out.append(c)
                    s = s[len(c):].lstrip(' ,')
                    break
            else:
                return None
        return out if len(out) == n else None

    # --- osoblje i ordinacije ------------------------------------------------
    dr_id = {norm(f"{d['ime']} {d['prezime']}"): d['id'] for d in moa['doctors']}

    def doktor(ime_puno):
        nn = norm(ime_puno)
        if nn in dr_id:
            return dr_id[nn]
        # slova se ponavljaju u kucanju (Jovannovic) — poredi bez duplih slova
        sabij = lambda x: re.sub(r'(.)\1+', r'\1', x)
        for k, v in dr_id.items():
            if sabij(k) == sabij(nn):
                return v
        dijelovi = re.sub(r'^(dr|prof\.?)\s+', '', ime_puno.strip(), flags=re.I).split()
        ime, prezime = dijelovi[0].title(), ' '.join(dijelovi[1:]).title() or '-'
        nid = str(uuid.uuid4())
        titula = 'Dr' if re.match(r'^dr\b', ime_puno.strip(), re.I) else None
        sql.append(f"INSERT INTO doctors(id, ime, prezime, titula, specijalizacija, boja, aktivan) VALUES ({q(nid)}, {q(ime)}, {q(prezime)}, {q(titula)}, '', {q(BOJE[len(dr_id) % len(BOJE)])}, true);")
        zabiljezi('doctors', nid)
        dr_id[nn] = nid
        stat['osoblja_novih'] += 1
        return nid

    room_id = {norm(r['naziv']): r['id'] for r in moa['rooms']}

    def ordinacija(naziv):
        nn = norm(naziv)
        if nn in room_id:
            return room_id[nn]
        nid = str(uuid.uuid4())
        tip = 'oprema' if OPREMA.search(naziv) else 'ordinacija'
        sql.append(f"INSERT INTO rooms(id, naziv, tip, boja, aktivan) VALUES ({q(nid)}, {q(naziv.strip())}, {q(tip)}, {q(BOJE[len(room_id) % len(BOJE)])}, true);")
        zabiljezi('rooms', nid)
        room_id[nn] = nid
        stat['ordinacija_novih'] += 1
        return nid

    # --- pacijenti -----------------------------------------------------------
    pac = collections.defaultdict(set)
    for p in moa['patients']:
        pac[norm(f"{p['ime']} {p['prezime']}")].add(p['id'])
        pac[norm(f"{p['prezime']} {p['ime']}")].add(p['id'])
    novi_pac = {}
    nejasni = set()

    def pacijent(puno):
        nn = norm(puno)
        if nn in novi_pac:
            return novi_pac[nn]
        ids = pac.get(nn, set())
        if len(ids) == 1:
            stat.setdefault('pacijenata_postojecih_set', set()).add(nn)
            return next(iter(ids))
        if len(ids) > 1:
            nejasni.add(nn)  # vise MOA pacijenata istog imena — termin vezujemo za novog, za rucnu provjeru
        dijelovi = puno.strip().split()
        ime, prezime = dijelovi[0], ' '.join(dijelovi[1:]) or '-'
        nid = str(uuid.uuid4())
        sql.append(f"INSERT INTO patients(id, ime, prezime, telefon, napomena, tagovi, gdpr_saglasnost, popust, pocetno_stanje, saldo) VALUES ({q(nid)}, {q(ime)}, {q(prezime)}, '', 'Uvezeno iz Hipokratije (bez telefona u izvozu)', ARRAY['hipokratija'], false, 0, 0, 0);")
        zabiljezi('patients', nid)
        novi_pac[nn] = nid
        return nid

    # --- termini -------------------------------------------------------------
    vec = set(moa.get('uvezeni_kljucevi', []))
    for r in termini:
        pocetak, kraj = lokalno(r['Početak']), lokalno(r['Kraj'])
        kljuc = f"{norm(r['Pacijent'])}|{pocetak}|{norm(r['Doktori'])}|{norm(r['Usluge'])}"
        if kljuc in vec:
            stat['termina_preskoceno_vec_uvezeno'] += 1
            continue
        vec.add(kljuc)
        imena_usluga = razdvoji(r['Usluge'], int(r['Broj usluga'] or 1))
        if not imena_usluga:
            stat['termina_neprepoznate_usluge'] += 1
            continue
        pid = pacijent(r['Pacijent'])
        did = doktor(r['Doktori'].split(',')[0])
        # Nazivi ordinacija i sami sadrze zareze (npr. "EXION FACE , BODY ,RF"), pa se ne razdvajaju
        rid = ordinacija(r['Ordinacije']) if r.get('Ordinacije') else None
        aid = str(uuid.uuid4())
        napomena = 'Uvezeno iz Hipokratije' + (' · prvi dolazak' if str(r.get('Prvi dolazak')).lower() == 'da' else '')
        sql.append(
            f"INSERT INTO appointments(id, patient_id, doctor_id, room_id, pocetak, kraj, status, napomena) VALUES "
            f"({q(aid)}, {q(pid)}, {q(did)}, {q(rid)}, ({q(pocetak)}::timestamp AT TIME ZONE '{TZ}'), "
            f"({q(kraj)}::timestamp AT TIME ZONE '{TZ}'), 'zakazan', {q(napomena)});")
        zabiljezi('appointments', aid)
        red_json = json.dumps({k: (str(v) if v is not None else None) for k, v in r.items()}, ensure_ascii=False)
        sql.append(f"INSERT INTO hipokratija_uvoz.termini(kljuc, batch, appointment_id, red) VALUES ({q(kljuc)}, {q(a.batch)}, {q(aid)}, {q(red_json)}::jsonb);")

        # Cijena iz izvoza je za cijeli termin — rasporedi je po uslugama srazmjerno cjenovniku
        cena, popust = float(r.get('Cena') or 0), float(r.get('Popust') or 0)
        svc = [usluga(n) for n in imena_usluga]
        osnov = sum(float(s['cijena'] or 0) for s in svc) or len(svc)
        pct = round(popust / cena * 100, 2) if cena > 0 else 0
        for s in svc:
            udio = (float(s['cijena'] or 0) or 1) / osnov
            cij = round(cena * udio, 2)
            sql.append(
                f"INSERT INTO appointment_services(appointment_id, service_id, naziv, cijena, kolicina, popust, ukupno) VALUES "
                f"({q(aid)}, {q(s['id'])}, {q(s['naziv'])}, {cij}, 1, {pct}, {round(cij * (1 - pct / 100), 2)});")
        stat['termina_unesenih'] += 1

    sql.append('COMMIT;')
    open(a.out, 'w', encoding='utf-8').write('\n'.join(sql) + '\n')

    postojeci = len(stat.pop('pacijenata_postojecih_set', set()))
    stat['pacijenata_novih'] = len(novi_pac)
    stat['pacijenata_postojecih'] = postojeci
    stat['pacijenata_istog_imena_vise_u_moa'] = len(nejasni)
    print(json.dumps({'batch': a.batch, **stat}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    sys.exit(main())
