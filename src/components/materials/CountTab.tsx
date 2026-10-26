import { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ClipboardCheck, Plus, ArrowLeft, Lock } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { kol, loadMaterijali } from '../../lib/lager';
import type { Material } from '../../types';

interface Popis { id: string; datum: string; status: 'otvoren' | 'zakljucen'; napomena: string | null; created_at: string; zakljucen_at: string | null }
interface Stavka { id: string; material_id: string; sistemsko: number; popisano: number | null; razlika: number | null; napomena: string | null }

// Popis (inventura): sistemsko stanje naspram prebrojanog; zakljucivanje knjizi razliku na lager.
export default function CountTab() {
  const { user } = useAuth();
  const [popisi, setPopisi] = useState<Popis[] | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [aktivan, setAktivan] = useState<Popis | null>(null);
  const [stavke, setStavke] = useState<Stavka[]>([]);
  const [unos, setUnos] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const [p, m] = await Promise.all([
      supabase.from('popisi').select('*').order('created_at', { ascending: false }),
      loadMaterijali().catch(() => [] as Material[]),
    ]);
    if (p.error) setError('Popisi nisu učitani: ' + p.error.message); else setError('');
    setPopisi((p.data || []) as Popis[]);
    setMaterials(m);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function otvori(p: Popis) {
    setAktivan(p);
    const { data } = await supabase.from('popis_stavke').select('*').eq('popis_id', p.id);
    const list = (data || []).map((s) => ({
      ...s, sistemsko: Number(s.sistemsko), popisano: s.popisano == null ? null : Number(s.popisano), razlika: s.razlika == null ? null : Number(s.razlika),
    })) as Stavka[];
    setStavke(list);
    setUnos(Object.fromEntries(list.map((s) => [s.id, s.popisano == null ? '' : String(s.popisano)])));
  }

  async function zapocni() {
    if (popisi?.some((p) => p.status === 'otvoren') && !confirm('Već postoji otvoren popis. Započeti novi?')) return;
    setBusy(true);
    const { data: p, error: e } = await supabase.from('popisi').insert({ user_id: user?.id || null }).select().single();
    if (e || !p) { setBusy(false); setError('Popis nije napravljen: ' + e?.message); return; }
    // Sistemsko stanje u trenutku pocetka popisa
    await supabase.from('popis_stavke').insert(materials.map((m) => ({ popis_id: p.id, material_id: m.id, sistemsko: m.trenutna_kolicina })));
    setBusy(false);
    await refresh();
    otvori(p as Popis);
  }

  async function sacuvajUnos(s: Stavka) {
    const v = unos[s.id];
    const popisano = v === '' ? null : Number(v.replace(',', '.'));
    if (popisano !== null && (Number.isNaN(popisano) || popisano < 0)) return;
    if (popisano === s.popisano) return;
    await supabase.from('popis_stavke').update({ popisano }).eq('id', s.id);
    setStavke((list) => list.map((x) => (x.id === s.id ? { ...x, popisano } : x)));
  }

  async function zakljuci() {
    if (!aktivan) return;
    const nepopisano = stavke.filter((s) => s.popisano == null).length;
    const msg = nepopisano
      ? `${nepopisano} stavki nije prebrojano i neće se mijenjati. Zaključiti popis i knjižiti razlike na lager?`
      : 'Zaključiti popis i knjižiti razlike na lager? Ovo se ne može poništiti.';
    if (!confirm(msg)) return;
    setBusy(true);
    const { data, error: e } = await supabase.rpc('zakljuci_popis', { p_popis_id: aktivan.id, p_user_id: user?.id || null });
    setBusy(false);
    if (e) { alert('Popis nije zaključen: ' + e.message); return; }
    alert(`Popis zaključen. Ispravljeno stanje za ${data} materijala.`);
    await refresh();
    otvori({ ...aktivan, status: 'zakljucen' });
  }

  const naziv = (id: string) => materials.find((m) => m.id === id);

  if (aktivan) {
    const zakljucen = aktivan.status === 'zakljucen';
    const prebrojano = stavke.filter((s) => s.popisano != null).length;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setAktivan(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" aria-label="Nazad na popise"><ArrowLeft size={18} /></button>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Popis {format(parseISO(aktivan.datum), 'dd.MM.yyyy.')}</h2>
              <p className="text-xs text-gray-500">{zakljucen ? 'Zaključen' : `Prebrojano ${prebrojano} od ${stavke.length}`}</p>
            </div>
          </div>
          {!zakljucen && <Button onClick={zakljuci} loading={busy}><Lock size={14} /> Zaključi popis</Button>}
        </div>
        <div className="overflow-x-auto border border-border rounded-xl bg-white">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Materijal</th>
                <th scope="col" className="text-right px-4 py-2 font-semibold">Po sistemu</th>
                <th scope="col" className="text-right px-4 py-2 font-semibold">Prebrojano</th>
                <th scope="col" className="text-right px-4 py-2 font-semibold">Razlika</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stavke
                .sort((a, b) => (naziv(a.material_id)?.naziv || '').localeCompare(naziv(b.material_id)?.naziv || ''))
                .map((s) => {
                  const m = naziv(s.material_id);
                  const raz = zakljucen ? s.razlika : s.popisano == null ? null : s.popisano - s.sistemsko;
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-2 text-gray-900">{m?.naziv || '—'} <span className="text-xs text-gray-400">{m?.jedinica_mjere}</span></td>
                      <td className="px-4 py-2 text-right tabular-nums text-gray-600">{kol(s.sistemsko)}</td>
                      <td className="px-4 py-2 text-right">
                        {zakljucen ? <span className="tabular-nums">{s.popisano == null ? '—' : kol(s.popisano)}</span> : (
                          <input aria-label={`Prebrojano: ${m?.naziv}`} inputMode="decimal" value={unos[s.id] ?? ''}
                            onChange={(e) => setUnos({ ...unos, [s.id]: e.target.value })}
                            onBlur={() => sacuvajUnos(s)}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-24 px-2 py-1 border border-border rounded-md text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        )}
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums font-medium ${raz == null || raz === 0 ? 'text-gray-400' : raz < 0 ? 'text-danger' : 'text-success'}`}>
                        {raz == null ? '—' : `${raz > 0 ? '+' : ''}${kol(raz)}`}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!zakljucen && <p className="text-xs text-gray-400">Unos se čuva čim pređete na sljedeće polje. Razlika se knjiži tek kad zaključite popis.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={zapocni} loading={busy} disabled={!materials.length}><Plus size={16} /> Započni popis</Button>
      </div>
      {error && <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}
      {!popisi ? (
        <div className="space-y-2" aria-busy="true">{[0, 1].map((i) => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}</div>
      ) : popisi.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <ClipboardCheck className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">Još nema popisa. Prvi popis postavlja tačno početno stanje lagera.</p>
        </div>
      ) : (
        <ul className="bg-white border border-border rounded-xl divide-y divide-border">
          {popisi.map((p) => (
            <li key={p.id}>
              <button onClick={() => otvori(p)} className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <span className="text-sm font-medium text-gray-900">Popis {format(parseISO(p.datum), 'dd.MM.yyyy.')}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'otvoren' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {p.status === 'otvoren' ? 'U toku' : 'Zaključen'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
