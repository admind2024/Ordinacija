import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { DANI } from '../../lib/schedule';
import type { Doctor, DoctorSchedule, Pauza } from '../../types';

interface DanRed {
  radi: boolean;
  pocetak: string;
  kraj: string;
  pauze: Pauza[];
}

const PRAZAN_DAN: DanRed = { radi: false, pocetak: '08:00', kraj: '16:00', pauze: [] };

function izSablona(schedules: DoctorSchedule[], doctorId: string): DanRed[] {
  return DANI.map((_, i) => {
    const red = schedules.find((s) => s.doctor_id === doctorId && s.ponavljajuci && s.dan_u_sedmici === i + 1);
    if (!red) return { ...PRAZAN_DAN };
    return {
      radi: red.tip !== 'neradni' && !!red.pocetak,
      pocetak: red.pocetak || PRAZAN_DAN.pocetak,
      kraj: red.kraj || PRAZAN_DAN.kraj,
      pauze: red.pauze || [],
    };
  });
}

// Roditelj renderuje sa key={doctor.id}, pa se stanje puni iznova za svaku osobu.
interface Props {
  doctor: Doctor;
  schedules: DoctorSchedule[];
  onSaved: () => void;
}

export default function WeeklyTemplateEditor({ doctor, schedules, onSaved }: Props) {
  const [dani, setDani] = useState<DanRed[]>(() => izSablona(schedules, doctor.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<DanRed>) {
    setDani((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
    setSaved(false);
  }

  function validiraj(): string {
    for (let i = 0; i < dani.length; i++) {
      const d = dani[i];
      if (!d.radi) continue;
      if (d.pocetak >= d.kraj) return `${DANI[i]}: kraj mora biti poslije početka.`;
      for (const p of d.pauze) {
        if (p.od >= p.do) return `${DANI[i]}: pauza mora imati kraj poslije početka.`;
        if (p.od < d.pocetak || p.do > d.kraj) return `${DANI[i]}: pauza mora biti unutar radnog vremena.`;
      }
    }
    return '';
  }

  async function handleSave() {
    const err = validiraj();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    const rows = dani.map((d, i) => ({
      doctor_id: doctor.id,
      ponavljajuci: true,
      dan_u_sedmici: i + 1,
      datum: null,
      tip: d.radi ? 'standardno' : 'neradni',
      pocetak: d.radi ? d.pocetak : null,
      kraj: d.radi ? d.kraj : null,
      pauze: d.radi ? d.pauze : [],
    }));
    // Sablon zamijenimo u cjelini: obrisi stare sedmicne redove pa upisi 7 novih.
    const del = await supabase.from('doctor_schedules').delete().eq('doctor_id', doctor.id).eq('ponavljajuci', true);
    const ins = del.error ? del : await supabase.from('doctor_schedules').insert(rows);
    setSaving(false);
    if (ins.error) {
      setError('Raspored nije sačuvan: ' + ins.error.message);
      return;
    }
    setSaved(true);
    onSaved();
  }

  return (
    <div>
      <div className="space-y-2">
        {dani.map((d, i) => (
          <div key={DANI[i]} className="border border-border rounded-lg p-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 w-36 text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={d.radi}
                  onChange={(e) => update(i, { radi: e.target.checked })}
                  className="w-4 h-4 accent-primary-600"
                />
                {DANI[i]}
              </label>
              {d.radi ? (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    aria-label={`${DANI[i]} početak`}
                    value={d.pocetak}
                    onChange={(e) => update(i, { pocetak: e.target.value })}
                    className="px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-gray-400">do</span>
                  <input
                    type="time"
                    aria-label={`${DANI[i]} kraj`}
                    value={d.kraj}
                    onChange={(e) => update(i, { kraj: e.target.value })}
                    className="px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => update(i, { pauze: [...d.pauze, { od: '12:00', do: '12:30' }] })}
                    className="ml-1 inline-flex items-center gap-1 text-xs text-primary-700 hover:underline"
                  >
                    <Plus size={12} /> Pauza
                  </button>
                </div>
              ) : (
                <span className="text-sm text-gray-400">Ne radi</span>
              )}
            </div>
            {d.radi && d.pauze.length > 0 && (
              <div className="mt-2 ml-0 sm:ml-36 space-y-1">
                {d.pauze.map((p, pi) => (
                  <div key={pi} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-12">Pauza</span>
                    <input
                      type="time"
                      aria-label="Pauza od"
                      value={p.od}
                      onChange={(e) => update(i, { pauze: d.pauze.map((x, xi) => (xi === pi ? { ...x, od: e.target.value } : x)) })}
                      className="px-2 py-1 border border-border rounded-md"
                    />
                    <span>–</span>
                    <input
                      type="time"
                      aria-label="Pauza do"
                      value={p.do}
                      onChange={(e) => update(i, { pauze: d.pauze.map((x, xi) => (xi === pi ? { ...x, do: e.target.value } : x)) })}
                      className="px-2 py-1 border border-border rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => update(i, { pauze: d.pauze.filter((_, xi) => xi !== pi) })}
                      className="p-1 text-gray-400 hover:text-danger"
                      aria-label="Ukloni pauzu"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-success">Sačuvano</span>}
        <Button onClick={handleSave} loading={saving}>
          <Save size={14} /> Sačuvaj sedmični raspored
        </Button>
      </div>
    </div>
  );
}
