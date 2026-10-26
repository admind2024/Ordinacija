import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { unesiNabavku } from '../../lib/lager';
import { eur } from '../../lib/payments';
import type { Material } from '../../types';

interface Red { material_id: string; kolicina: string; cijena: string }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  preselectId?: string;
  onSaved: () => void;
}

const broj = (s: string) => Number(s.replace(',', '.'));

// Nabavka: jedna faktura sa vise stavki; svaka stavka povecava stanje i azurira nabavnu cijenu.
export default function PurchaseModal({ isOpen, onClose, materials, preselectId, onSaved }: Props) {
  const { user } = useAuth();
  const [datum, setDatum] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [faktura, setFaktura] = useState('');
  const [dobavljac, setDobavljac] = useState('');
  const [napomena, setNapomena] = useState('');
  const [redovi, setRedovi] = useState<Red[]>(() => [{ material_id: preselectId || '', kolicina: '', cijena: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ukupno = redovi.reduce((s, r) => s + (broj(r.kolicina) || 0) * (broj(r.cijena) || 0), 0);
  const upd = (i: number, p: Partial<Red>) => setRedovi((rs) => rs.map((r, x) => (x === i ? { ...r, ...p } : r)));

  async function handleSave() {
    const valid = redovi.filter((r) => r.material_id && broj(r.kolicina) > 0);
    if (!valid.length) { setError('Dodajte bar jednu stavku sa količinom.'); return; }
    if (new Set(valid.map((r) => r.material_id)).size !== valid.length) { setError('Isti materijal je unesen dvaput — spojite stavke.'); return; }
    setSaving(true);
    setError('');
    try {
      await unesiNabavku(
        valid.map((r) => ({ material_id: r.material_id, kolicina: broj(r.kolicina), cijena: r.cijena ? broj(r.cijena) : null })),
        { datum, faktura: faktura.trim(), dobavljac: dobavljac.trim(), napomena: napomena.trim(), userId: user?.id }
      );
      onSaved();
      onClose();
    } catch (e) {
      setError('Nabavka nije sačuvana: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setSaving(false);
    }
  }

  const inp = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nabavka materijala" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="nb-datum" className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input id="nb-datum" type="datetime-local" value={datum} onChange={(e) => setDatum(e.target.value)} className={inp} />
          </div>
          <div>
            <label htmlFor="nb-faktura" className="block text-sm font-medium text-gray-700 mb-1">Broj fakture</label>
            <input id="nb-faktura" value={faktura} onChange={(e) => setFaktura(e.target.value)} className={inp} />
          </div>
          <div>
            <label htmlFor="nb-dob" className="block text-sm font-medium text-gray-700 mb-1">Dobavljač</label>
            <input id="nb-dob" value={dobavljac} onChange={(e) => setDobavljac(e.target.value)} className={inp} />
          </div>
        </div>

        <div>
          <div className="hidden sm:grid grid-cols-[1fr_6rem_7rem_6rem_2rem] gap-2 text-xs font-semibold text-gray-500 mb-1 px-1">
            <span>Materijal</span><span>Količina</span><span>Cijena / jed.</span><span className="text-right">Iznos</span><span />
          </div>
          <div className="space-y-2">
            {redovi.map((r, i) => {
              const m = materials.find((x) => x.id === r.material_id);
              return (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_6rem_7rem_6rem_2rem] gap-2 items-center p-2 sm:p-0 rounded-lg bg-gray-50 sm:bg-transparent">
                  <select aria-label="Materijal" value={r.material_id} onChange={(e) => upd(i, { material_id: e.target.value })}
                    className={`${inp} bg-white col-span-2 sm:col-span-1`}>
                    <option value="">Izaberite…</option>
                    {materials.map((x) => <option key={x.id} value={x.id}>{x.naziv}{x.sifra ? ` (${x.sifra})` : ''}</option>)}
                  </select>
                  <input aria-label="Količina" inputMode="decimal" value={r.kolicina} onChange={(e) => upd(i, { kolicina: e.target.value })}
                    placeholder={m?.jedinica_mjere || 'kol.'} className={inp} />
                  <input aria-label="Nabavna cijena po jedinici" inputMode="decimal" value={r.cijena} onChange={(e) => upd(i, { cijena: e.target.value })}
                    placeholder={m?.nabavna_cijena ? String(m.nabavna_cijena) : '€'} className={inp} />
                  <span className="text-sm text-right tabular-nums text-gray-700">{eur((broj(r.kolicina) || 0) * (broj(r.cijena) || 0))}</span>
                  <button type="button" onClick={() => setRedovi((rs) => rs.filter((_, x) => x !== i))} disabled={redovi.length === 1}
                    className="p-1.5 text-gray-400 hover:text-danger rounded disabled:opacity-30" aria-label="Ukloni stavku"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3">
            <button type="button" onClick={() => setRedovi((rs) => [...rs, { material_id: '', kolicina: '', cijena: '' }])}
              className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"><Plus size={14} /> Dodaj stavku</button>
            <p className="text-sm text-gray-600">Ukupno: <strong className="tabular-nums text-gray-900">{eur(ukupno)}</strong></p>
          </div>
        </div>

        <div>
          <label htmlFor="nb-nap" className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
          <input id="nb-nap" value={napomena} onChange={(e) => setNapomena(e.target.value)} className={inp} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Otkaži</Button>
          <Button onClick={handleSave} loading={saving}>Sačuvaj nabavku</Button>
        </div>
      </div>
    </Modal>
  );
}
