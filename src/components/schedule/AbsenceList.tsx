import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Plane } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { brojDana, RAZLOZI_ODSUSTVA } from '../../lib/schedule';
import type { Doctor, Odsustvo, RazlogOdsustva } from '../../types';

interface Props {
  doctors: Doctor[];
  odsustva: Odsustvo[];
  onSaved: () => void;
}

export default function AbsenceList({ doctors, odsustva, onSaved }: Props) {
  const thisYear = new Date().getFullYear();
  const [godina, setGodina] = useState(thisYear);
  const [doctorFilter, setDoctorFilter] = useState('');

  const [open, setOpen] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [od, setOd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [doDatum, setDoDatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [razlog, setRazlog] = useState<RazlogOdsustva>('godisnji');
  const [napomena, setNapomena] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const doctorName = (id: string) => {
    const d = doctors.find((x) => x.id === id);
    return d ? `${d.ime} ${d.prezime}` : 'Nepoznato';
  };

  const filtered = useMemo(
    () =>
      odsustva.filter(
        (o) =>
          (o.datum_od.startsWith(String(godina)) || o.datum_do.startsWith(String(godina))) &&
          (!doctorFilter || o.doctor_id === doctorFilter)
      ),
    [odsustva, godina, doctorFilter]
  );

  const ukupnoDana = filtered.reduce((s, o) => s + brojDana(o), 0);

  function openNew() {
    setDoctorId(doctorFilter || doctors[0]?.id || '');
    setNapomena('');
    setError('');
    setOpen(true);
  }

  async function handleSave() {
    if (!doctorId) { setError('Izaberite osobu.'); return; }
    if (!od || !doDatum || doDatum < od) { setError('Datum završetka ne može biti prije početka.'); return; }
    const preklapa = odsustva.some((o) => o.doctor_id === doctorId && o.datum_od <= doDatum && o.datum_do >= od);
    if (preklapa && !confirm('Ova osoba već ima odsustvo u tom periodu. Ipak sačuvati?')) return;
    setSaving(true);
    const { error: e } = await supabase.from('odsustva').insert({
      doctor_id: doctorId,
      datum_od: od,
      datum_do: doDatum,
      razlog,
      napomena: napomena.trim() || null,
    });
    setSaving(false);
    if (e) { setError('Nije sačuvano: ' + e.message); return; }
    setOpen(false);
    onSaved();
  }

  async function handleDelete(o: Odsustvo) {
    if (!confirm(`Obrisati odsustvo (${doctorName(o.doctor_id)})?`)) return;
    await supabase.from('odsustva').delete().eq('id', o.id);
    onSaved();
  }

  const fmt = (d: string) => format(parseISO(d), 'dd.MM.yyyy.');

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="ods-godina" className="block text-xs font-medium text-gray-500 mb-1">Godina</label>
            <select id="ods-godina" value={godina} onChange={(e) => setGodina(Number(e.target.value))}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-white">
              {[thisYear - 1, thisYear, thisYear + 1].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ods-osoba" className="block text-xs font-medium text-gray-500 mb-1">Osoba</label>
            <select id="ods-osoba" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-white max-w-[16rem]">
              <option value="">Svi</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.ime} {d.prezime}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={openNew}><Plus size={16} /> Dodaj odsustvo</Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Plane className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">Nema evidentiranih odsustava za izabrani period.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Osoba</th>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Period</th>
                <th scope="col" className="text-right px-4 py-2 font-semibold">Dana</th>
                <th scope="col" className="text-left px-4 py-2 font-semibold">Razlog</th>
                <th scope="col" className="px-4 py-2"><span className="sr-only">Akcije</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 font-medium text-gray-800">{doctorName(o.doctor_id)}</td>
                  <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{fmt(o.datum_od)} – {fmt(o.datum_do)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{brojDana(o)}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {RAZLOZI_ODSUSTVA[o.razlog]}
                    {o.napomena && <span className="block text-xs text-gray-400">{o.napomena}</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDelete(o)} className="p-1.5 text-gray-400 hover:text-danger rounded" aria-label="Obriši odsustvo">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 text-sm">
              <tr>
                <td colSpan={2} className="px-4 py-2 font-medium text-gray-600">Ukupno</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{ukupnoDana}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Novo odsustvo" size="sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="novo-ods-osoba" className="block text-sm font-medium text-gray-700 mb-1">Osoba</label>
            <select id="novo-ods-osoba" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.ime} {d.prezime}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="novo-ods-od" className="block text-sm font-medium text-gray-700 mb-1">Od</label>
              <input id="novo-ods-od" type="date" value={od}
                onChange={(e) => { setOd(e.target.value); if (doDatum < e.target.value) setDoDatum(e.target.value); }}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
            <div>
              <label htmlFor="novo-ods-do" className="block text-sm font-medium text-gray-700 mb-1">Do (uključivo)</label>
              <input id="novo-ods-do" type="date" value={doDatum} min={od} onChange={(e) => setDoDatum(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label htmlFor="novo-ods-razlog" className="block text-sm font-medium text-gray-700 mb-1">Razlog</label>
            <select id="novo-ods-razlog" value={razlog} onChange={(e) => setRazlog(e.target.value as RazlogOdsustva)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">
              {Object.entries(RAZLOZI_ODSUSTVA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="novo-ods-napomena" className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
            <textarea id="novo-ods-napomena" value={napomena} onChange={(e) => setNapomena(e.target.value)} rows={2}
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
