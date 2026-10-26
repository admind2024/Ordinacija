// Raspored rada: racuna da li ljekar radi na odredjeni dan i u koje vrijeme.
// Redosljed pravila: odsustvo > izuzetak za datum > sedmicni sablon.
import { format, getISODay, differenceInCalendarDays, parseISO } from 'date-fns';
import { supabase } from './supabase';
import type { DoctorSchedule, Odsustvo, Pauza, RazlogOdsustva } from '../types';

export const DANI = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];
export const DANI_KRATKO = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

export const RAZLOZI_ODSUSTVA: Record<RazlogOdsustva, string> = {
  godisnji: 'Godišnji odmor',
  bolovanje: 'Bolovanje',
  licni: 'Lični razlozi',
  sluzbeni_put: 'Službeni put',
  ostalo: 'Ostalo',
};

export type DanStatus =
  | { status: 'radi'; pocetak: string; kraj: string; pauze: Pauza[]; izvor: 'sablon' | 'datum'; napomena?: string }
  | { status: 'ne_radi'; izvor: 'sablon' | 'datum'; napomena?: string }
  | { status: 'odsustvo'; razlog: RazlogOdsustva; napomena?: string }
  | { status: 'nije_definisano' };

export interface RasporedPodaci {
  schedules: DoctorSchedule[];
  odsustva: Odsustvo[];
}

// Postgres vraca TIME kao "08:00:00"; u UI koristimo "08:00".
export function hhmm(t?: string | null): string {
  return t ? t.slice(0, 5) : '';
}

export function normalizeSchedule(row: Record<string, unknown>): DoctorSchedule {
  return {
    ...(row as unknown as DoctorSchedule),
    pocetak: hhmm(row.pocetak as string | null),
    kraj: hhmm(row.kraj as string | null),
    pauze: Array.isArray(row.pauze) ? (row.pauze as Pauza[]) : [],
  };
}

export async function loadRaspored(doctorIds?: string[]): Promise<RasporedPodaci> {
  let sq = supabase.from('doctor_schedules').select('*');
  let oq = supabase.from('odsustva').select('*').order('datum_od', { ascending: false });
  if (doctorIds && doctorIds.length) {
    sq = sq.in('doctor_id', doctorIds);
    oq = oq.in('doctor_id', doctorIds);
  }
  const [s, o] = await Promise.all([sq, oq]);
  if (s.error) throw s.error;
  if (o.error) throw o.error;
  return {
    schedules: (s.data || []).map(normalizeSchedule),
    odsustva: (o.data || []) as Odsustvo[],
  };
}

export function danStatus(doctorId: string, dan: Date, data: RasporedPodaci): DanStatus {
  const iso = format(dan, 'yyyy-MM-dd');

  const ods = data.odsustva.find(
    (o) => o.doctor_id === doctorId && o.datum_od <= iso && o.datum_do >= iso
  );
  if (ods) return { status: 'odsustvo', razlog: ods.razlog, napomena: ods.napomena };

  const izuzetak = data.schedules.find(
    (s) => s.doctor_id === doctorId && !s.ponavljajuci && s.datum === iso
  );
  const red =
    izuzetak ||
    data.schedules.find(
      (s) => s.doctor_id === doctorId && s.ponavljajuci && s.dan_u_sedmici === getISODay(dan)
    );
  if (!red) return { status: 'nije_definisano' };

  const izvor = izuzetak ? 'datum' : 'sablon';
  if (red.tip === 'neradni' || !red.pocetak || !red.kraj) {
    return { status: 'ne_radi', izvor, napomena: red.napomena };
  }
  return { status: 'radi', pocetak: red.pocetak, kraj: red.kraj, pauze: red.pauze, izvor, napomena: red.napomena };
}

// Provjera termina: vraca opis problema ili null ako je ljekar dostupan.
// Ako raspored za ljekara nije unesen, ne prijavljujemo nista (stari nacin rada).
export function provjeriDostupnost(
  doctorId: string,
  pocetak: Date,
  kraj: Date,
  data: RasporedPodaci
): string | null {
  const st = danStatus(doctorId, pocetak, data);
  if (st.status === 'nije_definisano') return null;
  if (st.status === 'odsustvo') return `Ljekar je odsutan (${RAZLOZI_ODSUSTVA[st.razlog].toLowerCase()}).`;
  if (st.status === 'ne_radi') return 'Ljekar taj dan ne radi.';
  const od = format(pocetak, 'HH:mm');
  const doVr = format(kraj, 'HH:mm');
  if (od < st.pocetak || doVr > st.kraj) {
    return `Termin je van radnog vremena (${st.pocetak}–${st.kraj}).`;
  }
  const pauza = st.pauze.find((p) => od < p.do && doVr > p.od);
  if (pauza) return `Termin pada u pauzu (${pauza.od}–${pauza.do}).`;
  return null;
}

export function brojDana(o: Pick<Odsustvo, 'datum_od' | 'datum_do'>): number {
  return differenceInCalendarDays(parseISO(o.datum_do), parseISO(o.datum_od)) + 1;
}
