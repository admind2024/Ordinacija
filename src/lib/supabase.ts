import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase kredencijali nisu konfigurisani. Dodajte VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY u .env fajl.'
  );
}

const baseUrl = supabaseUrl || 'https://placeholder.supabase.co';

// ---------------------------------------------------------------------------------
// Poslovne jedinice
//
// Tabele ispod pripadaju jednoj poslovnoj jedinici (MOA Podgorica, Bolnica...). Da se ne bi
// mijenjao svaki upit u aplikaciji, jedinica se dodaje OVDJE, na jednom mjestu:
//   - citanje, izmjena i brisanje dobijaju filter establishment_id = aktivna jedinica
//   - unos dobija establishment_id aktivne jedinice (ako ga red vec nema)
//
// Aktivnu jedinicu postavlja CalendarContext (postaviJedinicuZaUpite). Dok nije postavljena
// (javne stranice: anketa, potvrda termina) upiti idu neizmijenjeni.
//
// Upit koji namjerno treba SVE jedinice (istorija pacijenta) sam navodi filter po
// establishment_id — npr. .not('establishment_id', 'is', null) — i tada se nista ne dodaje.
//
// Namjerno NISU ovdje: appointments, doctors, rooms, services, service_categories (ucitava ih
// CalendarContext za sve jedinice i sam filtrira, jer istorija pacijenta treba sve) i tabele
// koje se citaju samo preko roditelja (popis_stavke, vaucer_promjene, appointment_services).
// ---------------------------------------------------------------------------------
const TABELE_PO_JEDINICI = new Set([
  'payments', 'dugovanja', 'uplate_duga',
  'materials', 'material_kretanja', 'material_usage', 'popisi',
  'vauceri', 'oglasna_tabla', 'lista_cekanja', 'kalendar_dogadjaji',
  'zakljucenja_smjene', 'zakljucenja_dana', 'smjene',
  'examinations',
]);

let jedinicaZaUpite = '';

export function postaviJedinicuZaUpite(id: string | null | undefined) {
  jedinicaZaUpite = id || '';
}

export function jedinicaZaUpiteId(): string {
  return jedinicaZaUpite;
}

const REST_PREFIX = `${baseUrl}/rest/v1/`;

function dodajJedinicu(red: unknown): unknown {
  if (red && typeof red === 'object' && !Array.isArray(red)) {
    const r = red as Record<string, unknown>;
    return r.establishment_id == null ? { ...r, establishment_id: jedinicaZaUpite } : r;
  }
  return red;
}

const fetchSaJedinicom: typeof fetch = (input, init) => {
  try {
    if (jedinicaZaUpite && typeof input === 'string' && input.startsWith(REST_PREFIX)) {
      const ostatak = input.slice(REST_PREFIX.length);
      const tabela = ostatak.split('?')[0];
      if (TABELE_PO_JEDINICI.has(tabela)) {
        const metoda = (init?.method || 'GET').toUpperCase();
        if (metoda === 'POST' || metoda === 'PUT') {
          if (typeof init?.body === 'string') {
            const tijelo = JSON.parse(init.body);
            const novo = Array.isArray(tijelo) ? tijelo.map(dodajJedinicu) : dodajJedinicu(tijelo);
            init = { ...init, body: JSON.stringify(novo) };
            // Grupni unos salje spisak kolona; bez ove dopune PostgREST bi ignorisao dodato polje.
            if (/[?&]columns=/.test(input) && !/establishment_id/.test(input)) {
              input = input.replace(/([?&]columns=)([^&]*)/, '$1$2%2C%22establishment_id%22');
            }
          }
        } else if (!/[?&]establishment_id=/.test(input)) {
          input = `${input}${input.includes('?') ? '&' : '?'}establishment_id=eq.${jedinicaZaUpite}`;
        }
      }
    }
  } catch {
    // Ako dopuna ne uspije, upit ide neizmijenjen.
  }
  return fetch(input, init);
};

export const supabase = createClient(baseUrl, supabaseAnonKey || 'placeholder-key', {
  global: { fetch: fetchSaJedinicom },
});
