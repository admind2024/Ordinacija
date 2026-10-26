// Zdravstveni podaci iz kartona: alergije, faktori rizika, dijagnoze i dokumenta.
import { supabase } from './supabase';

export interface Alergija {
  id: string;
  patient_id: string;
  naziv: string;
  tezina: 'blaga' | 'umjerena' | 'teska' | 'nepoznato';
  reakcija: string | null;
  od_datum: string | null;
  created_at: string;
}

export interface Rizik {
  id: string;
  patient_id: string;
  tip: string;
  opis: string | null;
  od_datum: string | null;
  aktivan: boolean;
  created_at: string;
}

export interface Dijagnoza {
  id: string;
  patient_id: string;
  mkb_sifra: string;
  naziv: string;
  tip: 'licna' | 'porodicna';
  datum: string;
  examination_id: string | null;
  napomena: string | null;
  created_at: string;
}

export interface Dokument {
  id: string;
  patient_id: string;
  naziv: string;
  tip: 'opsti' | 'nalaz' | 'saglasnost' | 'foto_prije' | 'foto_poslije' | 'ostalo';
  opis: string | null;
  putanja: string;
  mime: string | null;
  velicina: number | null;
  datum: string;
  created_at: string;
}

export const TEZINA_LABELS: Record<Alergija['tezina'], string> = {
  blaga: 'Blaga',
  umjerena: 'Umjerena',
  teska: 'Teška (anafilaksa)',
  nepoznato: 'Nepoznato',
};

// Faktori rizika bitni za estetske i dermatoloske procedure.
export const RIZICI: Record<string, string> = {
  trudnoca: 'Trudnoća / dojenje',
  antikoagulansi: 'Antikoagulantna terapija',
  dijabetes: 'Dijabetes',
  autoimuna: 'Autoimuno oboljenje',
  keloidi: 'Sklonost keloidima',
  herpes: 'Herpes labialis (rekurentni)',
  izotretinoin: 'Izotretinoin u zadnjih 6 mjeseci',
  fotosenzitivnost: 'Fotosenzitivni lijekovi',
  pejsmejker: 'Pejsmejker / metalni implant',
  epilepsija: 'Epilepsija',
  hipertenzija: 'Hipertenzija',
  pusac: 'Pušač',
  ostalo: 'Ostalo',
};

export const DOKUMENT_TIPOVI: Record<Dokument['tip'], string> = {
  opsti: 'Opšti dokument',
  nalaz: 'Nalaz / laboratorija',
  saglasnost: 'Saglasnost pacijenta',
  foto_prije: 'Fotografija prije',
  foto_poslije: 'Fotografija poslije',
  ostalo: 'Ostalo',
};

// Cesto koriscene MKB-10 sifre u estetskoj medicini i dermatologiji. Moze se upisati i bilo koja druga.
export const MKB_CESTE: { sifra: string; naziv: string }[] = [
  { sifra: 'Z41.1', naziv: 'Estetska intervencija zbog neprihvatljivog izgleda' },
  { sifra: 'L70.0', naziv: 'Akne vulgaris' },
  { sifra: 'L71.9', naziv: 'Rozacea' },
  { sifra: 'L81.1', naziv: 'Hloazma (melazma)' },
  { sifra: 'L81.4', naziv: 'Druga melaninska hiperpigmentacija' },
  { sifra: 'L80', naziv: 'Vitiligo' },
  { sifra: 'L40.0', naziv: 'Psorijaza vulgaris' },
  { sifra: 'L20.9', naziv: 'Atopijski dermatitis' },
  { sifra: 'L21.9', naziv: 'Seboroični dermatitis' },
  { sifra: 'L23.9', naziv: 'Alergijski kontaktni dermatitis' },
  { sifra: 'L50.9', naziv: 'Urtikarija' },
  { sifra: 'L63.9', naziv: 'Alopecija areata' },
  { sifra: 'L64.9', naziv: 'Androgena alopecija' },
  { sifra: 'L68.0', naziv: 'Hirzutizam' },
  { sifra: 'L74.5', naziv: 'Fokalna hiperhidroza' },
  { sifra: 'L90.5', naziv: 'Ožiljna stanja i fibroza kože' },
  { sifra: 'L91.0', naziv: 'Hipertrofični ožiljak (keloid)' },
  { sifra: 'L82', naziv: 'Seboroična keratoza' },
  { sifra: 'L57.0', naziv: 'Aktinična keratoza' },
  { sifra: 'L72.0', naziv: 'Epidermalna cista' },
  { sifra: 'L60.0', naziv: 'Urastao nokat' },
  { sifra: 'L84', naziv: 'Kurje oko i žulj' },
  { sifra: 'D22.9', naziv: 'Melanocitni nevus' },
  { sifra: 'D23.9', naziv: 'Benigni tumor kože' },
  { sifra: 'D17.9', naziv: 'Lipom' },
  { sifra: 'B07', naziv: 'Virusne bradavice' },
  { sifra: 'A63.0', naziv: 'Anogenitalne bradavice (kondilomi)' },
  { sifra: 'B08.1', naziv: 'Molluscum contagiosum' },
  { sifra: 'I78.1', naziv: 'Nevus araneus (paukov nevus)' },
  { sifra: 'I83.9', naziv: 'Varikozne vene donjih ekstremiteta' },
  { sifra: 'E66.9', naziv: 'Gojaznost' },
  { sifra: 'C44.9', naziv: 'Maligni tumor kože (nemelanomski)' },
  { sifra: 'C43.9', naziv: 'Melanom kože' },
];

export interface ZdravstveniPodaci {
  alergije: Alergija[];
  rizici: Rizik[];
  dijagnoze: Dijagnoza[];
}

export async function loadZdravlje(patientId: string): Promise<ZdravstveniPodaci> {
  const [a, r, d] = await Promise.all([
    supabase.from('pacijent_alergije').select('*').eq('patient_id', patientId).order('created_at'),
    supabase.from('pacijent_rizici').select('*').eq('patient_id', patientId).order('created_at'),
    supabase.from('pacijent_dijagnoze').select('*').eq('patient_id', patientId).order('datum', { ascending: false }),
  ]);
  const err = a.error || r.error || d.error;
  if (err) throw err;
  return {
    alergije: (a.data || []) as Alergija[],
    rizici: (r.data || []) as Rizik[],
    dijagnoze: (d.data || []) as Dijagnoza[],
  };
}

export const BUCKET = 'moa-dokumenti';

export async function uploadDokument(
  patientId: string,
  file: File,
  meta: { naziv: string; tip: Dokument['tip']; opis?: string; datum?: string; userId?: string }
) {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin';
  const putanja = `${patientId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(putanja, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const { error } = await supabase.from('pacijent_dokumenti').insert({
    patient_id: patientId,
    naziv: meta.naziv,
    tip: meta.tip,
    opis: meta.opis || null,
    putanja,
    mime: file.type || null,
    velicina: file.size,
    datum: meta.datum || undefined,
    uploaded_by: meta.userId || null,
  });
  if (error) {
    // Ne ostavljaj fajl bez zapisa u bazi
    await supabase.storage.from(BUCKET).remove([putanja]);
    throw error;
  }
}

export async function linkDokumenta(putanja: string, sekundi = 300): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(putanja, sekundi);
  return data?.signedUrl || null;
}

export async function obrisiDokument(d: Dokument) {
  await supabase.storage.from(BUCKET).remove([d.putanja]);
  await supabase.from('pacijent_dokumenti').delete().eq('id', d.id);
}
