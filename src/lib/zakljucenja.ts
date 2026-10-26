// Zakljucenje smjene i radnog dana: zbir naplate po nacinu placanja i ocekivana gotovina u kasi.
import { format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from './supabase';

const GOTOVINA = new Set(['gotovina', 'gotovina_fiskalni']);

export interface Zbir {
  poMetodi: Record<string, number>;
  ukupno: number;          // naplata za usluge + uplate dugova (bez prodaje vaucera)
  brojUplata: number;
  prodajaVaucera: number;
  uplateDugova: number;
  gotovinaOcekivana: number;
  fiskalno: number;
}

export interface Smjena {
  id: string;
  user_id: string | null;
  vrijeme_od: string;
  vrijeme_do: string;
  zbir: Record<string, number>;
  ukupno: number;
  broj_uplata: number;
  prodaja_vaucera: number;
  gotovina_ocekivana: number;
  gotovina_prebrojana: number | null;
  razlika: number | null;
  napomena: string | null;
  zakljucenje_dana_id: string | null;
  created_at: string;
}

export interface ZakljucenjeDana {
  id: string;
  datum: string;
  zbir: Record<string, number>;
  ukupno: number;
  broj_uplata: number;
  prodaja_vaucera: number;
  gotovina_ocekivana: number;
  gotovina_prebrojana: number | null;
  razlika: number | null;
  nenaplaceni_termini: number;
  napomena: string | null;
  user_id: string | null;
  created_at: string;
}

const num = (v: unknown) => Number(v || 0);

// Zbir za period; userId = samo naplata te osobe (smjena), bez userId = svi (dan).
// Uplate dugova nemaju upisanu osobu, pa ulaze samo u zbir dana.
export async function izracunajZbir(od: Date, doVr: Date, userId?: string): Promise<Zbir> {
  const fromIso = od.toISOString();
  const toIso = doVr.toISOString();
  let pq = supabase.from('payments').select('iznos, metoda, fiskalni_status').gt('datum', fromIso).lte('datum', toIso);
  let vq = supabase.from('vauceri').select('iznos, nacin_placanja').eq('tip', 'placeni').neq('status', 'storniran')
    .gt('created_at', fromIso).lte('created_at', toIso);
  if (userId) {
    pq = pq.eq('naplatio_user_id', userId);
    vq = vq.eq('izdao_user_id', userId);
  }
  const dq = userId
    ? Promise.resolve({ data: [] as { iznos: number; nacin_placanja: string | null }[], error: null })
    : supabase.from('uplate_duga').select('iznos, nacin_placanja').gte('datum', format(od, 'yyyy-MM-dd')).lte('datum', format(doVr, 'yyyy-MM-dd'));

  const [p, v, d] = await Promise.all([pq, vq, dq]);
  const err = p.error || v.error || d.error;
  if (err) throw err;

  const poMetodi: Record<string, number> = {};
  let gotovina = 0;
  let fiskalno = 0;
  let ukupno = 0;
  for (const x of p.data || []) {
    const m = x.metoda || 'gotovina';
    poMetodi[m] = (poMetodi[m] || 0) + num(x.iznos);
    ukupno += num(x.iznos);
    if (GOTOVINA.has(m)) gotovina += num(x.iznos);
    if (m.endsWith('_fiskalni') || x.fiskalni_status === 'success') fiskalno += num(x.iznos);
  }
  let uplateDugova = 0;
  for (const x of d.data || []) {
    // Dugovanja koriste 'kes'/'kartica'/... — kes racunamo kao gotovinu
    const m = x.nacin_placanja === 'kes' || !x.nacin_placanja ? 'gotovina' : x.nacin_placanja;
    const key = `dug_${m}`;
    poMetodi[key] = (poMetodi[key] || 0) + num(x.iznos);
    uplateDugova += num(x.iznos);
    ukupno += num(x.iznos);
    if (GOTOVINA.has(m)) gotovina += num(x.iznos);
  }
  let prodajaVaucera = 0;
  for (const x of v.data || []) {
    prodajaVaucera += num(x.iznos);
    if (GOTOVINA.has(x.nacin_placanja || '')) gotovina += num(x.iznos);
  }
  return {
    poMetodi,
    ukupno,
    brojUplata: (p.data || []).length + (d.data || []).length,
    prodajaVaucera,
    uplateDugova,
    gotovinaOcekivana: gotovina,
    fiskalno,
  };
}

// Pocetak otvorene smjene: kraj posljednje zatvorene smjene te osobe danas, inace pocetak dana.
export async function pocetakSmjene(userId: string): Promise<Date> {
  const danas = startOfDay(new Date());
  const { data } = await supabase.from('zakljucenja_smjene').select('vrijeme_do')
    .eq('user_id', userId).gte('vrijeme_do', danas.toISOString()).order('vrijeme_do', { ascending: false }).limit(1);
  return data && data[0] ? new Date(data[0].vrijeme_do) : danas;
}

export async function smjeneZaDan(datum: Date): Promise<Smjena[]> {
  const { data, error } = await supabase.from('zakljucenja_smjene').select('*')
    .gte('vrijeme_do', startOfDay(datum).toISOString()).lte('vrijeme_do', endOfDay(datum).toISOString()).order('vrijeme_do');
  if (error) throw error;
  return (data || []) as Smjena[];
}

export async function zakljucenjeDana(datum: Date): Promise<ZakljucenjeDana | null> {
  const { data } = await supabase.from('zakljucenja_dana').select('*').eq('datum', format(datum, 'yyyy-MM-dd')).maybeSingle();
  return (data as ZakljucenjeDana) || null;
}

// Zavrseni termini tog dana za koje nije evidentirana nijedna uplata.
export async function nenaplaceniTermini(datum: Date): Promise<{ id: string; pocetak: string; pacijent: string }[]> {
  const { data: apts } = await supabase.from('appointments')
    .select('id, pocetak, appointment_services(ukupno), patient:patients(ime, prezime)')
    .eq('status', 'zavrsen')
    .gte('pocetak', startOfDay(datum).toISOString()).lte('pocetak', endOfDay(datum).toISOString());
  const list = (apts || []).filter((a) => ((a.appointment_services as { ukupno: number }[]) || []).reduce((s, x) => s + num(x.ukupno), 0) > 0);
  if (!list.length) return [];
  const { data: pays } = await supabase.from('payments').select('appointment_id').in('appointment_id', list.map((a) => a.id));
  const placeni = new Set((pays || []).map((p) => p.appointment_id));
  return list.filter((a) => !placeni.has(a.id)).map((a) => {
    const p = (Array.isArray(a.patient) ? a.patient[0] : a.patient) as { ime: string; prezime: string } | null;
    return { id: a.id, pocetak: a.pocetak, pacijent: p ? `${p.ime} ${p.prezime}` : '—' };
  });
}
