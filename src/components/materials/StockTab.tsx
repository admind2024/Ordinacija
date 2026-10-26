import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, PackagePlus, AlertTriangle, Boxes } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import PurchaseModal from './PurchaseModal';
import { kol, loadMaterijali, STANJE_STIL, stanjeStatus } from '../../lib/lager';
import { eur } from '../../lib/payments';
import type { Material } from '../../types';

// Lager: stanje svakog materijala, prag za upozorenje i vrijednost zaliha.
export default function StockTab() {
  const [list, setList] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [samoPriKraju, setSamoPriKraju] = useState(false);
  const [nabavka, setNabavka] = useState<{ open: boolean; id?: string }>({ open: false });

  const refresh = useCallback(async () => {
    try { setList(await loadMaterijali()); setError(''); }
    catch (e) { setError('Lager nije učitan: ' + (e instanceof Error ? e.message : '')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return list.filter((m) =>
      (!t || m.naziv.toLowerCase().includes(t) || (m.sifra || '').toLowerCase().includes(t) || (m.brend || '').toLowerCase().includes(t)) &&
      (!samoPriKraju || stanjeStatus(m) !== 'ok')
    );
  }, [list, q, samoPriKraju]);

  const priKraju = list.filter((m) => stanjeStatus(m) === 'nisko' || stanjeStatus(m) === 'minus').length;
  const vrijednost = list.reduce((s, m) => s + Math.max(0, m.trenutna_kolicina) * (m.nabavna_cijena || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card padding={false} className="p-4">
          <p className="text-xs text-gray-500">Vrijednost zaliha (nabavna)</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{eur(vrijednost)}</p>
        </Card>
        <Card padding={false} className={`p-4 ${priKraju ? 'border-amber-200 bg-amber-50' : ''}`}>
          <p className="text-xs text-gray-500 flex items-center gap-1">{priKraju > 0 && <AlertTriangle size={12} className="text-warning" />}Pri kraju ili u minusu</p>
          <p className={`text-2xl font-bold tabular-nums ${priKraju ? 'text-amber-700' : 'text-gray-900'}`}>{priKraju}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input aria-label="Pretraga materijala" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naziv, šifra, brend"
              className="pl-8 pr-3 py-2 border border-border rounded-lg text-sm w-64 max-w-full" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={samoPriKraju} onChange={(e) => setSamoPriKraju(e.target.checked)} className="w-4 h-4 accent-primary-600" />
            Samo ono što treba naručiti
          </label>
        </div>
        <Button onClick={() => setNabavka({ open: true })}><PackagePlus size={16} /> Nabavka</Button>
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-lg bg-gray-100 animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Boxes className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">{list.length ? 'Ništa ne odgovara filteru.' : 'Nema materijala u katalogu.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl bg-white">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Materijal</th>
                <th scope="col" className="text-right px-4 py-2 font-semibold">Stanje</th>
                <th scope="col" className="text-right px-4 py-2 font-semibold">Prag</th>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Status</th>
                <th scope="col" className="text-right px-4 py-2 font-semibold">Nabavna</th>
                <th scope="col" className="px-4 py-2"><span className="sr-only">Akcije</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((m) => {
                const st = stanjeStatus(m);
                const [lbl, cls] = STANJE_STIL[st];
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-900">{m.naziv}</p>
                      <p className="text-xs text-gray-400">{[m.sifra, m.kategorija, m.brend].filter(Boolean).join(' · ') || m.jedinica_mjere}</p>
                    </td>
                    <td className={`px-4 py-2 text-right tabular-nums font-semibold ${st === 'minus' ? 'text-danger' : ''}`}>
                      {kol(m.trenutna_kolicina)} <span className="text-xs font-normal text-gray-400">{m.jedinica_mjere}</span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-500">{m.min_kolicina ? kol(m.min_kolicina) : '—'}</td>
                    <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{lbl}</span></td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-600">{m.nabavna_cijena ? eur(m.nabavna_cijena) : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => setNabavka({ open: true, id: m.id })} className="text-xs text-primary-700 hover:underline whitespace-nowrap">+ nabavka</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {nabavka.open && (
        <PurchaseModal isOpen onClose={() => setNabavka({ open: false })} materials={list} preselectId={nabavka.id} onSaved={refresh} />
      )}
    </div>
  );
}
