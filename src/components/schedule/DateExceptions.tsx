import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import type { Doctor, DoctorSchedule } from '../../types';

interface Props {
  doctor: Doctor;
  schedules: DoctorSchedule[];
  onSaved: () => void;
}

// Izuzeci: drugacije radno vrijeme ili neradni dan za tacan datum.
export default function DateExceptions({ doctor, schedules, onSaved }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const izuzeci = schedules
    .filter((s) => s.doctor_id === doctor.id && !s.ponavljajuci && s.datum && s.datum >= today)
    .sort((a, b) => (a.datum! < b.datum! ? -1 : 1));

  const [open, setOpen] = useState(false);
  const [datum, setDatum] = useState(today);
  const [radi, setRadi] = useState(true);
  const [pocetak, setPocetak] = useState('08:00');
  const [kraj, setKraj] = useState('16:00');
  const [napomena, setNapomena] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!datum) { setError('Izaberite datum.'); return; }
    if (radi && pocetak >= kraj) { setError('Kraj mora biti poslije početka.'); return; }
    setSaving(true);
    setError('');
    // Jedan izuzetak po danu: novi unos zamjenjuje stari za isti datum.
    await supabase.from('doctor_schedules').delete().eq('doctor_id', doctor.id).eq('ponavljajuci', false).eq('datum', datum);
    const { error: e } = await supabase.from('doctor_schedules').insert({
      doctor_id: doctor.id,
      ponavljajuci: false,
      datum,
      dan_u_sedmici: null,
      tip: radi ? 'standardno' : 'neradni',
      pocetak: radi ? pocetak : null,
      kraj: radi ? kraj : null,
      pauze: [],
      napomena: napomena.trim() || null,
    });
    setSaving(false);
    if (e) { setError('Nije sačuvano: ' + e.message); return; }
    setOpen(false);
    setNapomena('');
    onSaved();
  }

  async function handleDelete(id: string) {
    if (!confirm('Ukloniti ovaj izuzetak? Za taj dan ponovo važi sedmični raspored.')) return;
    await supabase.from('doctor_schedules').delete().eq('id', id);
    onSaved();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">Drugačije radno vrijeme ili slobodan dan za određeni datum.</p>
        <Button size="sm" variant="secondary" onClick={() => { setError(''); setOpen(true); }}>
          <Plus size={14} /> Dodaj izuzetak
        </Button>
      </div>

      {izuzeci.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-border rounded-lg">
          Nema izuzetaka u narednom periodu.
        </p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg">
          {izuzeci.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <span className="font-medium text-gray-800 capitalize">
                  {format(parseISO(s.datum!), 'EEEE, d. MMM yyyy.', { locale: sr })}
                </span>
                <span className="ml-2 text-gray-600">
                  {s.tip === 'neradni' ? 'ne radi' : `${s.pocetak}–${s.kraj}`}
                </span>
                {s.napomena && <span className="ml-2 text-gray-400 truncate">· {s.napomena}</span>}
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="p-1.5 text-gray-400 hover:text-danger rounded"
                aria-label="Ukloni izuzetak"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={`Izuzetak – ${doctor.ime} ${doctor.prezime}`} size="sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="izuzetak-datum" className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input
              id="izuzetak-datum"
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <fieldset className="flex gap-4 text-sm">
            <legend className="sr-only">Da li radi</legend>
            <label className="flex items-center gap-2">
              <input type="radio" checked={radi} onChange={() => setRadi(true)} className="accent-primary-600" /> Radi
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!radi} onChange={() => setRadi(false)} className="accent-primary-600" /> Ne radi
            </label>
          </fieldset>
          {radi && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="izuzetak-od" className="block text-sm font-medium text-gray-700 mb-1">Od</label>
                <input id="izuzetak-od" type="time" value={pocetak} onChange={(e) => setPocetak(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div>
                <label htmlFor="izuzetak-do" className="block text-sm font-medium text-gray-700 mb-1">Do</label>
                <input id="izuzetak-do" type="time" value={kraj} onChange={(e) => setKraj(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
            </div>
          )}
          <div>
            <label htmlFor="izuzetak-napomena" className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
            <input id="izuzetak-napomena" value={napomena} onChange={(e) => setNapomena(e.target.value)}
              placeholder="npr. kongres, druga smjena"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Otkaži</Button>
            <Button onClick={handleSave} loading={saving}>Sačuvaj</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
