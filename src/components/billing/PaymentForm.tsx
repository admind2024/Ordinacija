import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Receipt, Tag } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useBilling } from '../../contexts/BillingContext';
import { supabase } from '../../lib/supabase';
import type { Appointment, PaymentMethod } from '../../types';
import { usePatients } from '../../contexts/PatientsContext';

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
}

export default function PaymentForm({ isOpen, onClose, appointment }: PaymentFormProps) {
  const { patients } = usePatients();
  const { addPayment, getAppointmentBalance } = useBilling();
  const balance = getAppointmentBalance(appointment);
  const patient = patients.find((p) => p.id === appointment.patient_id);

  // Bruto (bez ikakvog popusta) = sum(cijena * kolicina) — ignorise vec primijenjeni popust
  // u svc.ukupno jer omoguci ljekaru da override popusta pri naplati.
  const bruto = useMemo(() =>
    (appointment.services || []).reduce((s, svc) => s + (svc.cijena * (svc.kolicina || 1)), 0),
    [appointment.services],
  );

  // Popust: default = patient.popust (npr. 10%), editabilan u formi
  const [popust, setPopust] = useState<number>(patient?.popust || 0);
  const popustIznos = bruto * (popust / 100);
  // Za naplatu = bruto - popust (umjesto balance.total koji je koristio svc.ukupno koji moze
  // biti zastarjeli popust snimljen pri kreiranju termina).
  const zaNaplatu = Math.max(0, bruto - popustIznos);
  const preostaloZaNaplatu = Math.max(0, zaNaplatu - balance.paid);

  const [iznos, setIznos] = useState(preostaloZaNaplatu > 0 ? preostaloZaNaplatu : 0);
  const [nacinPlacanja, setNacinPlacanja] = useState<'gotovina' | 'kartica'>('gotovina');
  const [fiskalizuj, setFiskalizuj] = useState(false);
  const [napomena, setNapomena] = useState('');
  const [saving, setSaving] = useState(false);
  // Postojeci aktivan dug ovog pacijenta — prikazujemo u crvenom warning-u
  // kako bi recepcija vidjela da ce se novi dug nadovezati na postojeci
  const [existingDebt, setExistingDebt] = useState<number | null>(null);

  useEffect(() => {
    if (!appointment.patient_id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('dugovanja')
        .select('preostalo')
        .eq('patient_id', appointment.patient_id)
        .eq('status', 'aktivan')
        .order('datum_nastanka', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setExistingDebt(data ? Number(data.preostalo || 0) : 0);
    })();
    return () => { cancelled = true; };
  }, [appointment.patient_id]);

  const remaining = preostaloZaNaplatu - iznos;
  const willCreateDebt = remaining > 0.01;

  function getPaymentMethod(): PaymentMethod {
    if (fiskalizuj) {
      return nacinPlacanja === 'kartica' ? 'kartica_fiskalni' : 'gotovina_fiskalni';
    }
    return nacinPlacanja === 'kartica' ? 'kartica_fiskalni' : 'gotovina';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (iznos <= 0) return;
    setSaving(true);

    const metoda = getPaymentMethod();

    // Ako je popust pri naplati drugaciji od onog u appointment_services, sinhronizuj ga u DB
    // tako da buduci izvjestaji i istorija pacijenta prikazuju tacnu vrijednost.
    if (appointment.services && appointment.services.length > 0) {
      const servicesUpdated = appointment.services.map((svc) => ({
        id: svc.id,
        popust,
        ukupno: svc.cijena * (svc.kolicina || 1) * (1 - popust / 100),
      }));
      for (const s of servicesUpdated) {
        await supabase
          .from('appointment_services')
          .update({ popust: s.popust, ukupno: s.ukupno })
          .eq('id', s.id);
      }
    }

    addPayment({
      id: `pay-${Date.now()}`,
      appointment_id: appointment.id,
      iznos,
      metoda,
      napomena: napomena || undefined,
      datum: new Date().toISOString(),
      fiskalni_status: fiskalizuj ? 'pending' : undefined,
    });

    // Ako je placeno manje od ukupnog — kreiraj/azuriraj dugovanje.
    // Ako pacijent vec ima AKTIVAN dug, merge-uje se na postojeci red
    // (jedan pacijent = jedna aktivna stavka koja se akumulira),
    // umjesto da se pravi novi red po terminu.
    if (willCreateDebt && appointment.patient_id) {
      const serviceNames = appointment.services?.map((s) => s.naziv).join(', ') || 'Usluge';
      const datum = new Date().toLocaleDateString('sr-Latn');
      const opisLine = `${datum}: ${serviceNames} — placeno ${iznos.toFixed(0)}e od ${zaNaplatu.toFixed(0)}e${popust > 0 ? ` (popust ${popust}%)` : ''} (dug +${remaining.toFixed(0)}e)`;

      const { data: existing } = await supabase
        .from('dugovanja')
        .select('id, iznos, preostalo, opis, napomena')
        .eq('patient_id', appointment.patient_id)
        .eq('status', 'aktivan')
        .order('datum_nastanka', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Dopuni postojeci aktivan dug
        const novoPreostalo = Number(existing.preostalo || 0) + remaining;
        const noviIznos = Number(existing.iznos || 0) + remaining;
        const noviOpis = existing.opis ? `${existing.opis}\n${opisLine}` : opisLine;
        const novaNapomena = napomena
          ? (existing.napomena ? `${existing.napomena}\n${datum}: ${napomena}` : `${datum}: ${napomena}`)
          : existing.napomena;

        await supabase
          .from('dugovanja')
          .update({
            iznos: noviIznos,
            preostalo: novoPreostalo,
            opis: noviOpis,
            napomena: novaNapomena,
          })
          .eq('id', existing.id);
      } else {
        // Nema aktivnog duga — napravi novi
        await supabase.from('dugovanja').insert({
          patient_id: appointment.patient_id,
          iznos: remaining,
          preostalo: remaining,
          opis: opisLine,
          datum_nastanka: new Date().toISOString().slice(0, 10),
          status: 'aktivan',
          napomena: napomena || null,
        });
      }
    }

    setSaving(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Naplata" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pacijent */}
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900 text-base">
            {patient ? `${patient.ime} ${patient.prezime}` : 'Pacijent'}
          </p>
          {patient && patient.popust > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
              Stalni popust {patient.popust}%
            </span>
          )}
        </div>

        {/* Sumarni pregled sa inline popust kontrolom */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl divide-y divide-gray-200">
          {/* Stavke */}
          {appointment.services && appointment.services.length > 0 && (
            <div className="px-4 py-3 space-y-1 text-sm">
              {appointment.services.map((svc) => (
                <div key={svc.id} className="flex justify-between text-gray-600">
                  <span className="truncate pr-2">{svc.naziv} {svc.kolicina > 1 ? `x${svc.kolicina}` : ''}</span>
                  <span className="tabular-nums shrink-0">{(svc.cijena * (svc.kolicina || 1)).toFixed(2)} EUR</span>
                </div>
              ))}
            </div>
          )}

          {/* Osnovica */}
          <div className="px-4 py-2 flex justify-between text-sm text-gray-600">
            <span>Osnovica</span>
            <span className="tabular-nums">{bruto.toFixed(2)} EUR</span>
          </div>

          {/* Popust — inline suptilan input */}
          <div className="px-4 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Tag size={12} className="text-gray-400" />
              <span>Popust</span>
              <div className="relative w-14">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={popust}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    setPopust(val);
                    const newZaNaplatu = bruto * (1 - val / 100);
                    const newPreostalo = Math.max(0, newZaNaplatu - balance.paid);
                    setIznos(newPreostalo);
                  }}
                  className="w-full px-1.5 py-0.5 pr-4 text-right text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 tabular-nums"
                />
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 pointer-events-none">%</span>
              </div>
              {patient && patient.popust > 0 && popust !== patient.popust && (
                <button
                  type="button"
                  onClick={() => {
                    const val = patient.popust;
                    setPopust(val);
                    const newZaNaplatu = bruto * (1 - val / 100);
                    const newPreostalo = Math.max(0, newZaNaplatu - balance.paid);
                    setIznos(newPreostalo);
                  }}
                  className="text-[10px] text-primary-600 hover:text-primary-700 underline"
                >
                  stalni {patient.popust}%
                </button>
              )}
            </div>
            <span className={`tabular-nums ${popust > 0 ? 'text-emerald-700 font-medium' : 'text-gray-400'}`}>
              {popust > 0 ? `−${popustIznos.toFixed(2)} EUR` : '—'}
            </span>
          </div>

          {/* Vec placeno */}
          {balance.paid > 0 && (
            <div className="px-4 py-2 flex justify-between text-sm text-green-600">
              <span>Vec placeno</span>
              <span className="tabular-nums">−{balance.paid.toFixed(2)} EUR</span>
            </div>
          )}

          {/* Za naplatu */}
          <div className="px-4 py-3 flex justify-between items-center bg-white rounded-b-xl">
            <span className="text-sm font-semibold text-gray-700">Za naplatu</span>
            <span className="text-lg font-bold text-gray-900 tabular-nums">{preostaloZaNaplatu.toFixed(2)} EUR</span>
          </div>
        </div>

        {/* Iznos uplate */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Koliko pacijent placa</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={iznos}
              onChange={(e) => setIznos(Number(e.target.value))}
              required
              className="w-full px-3 py-2.5 pr-12 border border-gray-300 rounded-lg text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">EUR</span>
          </div>
        </div>

        {/* Nacin placanja */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nacin placanja *</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNacinPlacanja('gotovina')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all
                ${nacinPlacanja === 'gotovina'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
            >
              Gotovina (Kes)
            </button>
            <button
              type="button"
              onClick={() => setNacinPlacanja('kartica')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all
                ${nacinPlacanja === 'kartica'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
            >
              Kartica
            </button>
          </div>
        </div>

        {/* Fiskalizacija toggle */}
        <div
          onClick={() => setFiskalizuj(!fiskalizuj)}
          className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 cursor-pointer transition-all
            ${fiskalizuj
              ? 'border-amber-400 bg-amber-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
        >
          <div className="flex items-center gap-3">
            <Receipt size={20} className={fiskalizuj ? 'text-amber-600' : 'text-gray-400'} />
            <div>
              <p className={`text-sm font-medium ${fiskalizuj ? 'text-amber-800' : 'text-gray-700'}`}>
                Fiskalizacija
              </p>
              <p className="text-xs text-gray-400">Izdaj fiskalni racun</p>
            </div>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors relative ${fiskalizuj ? 'bg-amber-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${fiskalizuj ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </div>

        {/* Upozorenje za dug */}
        {willCreateDebt && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                Preostaje dug: {remaining.toFixed(2)} EUR
              </p>
              {existingDebt !== null && existingDebt > 0 ? (
                <p className="text-xs text-red-600 mt-0.5">
                  {patient?.ime} {patient?.prezime} vec ima aktivan dug <strong>{existingDebt.toFixed(2)} EUR</strong> —
                  nadovezuje se na njega (novi ukupan: <strong>{(existingDebt + remaining).toFixed(2)} EUR</strong>).
                </p>
              ) : (
                <p className="text-xs text-red-600 mt-0.5">
                  Kreirace se novo dugovanje za {patient?.ime} {patient?.prezime} u iznosu od {remaining.toFixed(2)} EUR.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Napomena */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
          <textarea
            value={napomena}
            onChange={(e) => setNapomena(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Opciona biljeska..."
          />
        </div>

        {/* Dugmad */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Otkazi</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Obrada...' : `Naplati ${iznos.toFixed(2)} EUR`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
