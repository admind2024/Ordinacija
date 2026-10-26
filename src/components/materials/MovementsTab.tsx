import { useCallback, useEffect, useState } from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { Download, History } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../lib/exportReport';
import { kol, TIP_KRETANJA, type Kretanje, type TipKretanja } from '../../lib/lager';
import type { Material } from '../../types';

// Istorija svih kretanja zaliha (ulaz/izlaz) sa filterima.
export default function MovementsTab({ materials }: { materials: Material[] }) {
  const [od, setOd] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [doDatum, setDoDatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [materialId, setMaterialId] = useState('');
  const [tip, setTip] = useState<'' | TipKretanja>('');
  const [rows, setRows] = useState<Kretanje[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    let q = supabase.from('material_kretanja').select('*')
      .gte('datum', new Date(`${od}T00:00:00`).toISOString())
      .lte('datum', new Date(`${doDatum}T23:59:59`).toISOString())
      .order('datum', { ascending: false }).limit(1000);
    if (materialId) q = q.eq('material_id', materialId);
    if (tip) q = q.eq('tip', tip);
    const { data, error: e } = await q;
    if (e) setError('Kretanja nisu učitana: ' + e.message); else setError('');
    setRows((data || []).map((r) => ({ ...r, kolicina: Number(r.kolicina) })) as Kretanje[]);
  }, [od, doDatum, materialId, tip]);

  useEffect(() => { load(); }, [load]);

  const mat = (id: string) => materials.find((m) => m.id === id);

  function handleExport() {
    exportToExcel({
      title: `Kretanja materijala ${od} – ${doDatum}`,
      sheets: [{
        name: 'Kretanja',
        columns: [
          { key: 'datum', label: 'Datum' },
          { key: 'materijal', label: 'Materijal' },
          { key: 'tip', label: 'Vrsta' },
          { key: 'kolicina', label: 'Količina', format: 'number' },
          { key: 'jedinica', label: 'Jedinica' },
          { key: 'cijena', label: 'Nabavna cijena', format: 'currency' },
          { key: 'faktura', label: 'Faktura' },
          { key: 'dobavljac', label: 'Dobavljač' },
          { key: 'napomena', label: 'Napomena' },
        ],
        rows: (rows || []).map((r) => ({
          datum: format(parseISO(r.datum), 'dd.MM.yyyy. HH:mm'),
          materijal: mat(r.material_id)?.naziv || '',
          tip: TIP_KRETANJA[r.tip],
          kolicina: r.kolicina,
          jedinica: mat(r.material_id)?.jedinica_mjere || '',
          cijena: r.nabavna_cijena,
          faktura: r.faktura || '',
          dobavljac: r.dobavljac || '',
          napomena: r.napomena || '',
        })),
      }],
    });
  }

  const sel = 'px-3 py-2 border border-border rounded-lg text-sm bg-white';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="kr-od" className="block text-xs font-medium text-gray-500 mb-1">Od</label>
            <input id="kr-od" type="date" value={od} onChange={(e) => setOd(e.target.value)} className={sel} />
          </div>
          <div>
            <label htmlFor="kr-do" className="block text-xs font-medium text-gray-500 mb-1">Do</label>
            <input id="kr-do" type="date" value={doDatum} onChange={(e) => setDoDatum(e.target.value)} className={sel} />
          </div>
          <div>
            <label htmlFor="kr-mat" className="block text-xs font-medium text-gray-500 mb-1">Materijal</label>
            <select id="kr-mat" value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={`${sel} max-w-[16rem]`}>
              <option value="">Svi</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.naziv}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="kr-tip" className="block text-xs font-medium text-gray-500 mb-1">Vrsta</label>
            <select id="kr-tip" value={tip} onChange={(e) => setTip(e.target.value as TipKretanja | '')} className={sel}>
              <option value="">Sve</option>
              {Object.entries(TIP_KRETANJA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={!rows?.length}><Download size={14} /> Excel</Button>
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {!rows ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <History className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">Nema kretanja u izabranom periodu.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl bg-white">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Datum</th>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Materijal</th>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Vrsta</th>
                <th scope="col" className="text-right px-4 py-2 font-semibold">Količina</th>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Detalji</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 whitespace-nowrap tabular-nums text-gray-600">{format(parseISO(r.datum), 'dd.MM. HH:mm')}</td>
                  <td className="px-4 py-2 text-gray-900">{mat(r.material_id)?.naziv || '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{TIP_KRETANJA[r.tip]}</td>
                  <td className={`px-4 py-2 text-right tabular-nums font-medium ${r.kolicina < 0 ? 'text-danger' : 'text-success'}`}>
                    {r.kolicina > 0 ? '+' : ''}{kol(r.kolicina)} <span className="text-xs font-normal text-gray-400">{mat(r.material_id)?.jedinica_mjere}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {[r.faktura && `faktura ${r.faktura}`, r.dobavljac, r.nabavna_cijena != null && `${Number(r.nabavna_cijena).toFixed(2)} €/jed.`, r.napomena].filter(Boolean).join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
