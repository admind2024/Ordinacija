import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import { Plus, Phone, CalendarPlus, X, Hourglass, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import AppointmentModal from '../calendar/AppointmentModal';
import { supabase } from '../../lib/supabase';
import { useCalendar } from '../../contexts/CalendarContext';
import { usePatients } from '../../contexts/PatientsContext';
import { useAuth } from '../../contexts/AuthContext';

interface Stavka {
  id: string;
  patient_id: string | null;
  ime_prezime: string | null;
  telefon: string | null;
  service_id: string | null;
  doctor_id: string | null;
  zeljeni_od: string | null;
  zeljeni_do: string | null;
  zeljeno_vrijeme: string | null;
  napomena: string | null;
  status: 'ceka' | 'zakazan' | 'odustao';
  appointment_id: string | null;
  created_at: string;
}

type Filter = 'ceka' | 'zakazan' | 'odustao';

const EMPTY = {
  patientId: '', imePrezime: '', telefon: '', serviceId: '', doctorId: '',
  od: '', doDatum: '', vrijeme: '', napomena: '',
};

export default function WaitingList({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const { doctors, services } = useCalendar();
  const { patients } = usePatients();
  const { user } = useAuth();
  const [items, setItems] = useState<Stavka[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('ceka');

  const [formOpen, setFormOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [patientQuery, setPatientQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [zakazi, setZakazi] = useState<Stavka | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: e } = await supabase.from('lista_cekanja').select('*').order('created_at', { ascending: true });
    if (e) setError('Lista čekanja nije učitana: ' + e.message);
    else { setItems((data || []) as Stavka[]); setError(''); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { onCountChange?.(items.filter((i) => i.status === 'ceka').length); }, [items, onCountChange]);

  const patientMatches = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return patients.filter((p) => `${p.ime} ${p.prezime}`.toLowerCase().includes(q) || p.telefon?.includes(q)).slice(0, 6);
  }, [patientQuery, patients]);

  const ime = (s: Stavka) => {
    const p = s.patient_id ? patients.find((x) => x.id === s.patient_id) : null;
    return p ? `${p.ime} ${p.prezime}` : s.ime_prezime || '—';
  };
  const tel = (s: Stavka) => {
    const p = s.patient_id ? patients.find((x) => x.id === s.patient_id) : null;
    return p?.telefon || s.telefon || '';
  };

  function openNew() {
    setF(EMPTY);
    setPatientQuery('');
    setFormError('');
    setFormOpen(true);
  }

  async function handleSave() {
    if (!f.patientId && !f.imePrezime.trim()) { setFormError('Izaberite pacijenta ili upišite ime osobe.'); return; }
    if (!f.patientId && !f.telefon.trim()) { setFormError('Za osobu bez kartona unesite telefon.'); return; }
    if (f.od && f.doDatum && f.doDatum < f.od) { setFormError('Period nije ispravan.'); return; }
    setSaving(true);
    const { error: e } = await supabase.from('lista_cekanja').insert({
      patient_id: f.patientId || null,
      ime_prezime: f.patientId ? null : f.imePrezime.trim(),
      telefon: f.patientId ? null : f.telefon.trim(),
      service_id: f.serviceId || null,
      doctor_id: f.doctorId || null,
      zeljeni_od: f.od || null,
      zeljeni_do: f.doDatum || null,
      zeljeno_vrijeme: f.vrijeme.trim() || null,
      napomena: f.napomena.trim() || null,
      created_by: user?.id || null,
    });
    setSaving(false);
    if (e) { setFormError('Nije sačuvano: ' + e.message); return; }
    setFormOpen(false);
    refresh();
  }

  async function setStatus(s: Stavka, status: Stavka['status'], appointmentId?: string) {
    await supabase.from('lista_cekanja').update({ status, appointment_id: appointmentId ?? s.appointment_id }).eq('id', s.id);
    refresh();
  }

  async function handleDelete(s: Stavka) {
    if (!confirm(`Ukloniti ${ime(s)} sa liste?`)) return;
    await supabase.from('lista_cekanja').delete().eq('id', s.id);
    refresh();
  }

  const shown = items.filter((i) => i.status === filter);
  const counts = { ceka: 0, zakazan: 0, odustao: 0 } as Record<Filter, number>;
  items.forEach((i) => { counts[i.status]++; });

  const fmtD = (d: string | null) => (d ? format(parseISO(d), 'dd.MM.') : '');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2" role="group" aria-label="Status">
          {([['ceka', 'Čekaju'], ['zakazan', 'Zakazani'], ['odustao', 'Odustali']] as [Filter, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filter === k ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {l} <span className="tabular-nums opacity-70">{counts[k]}</span>
            </button>
          ))}
        </div>
        <Button onClick={openNew}><Plus size={16} /> Dodaj na listu</Button>
      </div>

      {error && <div role="alert" className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Hourglass className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">
            {filter === 'ceka' ? 'Niko ne čeka na termin.' : 'Nema stavki u ovoj grupi.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((s) => {
            const svc = services.find((x) => x.id === s.service_id);
            const doc = doctors.find((x) => x.id === s.doctor_id);
            const t = tel(s);
            return (
              <li key={s.id} className="bg-white border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate">{ime(s)}</p>
                    {!s.patient_id && <span className="text-[11px] px-1.5 py-0.5 rounded bg-accent-100 text-accent-800">bez kartona</span>}
                    <span className="text-xs text-gray-400">čeka {formatDistanceToNow(parseISO(s.created_at), { locale: sr })}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {svc?.naziv || 'Bilo koja usluga'}
                    {doc && <> · {doc.ime} {doc.prezime}</>}
                    {(s.zeljeni_od || s.zeljeni_do) && <> · {fmtD(s.zeljeni_od)}–{fmtD(s.zeljeni_do)}</>}
                    {s.zeljeno_vrijeme && <> · {s.zeljeno_vrijeme}</>}
                  </p>
                  {s.napomena && <p className="text-xs text-gray-400 mt-1">{s.napomena}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t && (
                    <a href={`tel:${t}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border text-gray-700 hover:bg-gray-50">
                      <Phone size={14} /> {t}
                    </a>
                  )}
                  {s.status === 'ceka' && (
                    <>
                      <Button size="sm" onClick={() => setZakazi(s)} disabled={!s.patient_id}
                        title={s.patient_id ? undefined : 'Prvo otvorite karton za ovu osobu u meniju Pacijenti'}>
                        <CalendarPlus size={14} /> Zakaži
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(s, 'odustao')} aria-label="Označi da je odustao">
                        <X size={14} />
                      </Button>
                    </>
                  )}
                  {s.status !== 'ceka' && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(s, 'ceka')}>Vrati na listu</Button>
                  )}
                  <button onClick={() => handleDelete(s)} className="p-2 text-gray-400 hover:text-danger rounded-lg" aria-label="Ukloni sa liste">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Dodaj na listu čekanja" size="md">
        <div className="space-y-4">
          <div className="relative">
            <label htmlFor="lc-pacijent" className="block text-sm font-medium text-gray-700 mb-1">Pacijent</label>
            {f.patientId ? (
              <div className="flex items-center justify-between px-3 py-2 border border-primary-200 bg-primary-50 rounded-lg text-sm">
                <span>{patients.find((p) => p.id === f.patientId)?.ime} {patients.find((p) => p.id === f.patientId)?.prezime}</span>
                <button onClick={() => setF({ ...f, patientId: '' })} className="text-gray-500 hover:text-gray-800" aria-label="Poništi izbor pacijenta"><X size={14} /></button>
              </div>
            ) : (
              <>
                <input id="lc-pacijent" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)}
                  placeholder="Pretraga po imenu ili telefonu"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {patientMatches.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {patientMatches.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => { setF({ ...f, patientId: p.id }); setPatientQuery(''); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                          {p.ime} {p.prezime} <span className="text-gray-400">{p.telefon}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {!f.patientId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-gray-50">
              <p className="sm:col-span-2 text-xs text-gray-500">Nema kartona? Upišite osobu, karton otvarate kad dođe.</p>
              <div>
                <label htmlFor="lc-ime" className="block text-sm font-medium text-gray-700 mb-1">Ime i prezime</label>
                <input id="lc-ime" value={f.imePrezime} onChange={(e) => setF({ ...f, imePrezime: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white" />
              </div>
              <div>
                <label htmlFor="lc-tel" className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input id="lc-tel" type="tel" value={f.telefon} onChange={(e) => setF({ ...f, telefon: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="lc-usluga" className="block text-sm font-medium text-gray-700 mb-1">Usluga</label>
              <select id="lc-usluga" value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">
                <option value="">Bilo koja</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.naziv}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="lc-ljekar" className="block text-sm font-medium text-gray-700 mb-1">Ljekar</label>
              <select id="lc-ljekar" value={f.doctorId} onChange={(e) => setF({ ...f, doctorId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">
                <option value="">Bilo ko</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.ime} {d.prezime}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="lc-od" className="block text-sm font-medium text-gray-700 mb-1">Može od</label>
              <input id="lc-od" type="date" value={f.od} onChange={(e) => setF({ ...f, od: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
            <div>
              <label htmlFor="lc-do" className="block text-sm font-medium text-gray-700 mb-1">Može do</label>
              <input id="lc-do" type="date" value={f.doDatum} min={f.od || undefined} onChange={(e) => setF({ ...f, doDatum: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label htmlFor="lc-vrijeme" className="block text-sm font-medium text-gray-700 mb-1">Kada mu odgovara</label>
            <input id="lc-vrijeme" value={f.vrijeme} onChange={(e) => setF({ ...f, vrijeme: e.target.value })}
              placeholder="npr. radnim danima poslije 16h"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label htmlFor="lc-napomena" className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
            <textarea id="lc-napomena" rows={2} value={f.napomena} onChange={(e) => setF({ ...f, napomena: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Otkaži</Button>
            <Button onClick={handleSave} loading={saving}>Dodaj</Button>
          </div>
        </div>
      </Modal>

      {zakazi && (
        <AppointmentModal
          isOpen
          onClose={() => setZakazi(null)}
          defaultDate={zakazi.zeljeni_od ? parseISO(zakazi.zeljeni_od) : undefined}
          defaultPatientId={zakazi.patient_id || undefined}
          defaultDoctorId={zakazi.doctor_id || undefined}
          defaultServiceId={zakazi.service_id || undefined}
          onCreated={(apt) => setStatus(zakazi, 'zakazan', apt.id)}
        />
      )}
    </div>
  );
}
