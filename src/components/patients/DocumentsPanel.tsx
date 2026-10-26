import { useCallback, useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Upload, FileText, Image as ImageIcon, Trash2, ExternalLink, FolderOpen } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DOKUMENT_TIPOVI, linkDokumenta, obrisiDokument, uploadDokument, type Dokument } from '../../lib/karton';

const MAX = 20 * 1024 * 1024;
const velicina = (b: number | null) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

// Dokumentacija pacijenta: nalazi, saglasnosti i fotografije prije/poslije (privatni bucket, potpisani linkovi).
export default function DocumentsPanel({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Dokument[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tipFilter, setTipFilter] = useState<'' | Dokument['tip']>('');

  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [naziv, setNaziv] = useState('');
  const [tip, setTip] = useState<Dokument['tip']>('opsti');
  const [opis, setOpis] = useState('');
  const [datum, setDatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const { data, error: e } = await supabase.from('pacijent_dokumenti').select('*').eq('patient_id', patientId).order('datum', { ascending: false });
    if (e) { setError('Dokumenta nisu učitana: ' + e.message); setLoading(false); return; }
    const list = (data || []) as Dokument[];
    setDocs(list);
    setError('');
    setLoading(false);
    // Sličice za fotografije (kratkotrajni potpisani linkovi)
    const imgs = list.filter((d) => d.mime?.startsWith('image/'));
    const entries = await Promise.all(imgs.map(async (d) => [d.id, await linkDokumenta(d.putanja, 3600)] as const));
    setThumbs(Object.fromEntries(entries.filter(([, u]) => !!u)) as Record<string, string>);
  }, [patientId]);

  useEffect(() => { refresh(); }, [refresh]);

  function izaberi(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list);
    const preveliki = arr.find((f) => f.size > MAX);
    if (preveliki) { setFormError(`${preveliki.name} je veći od 20 MB.`); return; }
    setFormError('');
    setFiles(arr);
    if (!naziv && arr[0]) setNaziv(arr[0].name.replace(/\.[^.]+$/, ''));
    if (arr.every((f) => f.type.startsWith('image/')) && tip === 'opsti') setTip('foto_prije');
  }

  function openUpload() {
    setFiles([]); setNaziv(''); setTip('opsti'); setOpis(''); setDatum(format(new Date(), 'yyyy-MM-dd')); setFormError('');
    setOpen(true);
  }

  async function handleUpload() {
    if (!files.length) { setFormError('Izaberite fajl.'); return; }
    if (!naziv.trim()) { setFormError('Upišite naziv dokumenta.'); return; }
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadDokument(patientId, files[i], {
          naziv: files.length > 1 ? `${naziv.trim()} (${i + 1})` : naziv.trim(),
          tip, opis: opis.trim(), datum, userId: user?.id,
        });
      }
      setOpen(false);
      refresh();
    } catch (e) {
      setFormError('Otpremanje nije uspjelo: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setUploading(false);
    }
  }

  async function otvori(d: Dokument) {
    const url = await linkDokumenta(d.putanja);
    if (url) window.open(url, '_blank', 'noopener');
    else alert('Link za dokument nije napravljen.');
  }

  async function obrisi(d: Dokument) {
    if (!confirm(`Trajno obrisati „${d.naziv}"?`)) return;
    await obrisiDokument(d);
    refresh();
  }

  const shown = docs.filter((d) => !tipFilter || d.tip === tipFilter);
  const prije = docs.filter((d) => d.tip === 'foto_prije' && thumbs[d.id]);
  const poslije = docs.filter((d) => d.tip === 'foto_poslije' && thumbs[d.id]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select aria-label="Vrsta dokumenta" value={tipFilter} onChange={(e) => setTipFilter(e.target.value as Dokument['tip'] | '')}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-white">
          <option value="">Sva dokumenta ({docs.length})</option>
          {Object.entries(DOKUMENT_TIPOVI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button onClick={openUpload}><Upload size={14} /> Dodaj dokument</Button>
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {(prije.length > 0 || poslije.length > 0) && !tipFilter && (
        <Card>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Prije / poslije</h3>
          <div className="grid grid-cols-2 gap-4">
            {[['Prije', prije], ['Poslije', poslije]].map(([lbl, list]) => (
              <div key={lbl as string}>
                <p className="text-xs font-medium text-gray-600 mb-2">{lbl as string}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(list as Dokument[]).slice(0, 4).map((d) => (
                    <button key={d.id} onClick={() => otvori(d)} className="block aspect-square rounded-lg overflow-hidden border border-border focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <img src={thumbs[d.id]} alt={`${d.naziv}, ${format(parseISO(d.datum), 'dd.MM.yyyy.')}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {(list as Dokument[]).length === 0 && <p className="col-span-2 text-xs text-gray-400">Nema fotografija.</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2" aria-busy="true">{[0, 1].map((i) => <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-xl">
          <FolderOpen className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">Nema dokumenata. Dodajte nalaz, potpisanu saglasnost ili fotografiju.</p>
        </div>
      ) : (
        <ul className="bg-white border border-border rounded-xl divide-y divide-border">
          {shown.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              {thumbs[d.id]
                ? <img src={thumbs[d.id]} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
                : <span className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                    {d.mime?.startsWith('image/') ? <ImageIcon size={16} className="text-gray-400" /> : <FileText size={16} className="text-gray-400" />}
                  </span>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{d.naziv}</p>
                <p className="text-xs text-gray-400">
                  {DOKUMENT_TIPOVI[d.tip]} · {format(parseISO(d.datum), 'dd.MM.yyyy.')}{d.velicina ? ` · ${velicina(d.velicina)}` : ''}
                </p>
                {d.opis && <p className="text-xs text-gray-500 truncate">{d.opis}</p>}
              </div>
              <button onClick={() => otvori(d)} className="p-2 text-gray-500 hover:text-primary-700 rounded-lg" aria-label={`Otvori ${d.naziv}`}><ExternalLink size={15} /></button>
              <button onClick={() => obrisi(d)} className="p-2 text-gray-400 hover:text-danger rounded-lg" aria-label={`Obriši ${d.naziv}`}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={open} onClose={() => !uploading && setOpen(false)} title="Novi dokument" size="md">
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); izaberi(e.dataTransfer.files); }}
            className={`rounded-xl border-2 border-dashed p-6 text-center ${drag ? 'border-primary-500 bg-primary-50' : 'border-border'}`}
          >
            <Upload className="mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-sm text-gray-600">Prevucite fajlove ovdje ili</p>
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 text-sm font-medium text-primary-700 hover:underline">izaberite sa računara</button>
            <input ref={fileRef} type="file" multiple className="sr-only" aria-label="Izaberi fajlove"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx" onChange={(e) => izaberi(e.target.files)} />
            <p className="mt-2 text-[11px] text-gray-400">PDF, slike, Word · do 20 MB po fajlu</p>
            {files.length > 0 && (
              <ul className="mt-3 text-sm text-gray-700 text-left space-y-0.5">
                {files.map((f) => <li key={f.name} className="truncate">• {f.name} <span className="text-gray-400">{velicina(f.size)}</span></li>)}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="dok-naziv" className="block text-sm font-medium text-gray-700 mb-1">Naziv *</label>
              <input id="dok-naziv" value={naziv} onChange={(e) => setNaziv(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
            <div>
              <label htmlFor="dok-tip" className="block text-sm font-medium text-gray-700 mb-1">Vrsta</label>
              <select id="dok-tip" value={tip} onChange={(e) => setTip(e.target.value as Dokument['tip'])}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">
                {Object.entries(DOKUMENT_TIPOVI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="dok-datum" className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input id="dok-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label htmlFor="dok-opis" className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
            <textarea id="dok-opis" rows={2} value={opis} onChange={(e) => setOpis(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={uploading}>Otkaži</Button>
            <Button onClick={handleUpload} loading={uploading}>Otpremi</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
