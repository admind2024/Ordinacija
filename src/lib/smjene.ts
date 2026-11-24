// Smjene: imenovana radna vremena koja se dodjeljuju osobi za konkretan dan.
// Dodjela se cuva kao izuzetak za datum u doctor_schedules (napomena = naziv smjene),
// pa postojeca logika rasporeda (lib/schedule.ts) i upozorenja pri zakazivanju rade bez izmjena.
import { addDays, format, parseISO } from 'date-fns';
import { supabase } from './supabase';
import type { DoctorSchedule } from '../types';

export interface Smjena {
  id: string;
  naziv: string;
  pocetak: string; // HH:mm
  kraj: string; // HH:mm
  boja: string;
  redoslijed: number;
}

export const BOJE_SMJENA = ['#2BA5A5', '#C4956F', '#7F77DD', '#D85A30', '#378ADD', '#639922'];

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

export async function loadSmjene(): Promise<Smjena[]> {
  const { data, error } = await supabase.from('smjene').select('*').order('redoslijed').order('pocetak');
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id as string,
    naziv: r.naziv as string,
    pocetak: hhmm(r.pocetak as string),
    kraj: hhmm(r.kraj as string),
    boja: (r.boja as string) || BOJE_SMJENA[0],
    redoslijed: Number(r.redoslijed) || 0,
  }));
}

export type Dodjela = { vrsta: 'smjena'; smjena: Smjena } | { vrsta: 'slobodan' } | { vrsta: 'obrisi' };

// Jedan unos po osobi i danu: nova dodjela zamjenjuje staru. 'obrisi' vraca dan na sedmicni sablon.
export async function dodijeliSmjenu(doctorId: string, datum: string, d: Dodjela): Promise<void> {
  const del = await supabase
    .from('doctor_schedules')
    .delete()
    .eq('doctor_id', doctorId)
    .eq('ponavljajuci', false)
    .eq('datum', datum);
  if (del.error) throw del.error;
  if (d.vrsta === 'obrisi') return;

  const { error } = await supabase.from('doctor_schedules').insert({
    doctor_id: doctorId,
    ponavljajuci: false,
    datum,
    dan_u_sedmici: null,
    tip: d.vrsta === 'slobodan' ? 'neradni' : 'standardno',
    pocetak: d.vrsta === 'smjena' ? d.smjena.pocetak : null,
    kraj: d.vrsta === 'smjena' ? d.smjena.kraj : null,
    pauze: [],
    napomena: d.vrsta === 'smjena' ? d.smjena.naziv : 'Slobodan',
  });
  if (error) throw error;
}

// Prepisuje dodjele iz prethodne sedmice u ovu, ali SAMO u dane koji jos nemaju unos
// (nista se ne gazi). Vraca broj upisanih dana.
export async function kopirajProsluSedmicu(weekStart: Date, schedules: DoctorSchedule[]): Promise<number> {
  const prosla = new Set(Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i - 7), 'yyyy-MM-dd')));
  const datumski = schedules.filter((s) => !s.ponavljajuci && s.datum);
  const zauzeto = new Set(datumski.map((s) => `${s.doctor_id}|${s.datum}`));

  const novi = datumski
    .filter((s) => prosla.has(s.datum as string))
    .map((s) => ({ s, cilj: format(addDays(parseISO(s.datum as string), 7), 'yyyy-MM-dd') }))
    .filter(({ s, cilj }) => !zauzeto.has(`${s.doctor_id}|${cilj}`))
    .map(({ s, cilj }) => ({
      doctor_id: s.doctor_id,
      ponavljajuci: false,
      datum: cilj,
      dan_u_sedmici: null,
      tip: s.tip,
      pocetak: s.pocetak || null,
      kraj: s.kraj || null,
      pauze: s.pauze || [],
      napomena: s.napomena || null,
    }));

  if (novi.length === 0) return 0;
  const { error } = await supabase.from('doctor_schedules').insert(novi);
  if (error) throw error;
  return novi.length;
}

// Cuva listu smjena iz uredjivaca: brise uklonjene, mijenja postojece, dodaje nove.
export async function sacuvajSmjene(prije: Smjena[], poslije: (Omit<Smjena, 'id'> & { id?: string })[]): Promise<void> {
  const ostali = new Set(poslije.map((s) => s.id).filter(Boolean));
  const obrisani = prije.filter((s) => !ostali.has(s.id)).map((s) => s.id);
  if (obrisani.length) {
    const { error } = await supabase.from('smjene').delete().in('id', obrisani);
    if (error) throw error;
  }
  for (const [i, s] of poslije.entries()) {
    const red = { naziv: s.naziv.trim(), pocetak: s.pocetak, kraj: s.kraj, boja: s.boja, redoslijed: i + 1 };
    const { error } = s.id
      ? await supabase.from('smjene').update(red).eq('id', s.id)
      : await supabase.from('smjene').insert(red);
    if (error) throw error;
  }
}
