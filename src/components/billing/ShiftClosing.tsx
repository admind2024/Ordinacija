import { useCallback, useEffect, useState } from 'react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Lock, Printer, AlertTriangle, CheckCircle2, Banknote } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { eur, METODA_LABELS } from '../../lib/payments';
import { printToPdf } from '../../lib/exportReport';
import {
  izracunajZbir, nenaplaceniTermini, pocetakSmjene, smjeneZaDan, zakljucenjeDana,
  type Smjena, type Zbir, type ZakljucenjeDana,
} from '../../lib/zakljucenja';

interface Korisnik { id: string; ime: string; prezime: string }

const labela = (k: string) =>
  k.startsWith('dug_') ? `Uplata duga · ${METODA_LABELS[k.slice(4)] || k.slice(4)}` : METODA_LABELS[k] || k;
const broj = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));

function stampaj(naslov: string, podnaslov: string, zbir: Record<string, number>, redovi: { stavka: string; iznos: number | null }[]) {
  printToPdf({
    title: naslov,
    subtitle: podnaslov,
    sheets: [
      {
        name: 'Po načinu plaćanja',
        columns: [{ key: 'metoda', label: 'Način' }, { key: 'iznos', label: 'Iznos', format: 'currency' }],
        rows: Object.entries(zbir).map(([k, v]) => ({ metoda: labela(k), iznos: v })),
      },
      {
        name: 'Kasa',
        columns: [{ key: 'stavka', label: 'Stavka' }, { key: 'iznos', label: 'Iznos', format: 'currency' }],
        rows: redovi,
      },
    ],
  });
}

function ZbirTabela({ zbir }: { zbir: Record<string, number> }) {
  const redovi = Object.entries(zbir).sort((a, b) => b[1] - a[1]);
  if (!redovi.length) return <p className="text-sm text-gray-400">Nema naplate.</p>;
  return (
    <ul className="divide-y divide-border text-sm">
      {redovi.map(([k, v]) => (
        <li key={k} className="flex justify-between py-1.5"><span className="text-gray-600">{labela(k)}</span><span className="tabular-nums font-medium">{eur(v)}</span></li>
      ))}
    </ul>
  );
}

// Zakljucenje smjene (svako svoju naplatu) i zakljucenje radnog dana (admin/menadzer).
export default function ShiftClosing() {
  const { user, hasRole } = useAuth();
  const mozeDan = hasRole(['admin', 'menadzer']);
  const [users, setUsers] = useState<Korisnik[]>([]);

  // Moja smjena
  const [od, setOd] = useState<Date | null>(null);
  const [moj, setMoj] = useState<Zbir | null>(null);
  const [prebrojano, setPrebrojano] = useState('');
  const [napomena, setNapomena] = useState('');
  const [savingSmjena, setSavingSmjena] = useState(false);

  // Dan
  const [datum, setDatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [smjene, setSmjene] = useState<Smjena[]>([]);
  const [dan, setDan] = useState<Zbir | null>(null);
  const [zatvorenDan, setZatvorenDan] = useState<ZakljucenjeDana | null>(null);
  const [nenaplaceni, setNenaplaceni] = useState<{ id: string; pocetak: string; pacijent: string }[]>([]);
  const [danPrebrojano, setDanPrebrojano] = useState('');
  const [danNapomena, setDanNapomena] = useState('');
  const [savingDan, setSavingDan] = useState(false);
  const [error, setError] = useState('');

  const ime = (id: string | null) => {
    const u = users.find((x) => x.id === id);
    return u ? `${u.ime} ${u.prezime}` : 'Nepoznato';
  };

  const loadSmjena = useCallback(async () => {
    if (!user) return;
    try {
      const start = await pocetakSmjene(user.id);
      setOd(start);
      setMoj(await izracunajZbir(start, new Date(), user.id));
    } catch (e) {
      setError('Smjena nije učitana: ' + (e instanceof Error ? e.message : ''));
    }
  }, [user]);

  const loadDan = useCallback(async () => {
    const d = parseISO(datum);
    try {
      const [s, z, zd, nn] = await Promise.all([
        smjeneZaDan(d), izracunajZbir(startOfDay(d), endOfDay(d)), zakljucenjeDana(d), nenaplaceniTermini(d),
      ]);
      setSmjene(s); setDan(z); setZatvorenDan(zd); setNenaplaceni(nn);
      setDanPrebrojano(String(s.reduce((sum, x) => sum + Number(x.gotovina_prebrojana || 0), 0) || ''));
    } catch (e) {
      setError('Dan nije učitan: ' + (e instanceof Error ? e.message : ''));
    }
  }, [datum]);

  useEffect(() => {
    supabase.from('users').select('id, ime, prezime').then(({ data }) => setUsers((data || []) as Korisnik[]));
  }, []);
  useEffect(() => { loadSmjena(); }, [loadSmjena]);
  useEffect(() => { loadDan(); }, [loadDan]);

  async function zakljuciSmjenu() {
    if (!user || !od || !moj) return;
    const pre = broj(prebrojano);
    if (moj.gotovinaOcekivana > 0 && pre === null && !confirm('Niste upisali prebrojanu gotovinu. Zaključiti bez prebrojavanja?')) return;
    const doVr = new Date();
    setSavingSmjena(true);
    const razlika = pre === null ? null : pre - moj.gotovinaOcekivana;
    const { error: e } = await supabase.from('zakljucenja_smjene').insert({
      user_id: user.id, vrijeme_od: od.toISOString(), vrijeme_do: doVr.toISOString(),
      zbir: moj.poMetodi, ukupno: moj.ukupno, broj_uplata: moj.brojUplata, prodaja_vaucera: moj.prodajaVaucera,
      gotovina_ocekivana: moj.gotovinaOcekivana, gotovina_prebrojana: pre, razlika, napomena: napomena.trim() || null,
    });
    setSavingSmjena(false);
    if (e) { alert('Smjena nije zaključena: ' + e.message); return; }
    stampaj('Zaključenje smjene', `${user.ime} ${user.prezime} · ${format(od, 'dd.MM.yyyy. HH:mm')} – ${format(doVr, 'HH:mm')}`, moj.poMetodi, [
      { stavka: 'Ukupno naplaćeno', iznos: moj.ukupno },
      { stavka: 'Prodati vaučeri', iznos: moj.prodajaVaucera },
      { stavka: 'Gotovina po sistemu', iznos: moj.gotovinaOcekivana },
      { stavka: 'Prebrojana gotovina', iznos: pre },
      { stavka: 'Razlika', iznos: razlika },
    ]);
    setPrebrojano(''); setNapomena('');
    await Promise.all([loadSmjena(), loadDan()]);
  }

  async function zakljuciDan() {
    if (!dan || !user) return;
    const pre = broj(danPrebrojano);
    const upozorenja = [
      nenaplaceni.length ? `${nenaplaceni.length} završenih termina nema uplatu` : '',
      pre === null ? 'gotovina nije prebrojana' : '',
    ].filter(Boolean);
    if (!confirm(`Zaključiti ${format(parseISO(datum), 'dd.MM.yyyy.')}?${upozorenja.length ? `\n\nPažnja: ${upozorenja.join(', ')}.` : ''}`)) return;
    setSavingDan(true);
    const razlika = pre === null ? null : pre - dan.gotovinaOcekivana;
    const { data, error: e } = await supabase.from('zakljucenja_dana').insert({
      datum, zbir: dan.poMetodi, ukupno: dan.ukupno, broj_uplata: dan.brojUplata, prodaja_vaucera: dan.prodajaVaucera,
      gotovina_ocekivana: dan.gotovinaOcekivana, gotovina_prebrojana: pre, razlika,
      nenaplaceni_termini: nenaplaceni.length, napomena: danNapomena.trim() || null, user_id: user.id,
    }).select().single();
    if (e || !data) { setSavingDan(false); alert('Dan nije zaključen: ' + (e?.code === '23505' ? 'ovaj dan je već zaključen.' : e?.message)); return; }
    if (smjene.length) await supabase.from('zakljucenja_smjene').update({ zakljucenje_dana_id: data.id }).in('id', smjene.map((s) => s.id));
    setSavingDan(false);
    stampajDan(data as ZakljucenjeDana);
    loadDan();
  }

  function stampajDan(z: ZakljucenjeDana) {
    stampaj('Zaključenje radnog dana', `${format(parseISO(z.datum), 'dd.MM.yyyy.')} · zaključio ${ime(z.user_id)}`, z.zbir, [
      { stavka: 'Ukupno naplaćeno (usluge i dugovi)', iznos: Number(z.ukupno) },
      { stavka: 'Prodati vaučeri', iznos: Number(z.prodaja_vaucera) },
      { stavka: 'Gotovina po sistemu', iznos: Number(z.gotovina_ocekivana) },
      { stavka: 'Prebrojana gotovina', iznos: z.gotovina_prebrojana == null ? null : Number(z.gotovina_prebrojana) },
      { stavka: 'Razlika', iznos: z.razlika == null ? null : Number(z.razlika) },
      { stavka: `Zatvorenih smjena: ${smjene.length} · završenih termina bez uplate: ${z.nenaplaceni_termini}`, iznos: null },
    ]);
  }

  const inp = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
  const pre = broj(prebrojano);
  const razlikaSmjena = pre === null || !moj ? null : pre - moj.gotovinaOcekivana;

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {/* Moja smjena */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Moja smjena</h2>
            <p className="text-sm text-gray-500">
              {user?.ime} {user?.prezime}{od && <> · od {format(od, 'HH:mm')} do sada</>}
            </p>
          </div>
          {moj && <p className="text-2xl font-bold text-gray-900 tabular-nums">{eur(moj.ukupno)}</p>}
        </div>
        {!moj ? (
          <div className="h-24 rounded-lg bg-gray-100 animate-pulse" aria-busy="true" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ZbirTabela zbir={moj.poMetodi} />
              {moj.prodajaVaucera > 0 && <p className="mt-2 text-sm text-gray-600">Prodati vaučeri: <strong className="tabular-nums">{eur(moj.prodajaVaucera)}</strong></p>}
            </div>
            <div className="space-y-3">
              <div className="rounded-lg bg-primary-50 border border-primary-200 px-4 py-3">
                <p className="text-xs text-primary-800 flex items-center gap-1.5"><Banknote size={14} /> Gotovina po sistemu</p>
                <p className="text-xl font-bold text-primary-800 tabular-nums">{eur(moj.gotovinaOcekivana)}</p>
              </div>
              <div>
                <label htmlFor="sm-pre" className="block text-sm font-medium text-gray-700 mb-1">Prebrojana gotovina (€)</label>
                <input id="sm-pre" inputMode="decimal" value={prebrojano} onChange={(e) => setPrebrojano(e.target.value)} className={inp} />
                {razlikaSmjena !== null && (
                  <p className={`mt-1 text-sm font-medium ${Math.abs(razlikaSmjena) < 0.01 ? 'text-success' : 'text-danger'}`}>
                    {Math.abs(razlikaSmjena) < 0.01 ? 'Kasa se slaže.' : `Razlika ${razlikaSmjena > 0 ? 'višak' : 'manjak'} ${eur(Math.abs(razlikaSmjena))}`}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="sm-nap" className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
                <input id="sm-nap" value={napomena} onChange={(e) => setNapomena(e.target.value)} placeholder="npr. predato menadžeru" className={inp} />
              </div>
              <Button onClick={zakljuciSmjenu} loading={savingSmjena} className="w-full"><Lock size={14} /> Zaključi smjenu i štampaj</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dan */}
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Radni dan</h2>
            <p className="text-sm text-gray-500">Zatvorene smjene i zaključenje dana</p>
          </div>
          <div>
            <label htmlFor="dan-datum" className="block text-xs font-medium text-gray-500 mb-1">Datum</label>
            <input id="dan-datum" type="date" value={datum} max={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setDatum(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
        </div>

        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Smjene</h3>
        {smjene.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">Nijedna smjena nije zaključena ovog dana.</p>
        ) : (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th scope="col" className="text-left py-1.5 font-semibold">Osoba</th>
                  <th scope="col" className="text-left py-1.5 font-semibold">Period</th>
                  <th scope="col" className="text-right py-1.5 font-semibold">Naplaćeno</th>
                  <th scope="col" className="text-right py-1.5 font-semibold">Gotovina</th>
                  <th scope="col" className="text-right py-1.5 font-semibold">Razlika</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {smjene.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2">{ime(s.user_id)}{s.napomena && <span className="block text-xs text-gray-400">{s.napomena}</span>}</td>
                    <td className="py-2 tabular-nums text-gray-600">{format(parseISO(s.vrijeme_od), 'HH:mm')}–{format(parseISO(s.vrijeme_do), 'HH:mm')}</td>
                    <td className="py-2 text-right tabular-nums">{eur(Number(s.ukupno))}</td>
                    <td className="py-2 text-right tabular-nums">{eur(Number(s.gotovina_ocekivana))}</td>
                    <td className={`py-2 text-right tabular-nums ${s.razlika == null ? 'text-gray-400' : Math.abs(Number(s.razlika)) < 0.01 ? 'text-success' : 'text-danger'}`}>
                      {s.razlika == null ? 'nije brojano' : eur(Number(s.razlika))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {zatvorenDan ? (
          <div className="rounded-lg border border-success/30 bg-green-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 size={16} /> Dan je zaključen {format(parseISO(zatvorenDan.created_at), 'dd.MM. HH:mm')} · {ime(zatvorenDan.user_id)} · {eur(Number(zatvorenDan.ukupno))}
              {zatvorenDan.razlika != null && Math.abs(Number(zatvorenDan.razlika)) >= 0.01 && <> · razlika {eur(Number(zatvorenDan.razlika))}</>}
            </p>
            <Button size="sm" variant="secondary" onClick={() => stampajDan(zatvorenDan)}><Printer size={14} /> Štampaj</Button>
          </div>
        ) : dan && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ukupno za dan</h3>
              <ZbirTabela zbir={dan.poMetodi} />
              <p className="mt-2 text-sm text-gray-600">Ukupno: <strong className="tabular-nums">{eur(dan.ukupno)}</strong> · fiskalizovano {eur(dan.fiskalno)}</p>
              {nenaplaceni.length > 0 && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                  <p className="flex items-center gap-1.5 font-medium"><AlertTriangle size={14} /> {nenaplaceni.length} završenih termina bez uplate</p>
                  <ul className="mt-1 text-xs space-y-0.5">
                    {nenaplaceni.slice(0, 8).map((n) => <li key={n.id}>{format(parseISO(n.pocetak), 'HH:mm')} · {n.pacijent}</li>)}
                  </ul>
                </div>
              )}
            </div>
            {mozeDan ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-primary-50 border border-primary-200 px-4 py-3">
                  <p className="text-xs text-primary-800">Gotovina po sistemu (cijeli dan)</p>
                  <p className="text-xl font-bold text-primary-800 tabular-nums">{eur(dan.gotovinaOcekivana)}</p>
                </div>
                <div>
                  <label htmlFor="dan-pre" className="block text-sm font-medium text-gray-700 mb-1">Ukupno prebrojana gotovina (€)</label>
                  <input id="dan-pre" inputMode="decimal" value={danPrebrojano} onChange={(e) => setDanPrebrojano(e.target.value)} className={inp} />
                  <p className="mt-1 text-xs text-gray-400">Predloženo kao zbir prebrojanog iz zatvorenih smjena.</p>
                </div>
                <div>
                  <label htmlFor="dan-nap" className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
                  <input id="dan-nap" value={danNapomena} onChange={(e) => setDanNapomena(e.target.value)} className={inp} />
                </div>
                <Button onClick={zakljuciDan} loading={savingDan} className="w-full"><Lock size={14} /> Zaključi radni dan</Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Radni dan zaključuje menadžer ili administrator.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
