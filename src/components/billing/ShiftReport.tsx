import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfDay } from 'date-fns';
import { Printer, Banknote } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { eur, METODA_LABELS } from '../../lib/payments';
import { printToPdf } from '../../lib/exportReport';

interface Uplata { iznos: number; metoda: string; naplatio_user_id: string | null; fiskalni_status: string | null }
interface ProdajaVaucera { iznos: number; nacin_placanja: string | null; izdao_user_id: string | null }
interface Korisnik { id: string; ime: string; prezime: string }

const GOTOVINA = new Set(['gotovina', 'gotovina_fiskalni']);
const lokalno = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

// Presjek smjene: koliko je naplaceno po nacinu placanja u periodu, i koliko gotovine treba da bude u kasi.
export default function ShiftReport() {
  const [od, setOd] = useState(lokalno(startOfDay(new Date())));
  const [doVr, setDoVr] = useState(lokalno(new Date()));
  const [naplatio, setNaplatio] = useState('');
  const [uplate, setUplate] = useState<Uplata[]>([]);
  const [vauceri, setVauceri] = useState<ProdajaVaucera[]>([]);
  const [users, setUsers] = useState<Korisnik[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const fromIso = new Date(od).toISOString();
    const toIso = new Date(doVr).toISOString();
    const [p, v, u] = await Promise.all([
      supabase.from('payments').select('iznos, metoda, naplatio_user_id, fiskalni_status').gte('datum', fromIso).lte('datum', toIso),
      supabase.from('vauceri').select('iznos, nacin_placanja, izdao_user_id').eq('tip', 'placeni').neq('status', 'storniran')
        .gte('created_at', fromIso).lte('created_at', toIso),
      supabase.from('users').select('id, ime, prezime').order('ime'),
    ]);
    if (p.error || v.error) setError('Presjek nije učitan: ' + (p.error || v.error)!.message);
    else setError('');
    setUplate((p.data || []).map((x) => ({ ...x, iznos: Number(x.iznos) })) as Uplata[]);
    setVauceri((v.data || []).map((x) => ({ ...x, iznos: Number(x.iznos) })) as ProdajaVaucera[]);
    setUsers((u.data || []) as Korisnik[]);
    setLoading(false);
  }, [od, doVr]);

  useEffect(() => { load(); }, [load]);

  const r = useMemo(() => {
    const up = uplate.filter((x) => !naplatio || x.naplatio_user_id === naplatio);
    const vp = vauceri.filter((x) => !naplatio || x.izdao_user_id === naplatio);
    const poMetodi = new Map<string, { broj: number; iznos: number }>();
    for (const x of up) {
      const m = x.metoda || 'gotovina';
      const cur = poMetodi.get(m) || { broj: 0, iznos: 0 };
      poMetodi.set(m, { broj: cur.broj + 1, iznos: cur.iznos + x.iznos });
    }
    const vaucerPoMetodi = new Map<string, { broj: number; iznos: number }>();
    for (const x of vp) {
      const m = x.nacin_placanja || 'gotovina';
      const cur = vaucerPoMetodi.get(m) || { broj: 0, iznos: 0 };
      vaucerPoMetodi.set(m, { broj: cur.broj + 1, iznos: cur.iznos + x.iznos });
    }
    const usluge = up.filter((x) => x.metoda !== 'bon').reduce((s, x) => s + x.iznos, 0);
    const vaucerIskoristeno = up.filter((x) => x.metoda === 'bon').reduce((s, x) => s + x.iznos, 0);
    const prodajaVaucera = vp.reduce((s, x) => s + x.iznos, 0);
    const gotovinaUKasi =
      up.filter((x) => GOTOVINA.has(x.metoda)).reduce((s, x) => s + x.iznos, 0) +
      vp.filter((x) => GOTOVINA.has(x.nacin_placanja || '')).reduce((s, x) => s + x.iznos, 0);
    const fiskalno = up.filter((x) => x.metoda.endsWith('_fiskalni') || x.fiskalni_status === 'success').reduce((s, x) => s + x.iznos, 0);
    const bezNaplatioca = up.filter((x) => !x.naplatio_user_id).length;
    return { poMetodi, vaucerPoMetodi, usluge, vaucerIskoristeno, prodajaVaucera, gotovinaUKasi, fiskalno, broj: up.length, bezNaplatioca };
  }, [uplate, vauceri, naplatio]);

  const imeKorisnika = users.find((u) => u.id === naplatio);
  const periodTxt = `${format(new Date(od), 'dd.MM.yyyy. HH:mm')} – ${format(new Date(doVr), 'dd.MM.yyyy. HH:mm')}`;

  function handlePrint() {
    printToPdf({
      title: 'Presjek smjene',
      subtitle: `${periodTxt}${imeKorisnika ? ` · naplatio: ${imeKorisnika.ime} ${imeKorisnika.prezime}` : ''}`,
      sheets: [
        {
          name: 'Naplata usluga po načinu plaćanja',
          columns: [
            { key: 'metoda', label: 'Način plaćanja' },
            { key: 'broj', label: 'Broj uplata', format: 'number' },
            { key: 'iznos', label: 'Iznos', format: 'currency' },
          ],
          rows: [...r.poMetodi].map(([m, v]) => ({ metoda: METODA_LABELS[m] || m, ...v })),
        },
        {
          name: 'Prodaja vaučera',
          columns: [
            { key: 'metoda', label: 'Način plaćanja' },
            { key: 'broj', label: 'Broj', format: 'number' },
            { key: 'iznos', label: 'Iznos', format: 'currency' },
          ],
          rows: [...r.vaucerPoMetodi].map(([m, v]) => ({ metoda: METODA_LABELS[m] || m, ...v })),
        },
        {
          name: 'Zbir',
          columns: [
            { key: 'stavka', label: 'Stavka' },
            { key: 'iznos', label: 'Iznos', format: 'currency' },
          ],
          rows: [
            { stavka: 'Naplaćene usluge (bez vaučera)', iznos: r.usluge },
            { stavka: 'Usluge plaćene vaučerom', iznos: r.vaucerIskoristeno },
            { stavka: 'Prodaja vaučera', iznos: r.prodajaVaucera },
            { stavka: 'Od toga fiskalizovano', iznos: r.fiskalno },
            { stavka: 'Gotovina koja treba da bude u kasi', iznos: r.gotovinaUKasi },
          ],
        },
      ],
    });
  }

  const inp = 'px-3 py-2 border border-border rounded-lg text-sm bg-white';

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="ps-od" className="block text-xs font-medium text-gray-500 mb-1">Od</label>
            <input id="ps-od" type="datetime-local" value={od} onChange={(e) => setOd(e.target.value)} className={inp} />
          </div>
          <div>
            <label htmlFor="ps-do" className="block text-xs font-medium text-gray-500 mb-1">Do</label>
            <input id="ps-do" type="datetime-local" value={doVr} onChange={(e) => setDoVr(e.target.value)} className={inp} />
          </div>
          <div>
            <label htmlFor="ps-ko" className="block text-xs font-medium text-gray-500 mb-1">Naplatio</label>
            <select id="ps-ko" value={naplatio} onChange={(e) => setNaplatio(e.target.value)} className={inp}>
              <option value="">Svi</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.ime} {u.prezime}</option>)}
            </select>
          </div>
          <Button variant="secondary" onClick={() => setDoVr(lokalno(new Date()))}>Do sada</Button>
        </div>
        <Button onClick={handlePrint} disabled={loading}><Printer size={14} /> Štampaj presjek</Button>
      </div>

      {error && <div role="alert" className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <Card padding={false} className="p-4 border-primary-200 bg-primary-50">
              <p className="text-xs text-primary-800 flex items-center gap-1.5"><Banknote size={14} /> Gotovina u kasi</p>
              <p className="text-3xl font-bold text-primary-800 tabular-nums mt-1">{eur(r.gotovinaUKasi)}</p>
              <p className="text-[11px] text-primary-700 mt-1">usluge i prodati vaučeri plaćeni gotovinom</p>
            </Card>
            <Card padding={false} className="p-4">
              <p className="text-xs text-gray-500">Naplaćeno za usluge</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums mt-1">{eur(r.usluge + r.vaucerIskoristeno)}</p>
              <p className="text-[11px] text-gray-400 mt-1">{r.broj} uplata · fiskalizovano {eur(r.fiskalno)}</p>
            </Card>
            <Card padding={false} className="p-4">
              <p className="text-xs text-gray-500">Prodati vaučeri</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums mt-1">{eur(r.prodajaVaucera)}</p>
              <p className="text-[11px] text-gray-400 mt-1">iskorišćeno vaučerom {eur(r.vaucerIskoristeno)}</p>
            </Card>
          </div>

          <Card padding={false}>
            <table className="w-full text-sm">
              <caption className="text-left px-4 pt-4 pb-2 font-semibold text-gray-900">Po načinu plaćanja</caption>
              <thead className="text-xs text-gray-500 border-y border-border bg-gray-50">
                <tr>
                  <th scope="col" className="text-left px-4 py-2 font-semibold">Način</th>
                  <th scope="col" className="text-right px-4 py-2 font-semibold">Uplata</th>
                  <th scope="col" className="text-right px-4 py-2 font-semibold">Iznos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.poMetodi.size === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Nema naplate u ovom periodu.</td></tr>
                )}
                {[...r.poMetodi].sort((a, b) => b[1].iznos - a[1].iznos).map(([m, v]) => (
                  <tr key={m}>
                    <td className="px-4 py-2">{METODA_LABELS[m] || m}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{v.broj}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{eur(v.iznos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {r.bezNaplatioca > 0 && naplatio === '' && (
            <p className="mt-3 text-xs text-gray-400">
              {r.bezNaplatioca} uplata nema upisano ko je naplatio (uplate prije ove verzije aplikacije).
            </p>
          )}
        </>
      )}
    </div>
  );
}
