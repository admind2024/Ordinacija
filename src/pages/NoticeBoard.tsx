import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import { Plus, Pin, PinOff, Pencil, Trash2, CheckCircle2, StickyNote, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Biljeska {
  id: string;
  naslov: string;
  tekst: string | null;
  boja: string;
  oznake: string[];
  dodijeljeno_user_id: string | null;
  autor_user_id: string | null;
  zakaceno: boolean;
  rijeseno: boolean;
  created_at: string;
}

interface Korisnik { id: string; ime: string; prezime: string }

// Boje papirica: svijetle nijanse iz palete aplikacije + topla akcent boja.
const BOJE = ['#FEF3C7', '#E6F5F5', '#FDF6F1', '#FCE7F3', '#E0E7FF', '#F3F4F6'];

const PRAZNA = { naslov: '', tekst: '', boja: BOJE[0], oznake: [] as string[], dodijeljeno: '', zakaceno: false };

export default function NoticeBoard() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Biljeska[]>([]);
  const [users, setUsers] = useState<Korisnik[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [samoMoje, setSamoMoje] = useState(false);
  const [prikaziRijesene, setPrikaziRijesene] = useState(false);
  const [oznakaFilter, setOznakaFilter] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(PRAZNA);
  const [oznakaInput, setOznakaInput] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const [n, u] = await Promise.all([
      supabase.from('oglasna_tabla').select('*').order('zakaceno', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('users').select('id, ime, prezime').eq('aktivan', true).order('ime'),
    ]);
    if (n.error) setError('Oglasna tabla nije učitana: ' + n.error.message);
    else { setNotes((n.data || []) as Biljeska[]); setError(''); }
    setUsers((u.data || []) as Korisnik[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const sveOznake = useMemo(() => [...new Set(notes.flatMap((n) => n.oznake))].sort(), [notes]);
  const imeKorisnika = (id: string | null) => {
    const u = users.find((x) => x.id === id);
    return u ? `${u.ime} ${u.prezime}` : '';
  };

  const shown = notes.filter((n) =>
    (prikaziRijesene || !n.rijeseno) &&
    (!samoMoje || n.dodijeljeno_user_id === user?.id) &&
    (!oznakaFilter || n.oznake.includes(oznakaFilter))
  );

  function openNew() {
    setEditId(null);
    setF(PRAZNA);
    setOznakaInput('');
    setOpen(true);
  }

  function openEdit(n: Biljeska) {
    setEditId(n.id);
    setF({ naslov: n.naslov, tekst: n.tekst || '', boja: n.boja, oznake: n.oznake, dodijeljeno: n.dodijeljeno_user_id || '', zakaceno: n.zakaceno });
    setOznakaInput('');
    setOpen(true);
  }

  function dodajOznaku() {
    const t = oznakaInput.trim().replace(/,$/, '');
    if (t && !f.oznake.includes(t)) setF({ ...f, oznake: [...f.oznake, t] });
    setOznakaInput('');
  }

  async function handleSave() {
    if (!f.naslov.trim()) return;
    setSaving(true);
    const row = {
      naslov: f.naslov.trim(),
      tekst: f.tekst.trim() || null,
      boja: f.boja,
      oznake: f.oznake,
      dodijeljeno_user_id: f.dodijeljeno || null,
      zakaceno: f.zakaceno,
      updated_at: new Date().toISOString(),
    };
    const res = editId
      ? await supabase.from('oglasna_tabla').update(row).eq('id', editId)
      : await supabase.from('oglasna_tabla').insert({ ...row, autor_user_id: user?.id || null });
    setSaving(false);
    if (res.error) { alert('Bilješka nije sačuvana: ' + res.error.message); return; }
    setOpen(false);
    refresh();
  }

  async function patch(n: Biljeska, p: Partial<Biljeska>) {
    setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, ...p } : x)));
    await supabase.from('oglasna_tabla').update({ ...p, updated_at: new Date().toISOString() }).eq('id', n.id);
  }

  async function handleDelete(n: Biljeska) {
    if (!confirm(`Obrisati bilješku „${n.naslov}"?`)) return;
    await supabase.from('oglasna_tabla').delete().eq('id', n.id);
    refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={samoMoje} onChange={(e) => setSamoMoje(e.target.checked)} className="w-4 h-4 accent-primary-600" />
            Dodijeljene meni
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prikaziRijesene} onChange={(e) => setPrikaziRijesene(e.target.checked)} className="w-4 h-4 accent-primary-600" />
            Prikaži riješene
          </label>
          {sveOznake.length > 0 && (
            <select aria-label="Filter po oznaci" value={oznakaFilter} onChange={(e) => setOznakaFilter(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg bg-white">
              <option value="">Sve oznake</option>
              {sveOznake.map((o) => <option key={o} value={o}>#{o}</option>)}
            </select>
          )}
        </div>
        <Button onClick={openNew}><Plus size={16} /> Nova bilješka</Button>
      </div>

      {error && <div role="alert" className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-36 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <StickyNote className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">Tabla je prazna. Ostavite poruku timu: ko ima kontrolu, šta treba naručiti, ko mijenja smjenu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((n) => (
            <article key={n.id} className={`rounded-xl border border-black/5 shadow-sm p-4 flex flex-col ${n.rijeseno ? 'opacity-60' : ''}`}
              style={{ backgroundColor: n.boja }}>
              <header className="flex items-start gap-2">
                <h2 className={`flex-1 font-semibold text-gray-900 break-words ${n.rijeseno ? 'line-through' : ''}`}>{n.naslov}</h2>
                <button onClick={() => patch(n, { zakaceno: !n.zakaceno })} className="p-1 text-gray-500 hover:text-gray-900 rounded"
                  aria-label={n.zakaceno ? 'Otkači' : 'Zakači na vrh'} title={n.zakaceno ? 'Otkači' : 'Zakači na vrh'}>
                  {n.zakaceno ? <Pin size={15} className="fill-current" /> : <PinOff size={15} />}
                </button>
              </header>
              {n.tekst && <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap break-words">{n.tekst}</p>}
              {n.oznake.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {n.oznake.map((o) => (
                    <button key={o} onClick={() => setOznakaFilter(o)} className="text-[11px] px-1.5 py-0.5 rounded bg-white/70 text-gray-600 hover:bg-white">#{o}</button>
                  ))}
                </div>
              )}
              <footer className="mt-auto pt-3 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                <span className="truncate">
                  {n.dodijeljeno_user_id ? <>za <strong className="text-gray-700">{imeKorisnika(n.dodijeljeno_user_id)}</strong> · </> : null}
                  {formatDistanceToNow(parseISO(n.created_at), { locale: sr, addSuffix: true })}
                  {n.autor_user_id && <> · {imeKorisnika(n.autor_user_id)}</>}
                </span>
                <span className="flex items-center shrink-0">
                  <button onClick={() => patch(n, { rijeseno: !n.rijeseno })} className="p-1 hover:text-success rounded"
                    aria-label={n.rijeseno ? 'Vrati kao neriješeno' : 'Označi kao riješeno'} title={n.rijeseno ? 'Vrati' : 'Riješeno'}>
                    <CheckCircle2 size={15} />
                  </button>
                  <button onClick={() => openEdit(n)} className="p-1 hover:text-gray-900 rounded" aria-label="Izmijeni"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(n)} className="p-1 hover:text-danger rounded" aria-label="Obriši"><Trash2 size={14} /></button>
                </span>
              </footer>
            </article>
          ))}
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editId ? 'Izmijeni bilješku' : 'Nova bilješka'} size="md">
        <div className="space-y-4">
          <div>
            <label htmlFor="ot-naslov" className="block text-sm font-medium text-gray-700 mb-1">Naslov *</label>
            <input id="ot-naslov" value={f.naslov} onChange={(e) => setF({ ...f, naslov: e.target.value })} maxLength={120}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label htmlFor="ot-tekst" className="block text-sm font-medium text-gray-700 mb-1">Poruka</label>
            <textarea id="ot-tekst" rows={4} value={f.tekst} onChange={(e) => setF({ ...f, tekst: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ot-za" className="block text-sm font-medium text-gray-700 mb-1">Za koga</label>
              <select id="ot-za" value={f.dodijeljeno} onChange={(e) => setF({ ...f, dodijeljeno: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">
                <option value="">Cijeli tim</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.ime} {u.prezime}</option>)}
              </select>
            </div>
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-1">Boja</legend>
              <div className="flex gap-2 pt-1">
                {BOJE.map((b) => (
                  <button key={b} type="button" onClick={() => setF({ ...f, boja: b })} aria-label={`Boja ${b}`} aria-pressed={f.boja === b}
                    className={`w-7 h-7 rounded-full border ${f.boja === b ? 'ring-2 ring-primary-600 ring-offset-1' : 'border-gray-300'}`}
                    style={{ backgroundColor: b }} />
                ))}
              </div>
            </fieldset>
          </div>
          <div>
            <label htmlFor="ot-oznaka" className="block text-sm font-medium text-gray-700 mb-1">Oznake</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {f.oznake.map((o) => (
                <span key={o} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gray-100">
                  #{o}
                  <button type="button" onClick={() => setF({ ...f, oznake: f.oznake.filter((x) => x !== o) })} aria-label={`Ukloni oznaku ${o}`}><X size={11} /></button>
                </span>
              ))}
            </div>
            <input id="ot-oznaka" value={oznakaInput} onChange={(e) => setOznakaInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); dodajOznaku(); } }}
              onBlur={dodajOznaku}
              list="ot-oznake" placeholder="npr. nabavka, kontrola — Enter za dodavanje"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            <datalist id="ot-oznake">{sveOznake.map((o) => <option key={o} value={o} />)}</datalist>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.zakaceno} onChange={(e) => setF({ ...f, zakaceno: e.target.checked })} className="w-4 h-4 accent-primary-600" />
            Zakači na vrh table
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Otkaži</Button>
            <Button onClick={handleSave} loading={saving} disabled={!f.naslov.trim()}>Sačuvaj</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
