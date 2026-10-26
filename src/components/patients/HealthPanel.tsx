import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, HeartPulse, ShieldAlert, ClipboardList } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import {
  MKB_CESTE, RIZICI, TEZINA_LABELS,
  type Alergija, type ZdravstveniPodaci,
} from '../../lib/karton';

interface Props {
  patientId: string;
  data: ZdravstveniPodaci | null;
  error: string;
  onChanged: () => void;
}

type Forma = null | 'alergija' | 'rizik' | 'dijagnoza';

const inp = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const fmt = (d: string | null) => (d ? format(parseISO(d), 'dd.MM.yyyy.') : '');

function Sekcija({ title, icon, onAdd, addLabel, children, empty }: {
  title: string; icon: React.ReactNode; onAdd: () => void; addLabel: string; children: React.ReactNode; empty: boolean;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">{icon}{title}</h3>
        <Button size="sm" variant="secondary" onClick={onAdd}><Plus size={14} /> {addLabel}</Button>
      </div>
      {empty ? <p className="text-sm text-gray-400">Nije uneseno.</p> : children}
    </Card>
  );
}

// Alergije, faktori rizika i dijagnoze na jednom mjestu.
export default function HealthPanel({ patientId, data, error, onChanged }: Props) {
  const [forma, setForma] = useState<Forma>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // alergija
  const [aNaziv, setANaziv] = useState('');
  const [aTezina, setATezina] = useState<Alergija['tezina']>('nepoznato');
  const [aReakcija, setAReakcija] = useState('');
  // rizik
  const [rTip, setRTip] = useState('trudnoca');
  const [rOpis, setROpis] = useState('');
  // dijagnoza
  const [dSifra, setDSifra] = useState('');
  const [dNaziv, setDNaziv] = useState('');
  const [dTip, setDTip] = useState<'licna' | 'porodicna'>('licna');
  const [dDatum, setDDatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dNapomena, setDNapomena] = useState('');

  const mkbPredlozi = useMemo(() => {
    const q = (dSifra || dNaziv).trim().toLowerCase();
    if (!q) return MKB_CESTE.slice(0, 8);
    return MKB_CESTE.filter((m) => m.sifra.toLowerCase().startsWith(q) || m.naziv.toLowerCase().includes(q)).slice(0, 8);
  }, [dSifra, dNaziv]);

  function otvori(f: Forma) {
    setFormError('');
    setANaziv(''); setATezina('nepoznato'); setAReakcija('');
    setRTip('trudnoca'); setROpis('');
    setDSifra(''); setDNaziv(''); setDTip('licna'); setDDatum(format(new Date(), 'yyyy-MM-dd')); setDNapomena('');
    setForma(f);
  }

  async function sacuvaj() {
    let res;
    if (forma === 'alergija') {
      if (!aNaziv.trim()) { setFormError('Upišite na šta je pacijent alergičan.'); return; }
      setSaving(true);
      res = await supabase.from('pacijent_alergije').insert({ patient_id: patientId, naziv: aNaziv.trim(), tezina: aTezina, reakcija: aReakcija.trim() || null });
    } else if (forma === 'rizik') {
      if (rTip === 'ostalo' && !rOpis.trim()) { setFormError('Opišite faktor rizika.'); return; }
      setSaving(true);
      res = await supabase.from('pacijent_rizici').insert({ patient_id: patientId, tip: rTip, opis: rOpis.trim() || null });
    } else if (forma === 'dijagnoza') {
      if (!dSifra.trim() || !dNaziv.trim()) { setFormError('Unesite MKB šifru i naziv dijagnoze.'); return; }
      setSaving(true);
      res = await supabase.from('pacijent_dijagnoze').insert({
        patient_id: patientId, mkb_sifra: dSifra.trim().toUpperCase(), naziv: dNaziv.trim(), tip: dTip, datum: dDatum, napomena: dNapomena.trim() || null,
      });
    }
    setSaving(false);
    if (res?.error) { setFormError('Nije sačuvano: ' + res.error.message); return; }
    setForma(null);
    onChanged();
  }

  async function obrisi(tabela: string, id: string, opis: string) {
    if (!confirm(`Ukloniti „${opis}" iz kartona?`)) return;
    await supabase.from(tabela).delete().eq('id', id);
    onChanged();
  }

  async function toggleRizik(id: string, aktivan: boolean) {
    await supabase.from('pacijent_rizici').update({ aktivan }).eq('id', id);
    onChanged();
  }

  if (error) return <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>;
  if (!data) {
    return <div className="grid md:grid-cols-2 gap-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />)}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Sekcija title="Alergije" icon={<HeartPulse size={14} />} onAdd={() => otvori('alergija')} addLabel="Alergija" empty={!data.alergije.length}>
        <ul className="divide-y divide-border">
          {data.alergije.map((a) => (
            <li key={a.id} className="py-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{a.naziv}
                  <span className={`ml-2 text-[11px] px-1.5 py-0.5 rounded ${a.tezina === 'teska' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{TEZINA_LABELS[a.tezina]}</span>
                </p>
                {a.reakcija && <p className="text-xs text-gray-500">{a.reakcija}</p>}
              </div>
              <button onClick={() => obrisi('pacijent_alergije', a.id, a.naziv)} className="p-1.5 text-gray-400 hover:text-danger rounded" aria-label={`Ukloni alergiju ${a.naziv}`}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      </Sekcija>

      <Sekcija title="Faktori rizika" icon={<ShieldAlert size={14} />} onAdd={() => otvori('rizik')} addLabel="Rizik" empty={!data.rizici.length}>
        <ul className="divide-y divide-border">
          {data.rizici.map((r) => (
            <li key={r.id} className={`py-2 flex items-start justify-between gap-3 ${r.aktivan ? '' : 'opacity-50'}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{RIZICI[r.tip] || r.tip}</p>
                {r.opis && <p className="text-xs text-gray-500">{r.opis}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleRizik(r.id, !r.aktivan)} className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                  {r.aktivan ? 'Više ne važi' : 'Ponovo važi'}
                </button>
                <button onClick={() => obrisi('pacijent_rizici', r.id, RIZICI[r.tip] || r.tip)} className="p-1.5 text-gray-400 hover:text-danger rounded" aria-label="Ukloni rizik"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      </Sekcija>

      <div className="lg:col-span-2">
        <Sekcija title="Dijagnoze (MKB-10)" icon={<ClipboardList size={14} />} onAdd={() => otvori('dijagnoza')} addLabel="Dijagnoza" empty={!data.dijagnoze.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th scope="col" className="text-left py-1.5 pr-3 font-semibold">Šifra</th>
                  <th scope="col" className="text-left py-1.5 pr-3 font-semibold">Dijagnoza</th>
                  <th scope="col" className="text-left py-1.5 pr-3 font-semibold">Vrsta</th>
                  <th scope="col" className="text-left py-1.5 pr-3 font-semibold">Datum</th>
                  <th scope="col"><span className="sr-only">Akcije</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.dijagnoze.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2 pr-3 font-mono text-primary-700">{d.mkb_sifra}</td>
                    <td className="py-2 pr-3 text-gray-900">{d.naziv}{d.napomena && <span className="block text-xs text-gray-400">{d.napomena}</span>}</td>
                    <td className="py-2 pr-3 text-gray-600">{d.tip === 'licna' ? 'Lična' : 'Porodična'}</td>
                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{fmt(d.datum)}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => obrisi('pacijent_dijagnoze', d.id, `${d.mkb_sifra} ${d.naziv}`)} className="p-1.5 text-gray-400 hover:text-danger rounded" aria-label="Ukloni dijagnozu"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sekcija>
      </div>

      <Modal isOpen={forma !== null} onClose={() => setForma(null)} size="sm"
        title={forma === 'alergija' ? 'Nova alergija' : forma === 'rizik' ? 'Novi faktor rizika' : 'Nova dijagnoza'}>
        <div className="space-y-4">
          {forma === 'alergija' && (
            <>
              <div>
                <label htmlFor="al-naziv" className="block text-sm font-medium text-gray-700 mb-1">Na šta *</label>
                <input id="al-naziv" value={aNaziv} onChange={(e) => setANaziv(e.target.value)} placeholder="npr. lidokain, lateks, penicilin" className={inp} />
              </div>
              <div>
                <label htmlFor="al-tezina" className="block text-sm font-medium text-gray-700 mb-1">Težina reakcije</label>
                <select id="al-tezina" value={aTezina} onChange={(e) => setATezina(e.target.value as Alergija['tezina'])} className={`${inp} bg-white`}>
                  {Object.entries(TEZINA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="al-reakcija" className="block text-sm font-medium text-gray-700 mb-1">Kako se manifestuje</label>
                <textarea id="al-reakcija" rows={2} value={aReakcija} onChange={(e) => setAReakcija(e.target.value)} className={inp} />
              </div>
            </>
          )}
          {forma === 'rizik' && (
            <>
              <div>
                <label htmlFor="rz-tip" className="block text-sm font-medium text-gray-700 mb-1">Rizik</label>
                <select id="rz-tip" value={rTip} onChange={(e) => setRTip(e.target.value)} className={`${inp} bg-white`}>
                  {Object.entries(RIZICI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="rz-opis" className="block text-sm font-medium text-gray-700 mb-1">Detalji {rTip === 'ostalo' && '*'}</label>
                <textarea id="rz-opis" rows={2} value={rOpis} onChange={(e) => setROpis(e.target.value)} placeholder="npr. naziv lijeka, od kada" className={inp} />
              </div>
            </>
          )}
          {forma === 'dijagnoza' && (
            <>
              <div className="grid grid-cols-[7rem_1fr] gap-3">
                <div>
                  <label htmlFor="dg-sifra" className="block text-sm font-medium text-gray-700 mb-1">MKB *</label>
                  <input id="dg-sifra" value={dSifra} onChange={(e) => setDSifra(e.target.value)} placeholder="L70.0" className={`${inp} font-mono`} />
                </div>
                <div>
                  <label htmlFor="dg-naziv" className="block text-sm font-medium text-gray-700 mb-1">Naziv *</label>
                  <input id="dg-naziv" value={dNaziv} onChange={(e) => setDNaziv(e.target.value)} className={inp} />
                </div>
              </div>
              {mkbPredlozi.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Česte šifre:</p>
                  <div className="flex flex-wrap gap-1">
                    {mkbPredlozi.map((m) => (
                      <button key={m.sifra} type="button" onClick={() => { setDSifra(m.sifra); setDNaziv(m.naziv); }}
                        className="text-xs px-2 py-1 rounded-md border border-border hover:bg-primary-50 hover:border-primary-200">
                        <span className="font-mono text-primary-700">{m.sifra}</span> {m.naziv}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dg-tip" className="block text-sm font-medium text-gray-700 mb-1">Vrsta</label>
                  <select id="dg-tip" value={dTip} onChange={(e) => setDTip(e.target.value as 'licna' | 'porodicna')} className={`${inp} bg-white`}>
                    <option value="licna">Lična</option>
                    <option value="porodicna">Porodična anamneza</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dg-datum" className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <input id="dg-datum" type="date" value={dDatum} onChange={(e) => setDDatum(e.target.value)} className={inp} />
                </div>
              </div>
              <div>
                <label htmlFor="dg-nap" className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
                <input id="dg-nap" value={dNapomena} onChange={(e) => setDNapomena(e.target.value)} className={inp} />
              </div>
            </>
          )}
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setForma(null)}>Otkaži</Button>
            <Button onClick={sacuvaj} loading={saving}>Sačuvaj</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
