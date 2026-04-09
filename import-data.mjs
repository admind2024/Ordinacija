import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const sb = createClient(
  'https://pedgschrivtpbzcoqniu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZGdzY2hyaXZ0cGJ6Y29xbml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTQ4MDAsImV4cCI6MjA5MTEzMDgwMH0.uVX9aMZ6bjgng8yp4Kx1p_exB-GLNOD7knlUEvXwXpM'
);

function cleanName(name) {
  if (!name) return [null, null];
  const parts = name.toString().trim().split(/\s+/);
  if (parts.length < 2) return [parts[0], ''];
  const ime = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  const prezime = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  return [ime, prezime];
}

function cleanPhone(phone) {
  if (!phone) return null;
  return phone.toString().replace(/[^\d+]/g, '') || null;
}

function cleanDate(d) {
  if (!d) return null;
  d = d.toString().trim().replace(/\.+$/, '');
  const parts = d.split('.');
  if (parts.length === 3) {
    let year = parts[2];
    if (year.length < 4) year = '2026';
    return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

function extractPrice(s) {
  if (!s) return [0, 'kes'];
  s = s.toString().toLowerCase();
  const nums = s.match(/[\d.]+/);
  const amount = nums ? parseFloat(nums[0]) : 0;
  let method = 'kes';
  if (s.includes('kartica')) method = 'kartica';
  else if (s.includes('dug')) method = 'dug';
  else if (s.includes('poklon') || s.includes('vaucer')) method = 'poklon';
  return [amount, method];
}

function readExcel(path) {
  const wb = XLSX.readFile(path);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
}

async function main() {
  // 1. Get existing patients
  const { data: existingPatients } = await sb.from('patients').select('id, ime, prezime');
  const patientMap = new Map();
  for (const p of (existingPatients || [])) {
    patientMap.set(`${p.ime.toLowerCase()}|${p.prezime.toLowerCase()}`, p.id);
  }
  console.log(`Existing patients: ${patientMap.size}`);

  // Collect all data from Excel files
  const allRecords = [];
  const newPatients = new Map(); // key -> {ime, prezime, telefon}

  const files = [
    { path: '/Users/rakunat/Downloads/dr DJORDJE KALUDJEROVIC.xlsx', doctor: 'Dr Djordje Kaludjerovic', izvor: 'dr Djordje Kaludjerovic' },
    { path: '/Users/rakunat/Downloads/dr SANJA VUJANOVIC.xlsx', doctor: 'Dr Sanja Vujanovic', izvor: 'dr Sanja Vujanovic' },
    { path: '/Users/rakunat/Downloads/EPILACIJA.xlsx', doctor: 'Epilacija', izvor: 'Epilacija' },
  ];

  for (const file of files) {
    const rows = readExcel(file.path);
    for (let i = 1; i < rows.length; i++) { // skip header
      const row = rows[i];
      const [ime, prezime] = cleanName(row[0]);
      if (!ime || !prezime) continue;
      const telefon = cleanPhone(row[1]);
      const datum = cleanDate(row[2]);
      const procedura = row[3]?.toString().trim() || '';
      const [cijena, nacin] = extractPrice(row[4]);
      const napomena = row[5]?.toString().trim() || null;

      const key = `${ime.toLowerCase()}|${prezime.toLowerCase()}`;
      if (!patientMap.has(key) && !newPatients.has(key)) {
        newPatients.set(key, { ime, prezime, telefon: telefon || '000' });
      }
      // Update phone if missing
      if (telefon && newPatients.has(key) && newPatients.get(key).telefon === '000') {
        newPatients.get(key).telefon = telefon;
      }

      allRecords.push({ ime, prezime, datum, procedura, cijena, nacin, napomena, doctor: file.doctor, izvor: file.izvor });
    }
  }

  // Also add debtors from screenshot
  const screenshotDebtors = [
    ['Jasmina', 'Nikic', null], ['Nikolina', 'Komeninic', null], ['Milica', 'Martinovic', null],
    ['Jelena', 'Dejanova Zena', null], ['Senka', 'Zecevic', null], ['Nikola', 'Jabucanin', null],
    ['Kosta', 'Radonjic', null], ['Jelena', 'Marunovic', null],
  ];
  for (const [ime, prezime, tel] of screenshotDebtors) {
    const key = `${ime.toLowerCase()}|${prezime.toLowerCase()}`;
    if (!patientMap.has(key) && !newPatients.has(key)) {
      newPatients.set(key, { ime, prezime, telefon: tel || '000' });
    }
  }

  // 2. Insert new patients in batches
  console.log(`New patients to insert: ${newPatients.size}`);
  const patientBatch = [];
  for (const [, p] of newPatients) {
    patientBatch.push({
      ime: p.ime, prezime: p.prezime, telefon: p.telefon,
      popust: 0, pocetno_stanje: 0, saldo: 0, tagovi: [], gdpr_saglasnost: false,
    });
  }

  if (patientBatch.length > 0) {
    // Insert in chunks of 50
    for (let i = 0; i < patientBatch.length; i += 50) {
      const chunk = patientBatch.slice(i, i + 50);
      const { data, error } = await sb.from('patients').insert(chunk).select('id, ime, prezime');
      if (error) {
        console.error(`Patient insert error (batch ${i}):`, error.message);
      } else {
        for (const p of (data || [])) {
          patientMap.set(`${p.ime.toLowerCase()}|${p.prezime.toLowerCase()}`, p.id);
        }
        console.log(`Inserted patients batch: ${chunk.length}`);
      }
    }
  }

  // 3. Insert procedures
  console.log(`\nInserting ${allRecords.length} procedures...`);
  const procBatch = [];
  for (const r of allRecords) {
    if (!r.datum) continue;
    const key = `${r.ime.toLowerCase()}|${r.prezime.toLowerCase()}`;
    const patient_id = patientMap.get(key);
    if (!patient_id) { console.log(`  Patient not found: ${r.ime} ${r.prezime}`); continue; }
    procBatch.push({
      patient_id, doctor_name: r.doctor, datum: r.datum,
      procedura: r.procedura, cijena: r.cijena,
      nacin_placanja: r.nacin, napomena: r.napomena, izvor: r.izvor,
    });
  }

  for (let i = 0; i < procBatch.length; i += 50) {
    const chunk = procBatch.slice(i, i + 50);
    const { error } = await sb.from('procedure_log').insert(chunk);
    if (error) console.error(`Procedure insert error (batch ${i}):`, error.message);
    else console.log(`  Inserted procedures: ${i + chunk.length}/${procBatch.length}`);
  }

  // 4. Insert debts
  console.log('\nInserting debts...');
  const debts = [
    ['Stojakovic', 'Katarina', 445, 'Epilacija cijelog tijela - preostalo na trecem tretmanu', '2026-03-03'],
    ['Iva', 'Puric', 250, 'Dug za paket za noge', '2026-03-09'],
    ['Milica', 'Grdinic', 370, 'Epilacija - dug jos 370e, placanje iz 2 rate', '2026-03-10'],
    ['Anastasija', 'Vujovic', 200, '200e na sljedecem tretmanu', '2026-03-12'],
    ['Petar', 'Belada', 125, 'Placeno pola od paketa, preostalo 125e', '2026-03-13'],
    ['Lidija', 'Pavlovic', 375, 'Dug 375e', '2026-03-14'],
    ['Marija', 'Dabic', 350, 'Treba da plati 350e na termin 09.05.2026', '2026-03-21'],
    ['Tijana', 'Delevic', 125, 'Epi.intima - dug jos 125e', '2026-03-18'],
    ['Ana', 'Ivanovic', 100, 'Preostalo jos 100e', '2026-03-23'],
    ['Ivana', 'Mugosa', 250, 'Placeno pola od paketa, preostalo 250e', '2026-03-20'],
    ['Maja', 'Milos', 700, 'Dug epilacija 700e', '2026-03-25'],
    ['Bulatovic', 'Tijana', 445, 'Epilacija cijelo tijelo - na trecem da plati jos 445e', '2026-03-25'],
    ['Danka', 'Knezevic', 350, 'Dug 350e - treba da plati na tretman 07.05.2026', '2026-03-26'],
    ['Sladjana', 'Bulatovic', 380, 'Angkor 1ml dug 130e + Stilage S1ml dug 250e', '2026-03-18'],
    ['Sofija', 'Bulatovic', 130, 'Angkor 1ml - dug 130e', '2026-03-18'],
    ['Nikola', 'Jabucanin', 150, 'Da plati jos 150e na treci tretman', '2026-03-01'],
    ['Kosta', 'Radonjic', 550, 'Dug 550e - placa na treci tretman', '2026-03-01'],
    ['Jelena', 'Marunovic', 120, '100e + 20e aknor', '2026-03-01'],
    ['Milos', 'Sakovic', 400, '400e na terci tretman da plati epilacija', '2026-03-01'],
    ['Zivkovic', 'Ivona', 250, '250e na treci tretman epileacija', '2026-03-01'],
    ['Jasmina', 'Nikic', 600, 'Epilacija - dug 600e', '2026-03-01'],
    ['Nikolina', 'Komeninic', 280, 'Epilacija - dug 280e', '2026-03-01'],
    ['Milica', 'Martinovic', 1000, 'Epilacija - dug 1000e', '2026-03-01'],
    ['Jelena', 'Dejanova Zena', 200, 'Epilacija - dug 200e', '2026-03-01'],
    ['Senka', 'Zecevic', 250, 'Epilacija - dug 250e', '2026-03-01'],
    ['Vanja', 'Scepanovic', 0, 'Na sljedeci tretman placa', '2026-03-12'],
    ['Milos', 'Kraljevic', 500, 'Epilacija - dug 500e', '2026-03-01'],
    ['Mia', 'Novakovic', 325, 'Epilacija - dug 325e', '2026-03-01'],
    ['Ivana', 'Mugosa', 250, 'Epilacija - dug 250e placeno pola paketa', '2026-03-01'],
    ['Valentina', 'Donkovic', 440, 'Epilacija - dug 440e', '2026-03-01'],
    ['Sladjana', 'Bulatovic', 480, 'Epilacija - dug 480e', '2026-03-01'],
    ['Boricic', 'Katarina', 350, 'Epilacija - dug 350e', '2026-03-01'],
    ['Danka', 'Knezevic', 350, 'Epilacija - dug 350e', '2026-03-01'],
    ['Katarina', 'Stojankovic', 445, 'Epilacija - dug 445e, placa na treci tretman', '2026-03-01'],
  ];

  const seenDebts = new Set();
  const debtBatch = [];
  for (const [ime, prezime, iznos, opis, datum] of debts) {
    if (iznos <= 0) continue;
    const key = `${ime.toLowerCase()}|${prezime.toLowerCase()}`;
    if (seenDebts.has(key)) continue;
    seenDebts.add(key);
    const patient_id = patientMap.get(key);
    if (!patient_id) { console.log(`  Debt patient not found: ${ime} ${prezime}`); continue; }
    debtBatch.push({
      patient_id, iznos, preostalo: iznos, opis, datum_nastanka: datum, status: 'aktivan',
    });
  }

  if (debtBatch.length > 0) {
    const { data, error } = await sb.from('dugovanja').insert(debtBatch).select('id');
    if (error) console.error('Debt insert error:', error.message);
    else console.log(`Inserted ${data.length} debts`);
  }

  // Final counts
  const { count: pCount } = await sb.from('patients').select('*', { count: 'exact', head: true });
  const { count: prCount } = await sb.from('procedure_log').select('*', { count: 'exact', head: true });
  const { count: dCount } = await sb.from('dugovanja').select('*', { count: 'exact', head: true });

  console.log(`\n=== DONE ===`);
  console.log(`Patients in DB: ${pCount}`);
  console.log(`Procedures in DB: ${prCount}`);
  console.log(`Debts in DB: ${dCount}`);
}

main().catch(console.error);
