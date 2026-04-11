import { useState, useMemo } from 'react';
import { AlertTriangle, Receipt, Tag } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
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

    // Ako je placeno manje od ukupnog — kreiraj dugovanje automatski
    if (willCreateDebt && appointment.patient_id) {
      const serviceNames = appointment.services?.map((s) => s.naziv).join(', ') || 'Usluge';
      await supabase.from('dugovanja').insert({
        patient_id: appointment.patient_id,
        iznos: zaNaplatu,
        preostalo: remaining,
        opis: `${serviceNames} — placeno ${iznos.toFixed(0)}e od ${zaNaplatu.toFixed(0)}e${popust > 0 ? ` (popust ${popust}%)` : ''}`,
        datum_nastanka: new Date().toISOString().slice(0, 10),
        status: 'aktivan',
        napomena: napomena || null,
      });
    }

    setSaving(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Naplata" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pacijent + usluge */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <p className="font-medium text-gray-900">
            {patient ? `${patient.ime} ${patient.prezime}` : 'Pacijent'}
            {patient && patient.popust > 0 && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                Stalni popust {patient.popust}%
              </span>
            )}
          </p>
          {appointment.services && (
            <div className="space-y-0.5">
              {appointment.services.map((svc) => (
                <div key={svc.id} className="flex justify-between text-gray-600">
                  <span>{svc.naziv} {svc.kolicina > 1 ? `x${svc.kolicina}` : ''}</span>
                  <span>{(svc.cijena * (svc.kolicina || 1)).toFixed(2)} EUR</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* POPUST — prominentan boxed section */}
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4">
          <label className="flex items-center gap-2 mb-2">
            <Tag size={16} className="text-emerald-700" />
            <span className="text-sm font-bold text-emerald-900 uppercase tracking-wider">Popust na racun</span>
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-[140px]">
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
                className="w-full px-4 py-3 pr-10 border-2 border-emerald-400 rounded-lg text-2xl font-bold text-center text-emerald-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-emerald-700 pointer-events-none">%</span>
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
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                Vrati stalni ({patient.popust}%)
              </button>
            )}
            {popust > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPopust(0);
                  setIznos(Math.max(0, bruto - balance.paid));
                }}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Ukloni
              </button>
            )}
          </div>
          <p className="text-[11px] text-emerald-700 mt-2">
            {patient && patient.popust > 0 && popust === patient.popust
              ? `Primijenjen stalni popust pacijenta (${patient.popust}%)`
              : popust > 0
                ? `Popust ce umanjiti racun za ${popustIznos.toFixed(2)} EUR`
                : 'Bez popusta — racun se naplacuje po punoj cijeni'}
          </p>
        </div>

        {/* Sumarni pregled */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>Osnovica:</span>
            <span className="tabular-nums">{bruto.toFixed(2)} EUR</span>
          </div>
          {popust > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Popust −{popust}%:</span>
              <span className="tabular-nums">−{popustIznos.toFixed(2)} EUR</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 border-t border-border pt-1 mt-1">
            <span>Ukupno:</span>
            <span className="tabular-nums">{zaNaplatu.toFixed(2)} EUR</span>
          </div>
          {balance.paid > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Vec placeno:</span>
              <span className="tabular-nums">{balance.paid.toFixed(2)} EUR</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
            <span>Za naplatu:</span>
            <span className="tabular-nums">{preostaloZaNaplatu.toFixed(2)} EUR</span>
          </div>
        </div>

        {/* Iznos */}
        <Input
          label="Koliko pacijent placa? (EUR) *"
          type="number"
          step="0.01"
          min="0.01"
          value={iznos}
          onChange={(e) => setIznos(Number(e.target.value))}
          required
        />

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
              <p className="text-xs text-red-600 mt-0.5">
                Automatski ce se kreirati dugovanje za {patient?.ime} {patient?.prezime} u iznosu od {remaining.toFixed(2)} EUR.
              </p>
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
