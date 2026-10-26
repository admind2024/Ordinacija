// Lager materijala: stanje, kretanja, popis i norme po usluzi.
import { supabase } from './supabase';
import type { Material } from '../types';

export type TipKretanja = 'nabavka' | 'utrosak' | 'popis' | 'korekcija' | 'otpis';

export const TIP_KRETANJA: Record<TipKretanja, string> = {
  nabavka: 'Nabavka',
  utrosak: 'Utrošak',
  popis: 'Popis (razlika)',
  korekcija: 'Korekcija',
  otpis: 'Otpis',
};

export interface Kretanje {
  id: string;
  material_id: string;
  tip: TipKretanja;
  kolicina: number;
  nabavna_cijena: number | null;
  datum: string;
  faktura: string | null;
  dobavljac: string | null;
  napomena: string | null;
  material_usage_id: string | null;
  popis_id: string | null;
}

export type StanjeStatus = 'ok' | 'nisko' | 'nema' | 'minus';

export function stanjeStatus(m: Pick<Material, 'trenutna_kolicina' | 'min_kolicina'>): StanjeStatus {
  const s = Number(m.trenutna_kolicina || 0);
  if (s < 0) return 'minus';
  if (s === 0) return 'nema';
  if (Number(m.min_kolicina || 0) > 0 && s <= Number(m.min_kolicina)) return 'nisko';
  return 'ok';
}

export const STANJE_STIL: Record<StanjeStatus, [string, string]> = {
  ok: ['Na stanju', 'bg-primary-50 text-primary-700'],
  nisko: ['Pri kraju', 'bg-amber-50 text-amber-700'],
  nema: ['Nema', 'bg-gray-100 text-gray-600'],
  minus: ['Minus — unesite nabavku', 'bg-red-50 text-red-700'],
};

export const kol = (n: number) => Number(n).toLocaleString('sr-Latn-ME', { maximumFractionDigits: 3 });

// Svjeze stanje iz baze (CalendarContext drzi verziju sa pocetka sesije).
export async function loadMaterijali(): Promise<Material[]> {
  const { data, error } = await supabase.from('materials').select('*').eq('aktivan', true).order('naziv');
  if (error) throw error;
  return (data || []).map((m) => ({
    ...m,
    trenutna_kolicina: Number(m.trenutna_kolicina || 0),
    min_kolicina: Number(m.min_kolicina || 0),
    nabavna_cijena: Number(m.nabavna_cijena || 0),
  })) as Material[];
}

export interface StavkaNabavke { material_id: string; kolicina: number; cijena: number | null }

export async function unesiNabavku(
  stavke: StavkaNabavke[],
  meta: { datum: string; faktura?: string; dobavljac?: string; napomena?: string; userId?: string }
) {
  const rows = stavke.map((s) => ({
    material_id: s.material_id,
    tip: 'nabavka',
    kolicina: s.kolicina,
    nabavna_cijena: s.cijena,
    datum: new Date(meta.datum).toISOString(),
    faktura: meta.faktura || null,
    dobavljac: meta.dobavljac || null,
    napomena: meta.napomena || null,
    user_id: meta.userId || null,
  }));
  const { error } = await supabase.from('material_kretanja').insert(rows);
  if (error) throw error;
}

export interface Norma { id: string; service_id: string; material_id: string; kolicina: number }

export async function loadNorme(serviceIds?: string[]): Promise<Norma[]> {
  let q = supabase.from('service_materials').select('*');
  if (serviceIds?.length) q = q.in('service_id', serviceIds);
  const { data } = await q;
  return (data || []).map((n) => ({ ...n, kolicina: Number(n.kolicina) })) as Norma[];
}
