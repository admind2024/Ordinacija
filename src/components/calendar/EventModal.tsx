import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useCalendar } from '../../contexts/CalendarContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Dogadjaj } from '../../lib/events';

const BOJE = ['#94A3B8', '#2BA5A5', '#C4956F', '#A855F7', '#F97316', '#EF4444'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  edit?: Dogadjaj | null;
  defaultDate?: Date;
  defaultTime?: string;
}

const lokalno = (iso: string) => format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");

// Interni dogadjaj: sastanak, edukacija, servis aparata. Izabrana ordinacija se blokira za termine.
export default function EventModal({ isOpen, onClose, onSaved, edit, defaultDate, defaultTime }: Props) {
  const { rooms, doctors } = useCalendar();
  const { user } = useAuth();
  const startDefault = `${format(defaultDate || new Date(), 'yyyy-MM-dd')}T${defaultTime || '09:00'}`;
  const [naslov, setNaslov] = useState(edit?.naslov || '');
  const [roomId, setRoomId] = useState(edit?.room_id || '');
  const [od, setOd] = useState(edit ? lokalno(edit.pocetak) : startDefault);
  const [doVr, setDoVr] = useState(() => {
    if (edit) return lokalno(edit.kraj);
    const d = new Date(startDefault);
    d.setHours(d.getHours() + 1);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  });
  const [boja, setBoja] = useState(edit?.boja || BOJE[0]);
  const [opis, setOpis] = useState(edit?.opis || '');
  const [ucesnici, setUcesnici] = useState<string[]>(edit?.ucesnici || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggle(id: string) {
    setUcesnici((u) => (u.includes(id) ? u.filter((x) => x !== id) : [...u, id]));
  }

  async function handleSave() {
    if (!naslov.trim()) { setError('Upišite naslov.'); return; }
    if (new Date(doVr) <= new Date(od)) { setError('Kraj mora biti poslije početka.'); return; }
    if (!roomId && ucesnici.length === 0) { setError('Izaberite ordinaciju ili bar jednog učesnika.'); return; }
    setSaving(true);
    const row = {
      naslov: naslov.trim(),
      room_id: roomId || null,
      pocetak: new Date(od).toISOString(),
      kraj: new Date(doVr).toISOString(),
      boja,
      opis: opis.trim() || null,
      ucesnici,
    };
    const res = edit
      ? await supabase.from('kalendar_dogadjaji').update(row).eq('id', edit.id)
      : await supabase.from('kalendar_dogadjaji').insert({ ...row, created_by: user?.id || null });
    setSaving(false);
    if (res.error) { setError('Nije sačuvano: ' + res.error.message); return; }
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!edit || !confirm(`Obrisati događaj „${edit.naslov}"?`)) return;
    await supabase.from('kalendar_dogadjaji').delete().eq('id', edit.id);
    onSaved();
    onClose();
  }

  const inp = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={edit ? 'Događaj' : 'Novi događaj'} size="md">
      <div className="space-y-4">
        <div>
          <label htmlFor="ev-naslov" className="block text-sm font-medium text-gray-700 mb-1">Naslov *</label>
          <input id="ev-naslov" value={naslov} onChange={(e) => setNaslov(e.target.value)} placeholder="npr. Servis aparata, sastanak tima" className={inp} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ev-od" className="block text-sm font-medium text-gray-700 mb-1">Početak</label>
            <input id="ev-od" type="datetime-local" value={od} onChange={(e) => setOd(e.target.value)} className={inp} />
          </div>
          <div>
            <label htmlFor="ev-do" className="block text-sm font-medium text-gray-700 mb-1">Kraj</label>
            <input id="ev-do" type="datetime-local" value={doVr} onChange={(e) => setDoVr(e.target.value)} className={inp} />
          </div>
        </div>
        <div>
          <label htmlFor="ev-room" className="block text-sm font-medium text-gray-700 mb-1">Ordinacija / oprema</label>
          <select id="ev-room" value={roomId} onChange={(e) => setRoomId(e.target.value)} className={`${inp} bg-white`}>
            <option value="">Bez blokade ordinacije</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.naziv}</option>)}
          </select>
          {roomId && <p className="mt-1 text-xs text-gray-500">U tom periodu se ova ordinacija ne može zakazati.</p>}
        </div>
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">Učesnici <span className="text-gray-400 font-normal">({ucesnici.length})</span></legend>
          <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {doctors.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-gray-50">
                <input type="checkbox" checked={ucesnici.includes(d.id)} onChange={() => toggle(d.id)} className="w-4 h-4 accent-primary-600" />
                <span className="truncate">{d.ime} {d.prezime}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">Boja</legend>
          <div className="flex gap-2">
            {BOJE.map((b) => (
              <button key={b} type="button" onClick={() => setBoja(b)} aria-label={`Boja ${b}`} aria-pressed={boja === b}
                className={`w-7 h-7 rounded-full ${boja === b ? 'ring-2 ring-offset-2 ring-gray-700' : ''}`} style={{ backgroundColor: b }} />
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="ev-opis" className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
          <textarea id="ev-opis" rows={2} value={opis} onChange={(e) => setOpis(e.target.value)} className={inp} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-between gap-2 pt-2">
          {edit ? <Button variant="ghost" onClick={handleDelete} className="!text-danger"><Trash2 size={14} /> Obriši</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Otkaži</Button>
            <Button onClick={handleSave} loading={saving}>Sačuvaj</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
