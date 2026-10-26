// Nacini placanja i vauceri — zajednicko za naplatu, vaucere i presjek smjene.
import { format } from 'date-fns';
import { supabase } from './supabase';
import type { Vaucer } from '../types';

export const METODA_LABELS: Record<string, string> = {
  gotovina: 'Gotovina',
  gotovina_fiskalni: 'Gotovina (fiskalni)',
  kartica: 'Kartica',
  kartica_fiskalni: 'Kartica (fiskalni)',
  bon: 'Vaučer',
  transfer: 'Prenos na račun',
  administrativna_zabrana: 'Administrativna zabrana',
  osiguranje: 'Osiguranje',
  online: 'Online',
};

export const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

export type VaucerProvjera =
  | { ok: true; vaucer: Vaucer }
  | { ok: false; poruka: string; vaucer?: Vaucer };

// Pronadji vaucer po broju i provjeri da li moze da se koristi danas.
export async function provjeriVaucer(broj: string): Promise<VaucerProvjera> {
  const b = broj.trim().toUpperCase();
  if (!b) return { ok: false, poruka: 'Unesite broj vaučera.' };
  const { data, error } = await supabase.from('vauceri').select('*').eq('broj', b).maybeSingle();
  if (error) return { ok: false, poruka: 'Provjera nije uspjela: ' + error.message };
  if (!data) return { ok: false, poruka: 'Vaučer sa tim brojem ne postoji.' };
  const v = { ...data, iznos: Number(data.iznos), preostalo: Number(data.preostalo) } as Vaucer;
  if (v.status === 'storniran') return { ok: false, poruka: 'Vaučer je storniran.', vaucer: v };
  if (v.status === 'iskoristen' || v.preostalo <= 0) return { ok: false, poruka: 'Vaučer je već iskorišćen.', vaucer: v };
  if (v.vazi_do && v.vazi_do < format(new Date(), 'yyyy-MM-dd')) {
    return { ok: false, poruka: `Vaučeru je istekao rok (${format(new Date(v.vazi_do), 'dd.MM.yyyy.')}).`, vaucer: v };
  }
  return { ok: true, vaucer: v };
}

// Skini iznos sa vaucera (atomicno u bazi). Vraca preostali iznos.
export async function iskoristiVaucer(vaucerId: string, iznos: number, paymentId: string | null, userId?: string) {
  const { data, error } = await supabase.rpc('iskoristi_vaucer', {
    p_vaucer_id: vaucerId,
    p_iznos: iznos,
    p_payment_id: paymentId,
    p_user_id: userId || null,
  });
  if (error) throw new Error(error.message);
  return Number(data);
}
