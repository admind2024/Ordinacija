// Interni dogadjaji u kalendaru (sastanak, edukacija, servis aparata).
import { supabase } from './supabase';

export interface Dogadjaj {
  id: string;
  naslov: string;
  room_id: string | null;
  pocetak: string;
  kraj: string;
  boja: string;
  opis: string | null;
  ucesnici: string[];
}

export async function loadDogadjaji(od: Date, doVr: Date): Promise<Dogadjaj[]> {
  const { data, error } = await supabase
    .from('kalendar_dogadjaji')
    .select('*')
    .lt('pocetak', doVr.toISOString())
    .gt('kraj', od.toISOString())
    .order('pocetak');
  if (error) throw error;
  return (data || []) as Dogadjaj[];
}

// Dogadjaj koji blokira ordinaciju u datom intervalu (za provjeru pri zakazivanju).
export async function blokadaOrdinacije(roomId: string, pocetak: Date, kraj: Date): Promise<Dogadjaj | null> {
  const { data } = await supabase
    .from('kalendar_dogadjaji')
    .select('*')
    .eq('room_id', roomId)
    .lt('pocetak', kraj.toISOString())
    .gt('kraj', pocetak.toISOString())
    .limit(1);
  return ((data || [])[0] as Dogadjaj) || null;
}
