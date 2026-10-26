import { useCallback, useEffect, useMemo, useState } from 'react';
import { addMonths, format, parseISO } from 'date-fns';
import { Plus, Search, Ticket, Printer, Ban, Download } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePatients } from '../contexts/PatientsContext';
import { eur, METODA_LABELS } from '../lib/payments';
import { exportToExcel } from '../lib/exportReport';
import type { Vaucer } from '../types';

interface Promjena {
  id: string;
  tip: 'izdavanje' | 'iskoristenje' | 'storno';
  iznos: number;
  napomena: string | null;
  created_at: string;
}

type StatusFilter = '' | 'aktivan' | 'iskoristen' | 'istekao' | 'storniran';

const danas = () => format(new Date(), 'yyyy-MM-dd');
const istekao = (v: Vaucer) => v.status === 'aktivan' && !!v.vazi_do && v.vazi_do < danas();

const STATUS_STIL: Record<string, [string, string]> = {
  aktivan: ['Aktivan', 'bg-primary-50 text-primary-700'],
  iskoristen: ['Iskorišćen', 'bg-gray-100 text-gray-600'],
  istekao: ['Istekao', 'bg-amber-50 text-amber-700'],
  storniran: ['Storniran', 'bg-red-50 text-red-700'],
};

const PRAZAN = {
  tip: 'placeni' as Vaucer['tip'],
  iznos: '',
  patientId: '',
  primalac: '',
  nacin: 'gotovina',
  bezRoka: false,
  vaziDo: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
  broj: '',
  napomena: '',
};

function stampaj(v: Vaucer, ustanova: { naziv?: string; adresa?: string; telefon?: string }) {
  const w = window.open('', '_blank', 'width=720,height=520');
  if (!w) return;
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(v.broj)}</title>
<style>
  @page { size: A5 landscape; margin: 0; }
  body { margin: 0; font-family: Inter, system-ui, sans-serif; color: #0C3939; }
  .v { box-sizing: border-box; width: 210mm; height: 148mm; padding: 16mm; display: flex; flex-direction: column;
       background: linear-gradient(135deg, #E6F5F5 0%, #FDF6F1 100%); border: 3mm solid #238A8A; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 13px; letter-spacing: .2em; text-transform: uppercase; color: #1B6F6F; }
  .broj { font-family: ui-monospace, monospace; font-size: 13px; color: #6E4D37; }
  h1 { font-size: 40px; margin: 14mm 0 2mm; font-weight: 700; letter-spacing: -.01em; }
  .za { font-size: 16px; color: #145454; min-height: 22px; }
  .iznos { margin-top: auto; font-size: 54px; font-weight: 800; color: #238A8A; }
  .foot { display: flex; justify-content: space-between; font-size: 11px; color: #456; margin-top: 6mm; }
</style></head><body><div class="v">
  <div class="top"><div class="brand">${esc(ustanova.naziv || 'MOA')}</div><div class="broj">${esc(v.broj)}</div></div>
  <h1>Poklon vaučer</h1>
  <div class="za">${v.primalac ? 'Za: ' + esc(v.primalac) : ''}</div>
  <div class="iznos">${esc(eur(v.iznos))}</div>
  <div class="foot">
    <span>${v.vazi_do ? 'Važi do ' + format(parseISO(v.vazi_do), 'dd.MM.yyyy.') : 'Bez roka važenja'} · može se koristiti u više navrata</span>
    <span>${esc([ustanova.adresa, ustanova.telefon].filter(Boolean).join(' · '))}</span>
  </div>
</div><script>window.onload = () => { window.print(); }</script></body></html>`);
  w.document.close();
}

export default function Vouchers() {
  const { user } = useAuth();
  const { patients } = usePatients();
  const [list, setList] = useState<Vaucer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('aktivan');
  const [q, setQ] = useState('');
  const [ustanova, setUstanova] = useState<{ naziv?: string; adresa?: string; telefon?: string }>({});

  const [open, setOpen] = useState(false);
  const [f, setF] = useState(PRAZAN);
  const [patientQuery, setPatientQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [detail, setDetail] = useState<Vaucer | null>(null);
  const [promjene, setPromjene] = useState<Promjena[]>([]);

  const refresh = useCallback(async () => {
    const { data, error: e } = await supabase.from('vauceri').select('*').order('created_at', { ascending: false });
    if (e) setError('Vaučeri nisu učitani: ' + e.message);
    else {
      setList((data || []).map((v) => ({ ...v, iznos: Number(v.iznos), preostalo: Number(v.preostalo) })) as Vaucer[]);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    supabase.from('establishments').select('naziv, adresa, telefon').limit(1).maybeSingle()
      .then(({ data }) => { if (data) setUstanova(data); });
  }, [refresh]);

  const ime = (id?: string | null) => {
    const p = id ? patients.find((x) => x.id === id) : null;
    return p ? `${p.ime} ${p.prezime}` : '';
  };
  const statusOf = (v: Vaucer) => (istekao(v) ? 'istekao' : v.status);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return list.filter((v) =>
      (!statusFilter || statusOf(v) === statusFilter) &&
      (!t || v.broj.toLowerCase().includes(t) || ime(v.patient_id).toLowerCase().includes(t) || (v.primalac || '').toLowerCase().includes(t))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, statusFilter, q, patients]);

  const aktivni = list.filter((v) => statusOf(v) === 'aktivan');
  const obaveza = aktivni.reduce((s, v) => s + v.preostalo, 0);

  const patientMatches = useMemo(() => {
    const t = patientQuery.trim().toLowerCase();
    if (t.length < 2) return [];
    return patients.filter((p) => `${p.ime} ${p.prezime}`.toLowerCase().includes(t) || p.telefon?.includes(t)).slice(0, 6);
  }, [patientQuery, patients]);

  async function handleCreate() {
    const iznos = Number(f.iznos.replace(',', '.'));
    if (!iznos || iznos <= 0) { setFormError('Unesite iznos veći od nule.'); return; }
    setSaving(true);
    setFormError('');
    const row: Record<string, unknown> = {
      tip: f.tip,
      iznos,
      preostalo: iznos,
      patient_id: f.patientId || null,
      primalac: f.primalac.trim() || null,
      nacin_placanja: f.tip === 'placeni' ? f.nacin : null,
      vazi_do: f.bezRoka ? null : f.vaziDo,
      napomena: f.napomena.trim() || null,
      izdao_user_id: user?.id || null,
    };
    if (f.broj.trim()) row.broj = f.broj.trim().toUpperCase();
    const { data, error: e } = await supabase.from('vauceri').insert(row).select().single();
    if (e) {
      setSaving(false);
      setFormError(e.code === '23505' ? 'Vaučer sa tim brojem već postoji.' : 'Nije sačuvano: ' + e.message);
      return;
    }
    await supabase.from('vaucer_promjene').insert({ vaucer_id: data.id, tip: 'izdavanje', iznos, user_id: user?.id || null });
    setSaving(false);
    setOpen(false);
    await refresh();
    const v = { ...data, iznos: Number(data.iznos), preostalo: Number(data.preostalo) } as Vaucer;
    if (confirm(`Izdat vaučer ${v.broj}. Odštampati ga sada?`)) stampaj(v, ustanova);
  }

  async function openDetail(v: Vaucer) {
    setDetail(v);
    setPromjene([]);
    const { data } = await supabase.from('vaucer_promjene').select('*').eq('vaucer_id', v.id).order('created_at');
    setPromjene((data || []).map((p) => ({ ...p, iznos: Number(p.iznos) })) as Promjena[]);
  }

  async function handleStorno(v: Vaucer) {
    const razlog = prompt(`Storno vaučera ${v.broj}. Razlog:`);
    if (razlog === null) return;
    await supabase.from('vauceri').update({ status: 'storniran' }).eq('id', v.id);
    await supabase.from('vaucer_promjene').insert({ vaucer_id: v.id, tip: 'storno', iznos: v.preostalo, user_id: user?.id || null, napomena: razlog || null });
    setDetail(null);
    refresh();
  }

  function handleExport() {
    exportToExcel({
      title: `Vauceri ${danas()}`,
      sheets: [{
        name: 'Vaučeri',
        columns: [
          { key: 'broj', label: 'Broj' },
          { key: 'tip', label: 'Tip' },
          { key: 'kupac', label: 'Kupac' },
          { key: 'primalac', label: 'Za koga' },
          { key: 'iznos', label: 'Iznos', format: 'currency' },
          { key: 'preostalo', label: 'Preostalo', format: 'currency' },
          { key: 'status', label: 'Status' },
          { key: 'izdat', label: 'Izdat' },
          { key: 'vazi_do', label: 'Važi do' },
        ],
        rows: shown.map((v) => ({
          ...v,
          tip: v.tip === 'placeni' ? 'Plaćeni' : 'Poklon',
          kupac: ime(v.patient_id),
          status: STATUS_STIL[statusOf(v)][0],
          izdat: format(parseISO(v.created_at), 'dd.MM.yyyy.'),
          vazi_do: v.vazi_do ? format(parseISO(v.vazi_do), 'dd.MM.yyyy.') : 'bez roka',
        })),
      }],
    });
  }

  const inp = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <Card padding={false} className="p-4">
          <p className="text-xs text-gray-500">Aktivnih vaučera</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{aktivni.length}</p>
        </Card>
        <Card padding={false} className="p-4">
          <p className="text-xs text-gray-500">Neiskorišćeno (obaveza prema klijentima)</p>
          <p className="text-2xl font-bold text-primary-700 tabular-nums">{eur(obaveza)}</p>
        </Card>
        <Card padding={false} className="p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-gray-500">Ističu u narednih 30 dana</p>
          <p className="text-2xl font-bold text-warning tabular-nums">
            {aktivni.filter((v) => v.vazi_do && v.vazi_do <= format(addMonths(new Date(), 1), 'yyyy-MM-dd')).length}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="v-status" className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select id="v-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-white">
              <option value="">Svi</option>
              {Object.entries(STATUS_STIL).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="v-q" className="block text-xs font-medium text-gray-500 mb-1">Pretraga</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="v-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Broj, kupac, za koga"
                className="pl-8 pr-3 py-2 border border-border rounded-lg text-sm w-64 max-w-full" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport} disabled={!shown.length}><Download size={14} /> Excel</Button>
          <Button onClick={() => { setF(PRAZAN); setPatientQuery(''); setFormError(''); setOpen(true); }}>
            <Plus size={16} /> Novi vaučer
          </Button>
        </div>
      </div>

      {error && <div role="alert" className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Ticket className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">{list.length ? 'Nema vaučera za izabrani filter.' : 'Još nije izdat nijedan vaučer.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl bg-white">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Broj</th>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Kupac / za koga</th>
                <th scope="col" className="text-right px-4 py-2 font-semibold">Iznos</th>
                <th scope="col" className="text-right px-4 py-2 font-semibold">Preostalo</th>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Status</th>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Važi do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((v) => {
                const [lbl, cls] = STATUS_STIL[statusOf(v)];
                return (
                  <tr key={v.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(v)}>
                    <td className="px-4 py-2">
                      <button className="font-mono text-primary-700 hover:underline" onClick={(e) => { e.stopPropagation(); openDetail(v); }}>{v.broj}</button>
                      <span className="block text-[11px] text-gray-400">{v.tip === 'placeni' ? 'Plaćeni' : 'Poklon'}</span>
                    </td>
                    <td className="px-4 py-2 max-w-[16rem]">
                      <p className="truncate text-gray-800">{ime(v.patient_id) || '—'}</p>
                      {v.primalac && <p className="truncate text-xs text-gray-400">za: {v.primalac}</p>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{eur(v.iznos)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold">{eur(v.preostalo)}</td>
                    <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{lbl}</span></td>
                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{v.vazi_do ? format(parseISO(v.vazi_do), 'dd.MM.yyyy.') : 'bez roka'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Novi vaučer" size="md">
        <div className="space-y-4">
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="sr-only">Tip vaučera</legend>
            {([['placeni', 'Plaćeni', 'kupac plaća sada'], ['poklon', 'Poklon', 'besplatan, od klinike']] as const).map(([id, l, d]) => (
              <button key={id} type="button" aria-pressed={f.tip === id} onClick={() => setF({ ...f, tip: id })}
                className={`text-left px-4 py-3 rounded-xl border-2 ${f.tip === id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className="block text-sm font-semibold text-gray-900">{l}</span>
                <span className="block text-xs text-gray-500">{d}</span>
              </button>
            ))}
          </fieldset>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="nv-iznos" className="block text-sm font-medium text-gray-700 mb-1">Iznos (EUR) *</label>
              <input id="nv-iznos" inputMode="decimal" value={f.iznos} onChange={(e) => setF({ ...f, iznos: e.target.value })} className={inp} />
            </div>
            {f.tip === 'placeni' && (
              <div>
                <label htmlFor="nv-nacin" className="block text-sm font-medium text-gray-700 mb-1">Plaćeno</label>
                <select id="nv-nacin" value={f.nacin} onChange={(e) => setF({ ...f, nacin: e.target.value })} className={`${inp} bg-white`}>
                  {['gotovina', 'gotovina_fiskalni', 'kartica', 'kartica_fiskalni', 'transfer'].map((m) => <option key={m} value={m}>{METODA_LABELS[m]}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="relative">
            <label htmlFor="nv-kupac" className="block text-sm font-medium text-gray-700 mb-1">Kupac (opciono)</label>
            {f.patientId ? (
              <div className="flex items-center justify-between px-3 py-2 border border-primary-200 bg-primary-50 rounded-lg text-sm">
                <span>{ime(f.patientId)}</span>
                <button type="button" onClick={() => setF({ ...f, patientId: '' })} className="text-xs text-gray-500 hover:underline">promijeni</button>
              </div>
            ) : (
              <>
                <input id="nv-kupac" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} placeholder="Pretraga pacijenta" className={inp} />
                {patientMatches.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {patientMatches.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => { setF({ ...f, patientId: p.id }); setPatientQuery(''); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{p.ime} {p.prezime} <span className="text-gray-400">{p.telefon}</span></button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
          <div>
            <label htmlFor="nv-za" className="block text-sm font-medium text-gray-700 mb-1">Za koga (ime na vaučeru)</label>
            <input id="nv-za" value={f.primalac} onChange={(e) => setF({ ...f, primalac: e.target.value })} placeholder="npr. Ana — rođendan" className={inp} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label htmlFor="nv-rok" className="block text-sm font-medium text-gray-700 mb-1">Važi do</label>
              <input id="nv-rok" type="date" value={f.vaziDo} disabled={f.bezRoka} min={danas()}
                onChange={(e) => setF({ ...f, vaziDo: e.target.value })} className={`${inp} disabled:bg-gray-50 disabled:text-gray-400`} />
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" checked={f.bezRoka} onChange={(e) => setF({ ...f, bezRoka: e.target.checked })} className="w-4 h-4 accent-primary-600" />
              Bez roka važenja
            </label>
          </div>
          <div>
            <label htmlFor="nv-broj" className="block text-sm font-medium text-gray-700 mb-1">Broj vaučera</label>
            <input id="nv-broj" value={f.broj} onChange={(e) => setF({ ...f, broj: e.target.value })} placeholder="prazno = automatski (V-2026-00001)" className={`${inp} font-mono`} />
          </div>
          <div>
            <label htmlFor="nv-nap" className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
            <textarea id="nv-nap" rows={2} maxLength={500} value={f.napomena} onChange={(e) => setF({ ...f, napomena: e.target.value })} className={inp} />
          </div>
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Otkaži</Button>
            <Button onClick={handleCreate} loading={saving}>Izdaj vaučer</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? `Vaučer ${detail.broj}` : ''} size="md">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Iznos</p><p className="font-semibold tabular-nums">{eur(detail.iznos)}</p></div>
              <div><p className="text-xs text-gray-500">Preostalo</p><p className="font-semibold tabular-nums text-primary-700">{eur(detail.preostalo)}</p></div>
              <div><p className="text-xs text-gray-500">Kupac</p><p>{ime(detail.patient_id) || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Za koga</p><p>{detail.primalac || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Tip</p><p>{detail.tip === 'placeni' ? `Plaćeni · ${METODA_LABELS[detail.nacin_placanja || ''] || ''}` : 'Poklon'}</p></div>
              <div><p className="text-xs text-gray-500">Važi do</p><p>{detail.vazi_do ? format(parseISO(detail.vazi_do), 'dd.MM.yyyy.') : 'bez roka'}</p></div>
            </div>
            {detail.napomena && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{detail.napomena}</p>}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Istorija</h3>
              <ul className="divide-y divide-border border border-border rounded-lg text-sm">
                {promjene.length === 0 && <li className="px-3 py-2 text-gray-400">Učitavanje…</li>}
                {promjene.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 px-3 py-2">
                    <span>
                      {p.tip === 'izdavanje' ? 'Izdat' : p.tip === 'iskoristenje' ? 'Iskorišćeno' : 'Storniran'}
                      <span className="text-gray-400"> · {format(parseISO(p.created_at), 'dd.MM.yyyy. HH:mm')}</span>
                      {p.napomena && <span className="block text-xs text-gray-400">{p.napomena}</span>}
                    </span>
                    <span className={`tabular-nums ${p.tip === 'iskoristenje' ? 'text-danger' : ''}`}>
                      {p.tip === 'iskoristenje' ? '−' : ''}{eur(p.iznos)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap justify-between gap-2 pt-2">
              {detail.status === 'aktivan' ? (
                <Button variant="ghost" onClick={() => handleStorno(detail)} className="!text-danger"><Ban size={14} /> Storniraj</Button>
              ) : <span />}
              <Button variant="secondary" onClick={() => stampaj(detail, ustanova)}><Printer size={14} /> Štampaj vaučer</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
