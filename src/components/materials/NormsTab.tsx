import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Search, FlaskConical } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { useCalendar } from '../../contexts/CalendarContext';
import { kol, loadNorme, type Norma } from '../../lib/lager';
import type { Material } from '../../types';

// Norma utroska: koliko kojeg materijala ide na jednu uslugu. Pri zakazivanju se predlaze automatski.
export default function NormsTab({ materials }: { materials: Material[] }) {
  const { services } = useCalendar();
  const [q, setQ] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [norme, setNorme] = useState<Norma[]>([]);
  const [noviMat, setNoviMat] = useState('');
  const [novaKol, setNovaKol] = useState('');
  const [error, setError] = useState('');

  const refresh = () => loadNorme().then(setNorme);
  useEffect(() => { refresh(); }, []);

  const brojNormi = useMemo(() => {
    const m = new Map<string, number>();
    norme.forEach((n) => m.set(n.service_id, (m.get(n.service_id) || 0) + 1));
    return m;
  }, [norme]);

  const usluge = services.filter((s) => !q || s.naziv.toLowerCase().includes(q.toLowerCase()));
  const izabrana = services.find((s) => s.id === serviceId);
  const zaUslugu = norme.filter((n) => n.service_id === serviceId);
  const mat = (id: string) => materials.find((m) => m.id === id);

  async function dodaj() {
    const k = Number(novaKol.replace(',', '.'));
    if (!noviMat || !k || k <= 0) { setError('Izaberite materijal i količinu.'); return; }
    const { error: e } = await supabase.from('service_materials')
      .upsert({ service_id: serviceId, material_id: noviMat, kolicina: k }, { onConflict: 'service_id,material_id' });
    if (e) { setError('Nije sačuvano: ' + e.message); return; }
    setError(''); setNoviMat(''); setNovaKol('');
    refresh();
  }

  async function ukloni(n: Norma) {
    await supabase.from('service_materials').delete().eq('id', n.id);
    refresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-4">
      <Card padding={false} className="p-2">
        <div className="relative p-2">
          <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input aria-label="Pretraga usluga" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pretraga usluga"
            className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-sm" />
        </div>
        <ul className="max-h-[60vh] overflow-y-auto">
          {usluge.map((s) => (
            <li key={s.id}>
              <button onClick={() => setServiceId(s.id)} aria-current={s.id === serviceId}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2
                  ${s.id === serviceId ? 'bg-primary-50 text-primary-800 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className="truncate">{s.naziv}</span>
                {brojNormi.get(s.id) ? <span className="text-[11px] text-primary-700 tabular-nums">{brojNormi.get(s.id)}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        {!izabrana ? (
          <div className="text-center py-10">
            <FlaskConical className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-sm text-gray-500">Izaberite uslugu da odredite koji materijal i koliko se troši.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{izabrana.naziv}</h2>
              <p className="text-sm text-gray-500">Ovi materijali se automatski dodaju kad se zakaže ova usluga (mogu se izmijeniti u terminu).</p>
            </div>
            {zaUslugu.length === 0 ? (
              <p className="text-sm text-gray-400">Za ovu uslugu norma nije unesena.</p>
            ) : (
              <ul className="divide-y divide-border border border-border rounded-lg">
                {zaUslugu.map((n) => (
                  <li key={n.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{mat(n.material_id)?.naziv || '—'}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums font-medium">{kol(n.kolicina)} <span className="text-xs text-gray-400">{mat(n.material_id)?.jedinica_mjere}</span></span>
                      <button onClick={() => ukloni(n)} className="p-1 text-gray-400 hover:text-danger rounded" aria-label="Ukloni iz norme"><Trash2 size={14} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[12rem]">
                <label htmlFor="norma-mat" className="block text-xs font-medium text-gray-500 mb-1">Materijal</label>
                <select id="norma-mat" value={noviMat} onChange={(e) => setNoviMat(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">
                  <option value="">Izaberite…</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.naziv}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="norma-kol" className="block text-xs font-medium text-gray-500 mb-1">Količina</label>
                <input id="norma-kol" inputMode="decimal" value={novaKol} onChange={(e) => setNovaKol(e.target.value)}
                  placeholder={mat(noviMat)?.jedinica_mjere || ''} className="w-28 px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <Button onClick={dodaj}><Plus size={14} /> Dodaj</Button>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
