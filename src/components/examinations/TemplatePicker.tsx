import { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, ChevronDown, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export type PoljeSablona = 'razlog_dolaska' | 'nalaz' | 'rezultati' | 'terapija' | 'preporuke';

interface Sablon { id: string; polje: PoljeSablona; naziv: string; tekst: string; doctor_id: string | null; koristeno: number }

interface Props {
  polje: PoljeSablona;
  doctorId?: string;
  value: string;
  onInsert: (text: string) => void;
}

// Sabloni teksta za jedno polje pregleda: ubaci postojeci ili sacuvaj trenutni tekst kao novi.
export default function TemplatePicker({ polje, doctorId, value, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Sablon[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    let q = supabase.from('pregled_sabloni').select('*').eq('polje', polje).order('koristeno', { ascending: false });
    q = doctorId ? q.or(`doctor_id.is.null,doctor_id.eq.${doctorId}`) : q.is('doctor_id', null);
    q.then(({ data }) => { if (alive) setList((data || []) as Sablon[]); });
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => { alive = false; document.removeEventListener('mousedown', close); };
  }, [open, polje, doctorId]);

  function ubaci(s: Sablon) {
    // Dopisuje na postojeci tekst umjesto da ga brise
    onInsert(value.trim() ? `${value.trimEnd()}\n${s.tekst}` : s.tekst);
    setOpen(false);
    supabase.from('pregled_sabloni').update({ koristeno: s.koristeno + 1 }).eq('id', s.id).then(() => {});
  }

  async function sacuvaj() {
    if (!value.trim()) { alert('Polje je prazno — nema šta da se sačuva kao šablon.'); return; }
    const naziv = prompt('Naziv šablona:', value.trim().split('\n')[0].slice(0, 40));
    if (!naziv?.trim()) return;
    const zaSve = doctorId ? confirm('Da li šablon da vide svi ljekari? (Otkaži = samo vi)') : true;
    const { error } = await supabase.from('pregled_sabloni').insert({
      polje, naziv: naziv.trim(), tekst: value.trim(), doctor_id: zaSve ? null : doctorId,
    });
    if (error) alert('Šablon nije sačuvan: ' + error.message);
    else setList(null);
  }

  async function obrisi(s: Sablon) {
    if (!confirm(`Obrisati šablon „${s.naziv}"?`)) return;
    await supabase.from('pregled_sabloni').delete().eq('id', s.id);
    setList((l) => (l || []).filter((x) => x.id !== s.id));
  }

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary-700 hover:bg-primary-50 px-1.5 py-0.5 rounded">
        Šabloni <ChevronDown size={12} />
      </button>
      <button type="button" onClick={sacuvaj} title="Sačuvaj tekst kao šablon" aria-label="Sačuvaj tekst kao šablon"
        className="p-0.5 text-gray-400 hover:text-primary-700 rounded">
        <BookmarkPlus size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-72 bg-white border border-border rounded-lg shadow-lg py-1 normal-case tracking-normal">
          {list === null ? (
            <p className="px-3 py-2 text-xs text-gray-400">Učitavanje…</p>
          ) : list.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-500">Nema šablona. Upišite tekst i kliknite ikonicu pored da ga sačuvate.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {list.map((s) => (
                <li key={s.id} className="group flex items-start">
                  <button type="button" onClick={() => ubaci(s)} className="flex-1 text-left px-3 py-2 hover:bg-gray-50 min-w-0">
                    <span className="block text-sm font-medium text-gray-800 truncate">{s.naziv}{s.doctor_id ? '' : ' · zajednički'}</span>
                    <span className="block text-xs font-normal text-gray-500 line-clamp-2">{s.tekst}</span>
                  </button>
                  <button type="button" onClick={() => obrisi(s)} className="p-2 text-gray-300 hover:text-danger opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Obriši šablon ${s.naziv}`}>
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
