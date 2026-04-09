import { useState } from 'react';
import { AlertTriangle, Receipt } from 'lucide-react';
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

  const [iznos, setIznos] = useState(balance.remaining > 0 ? balance.remaining : 0);
  const [nacinPlacanja, setNacinPlacanja] = useState<'gotovina' | 'kartica'>('gotovina');
  const [fiskalizuj, setFiskalizuj] = useState(false);
  const [napomena, setNapomena] = useState('');
  const [saving, setSaving] = useState(false);

  const remaining = balance.remaining - iznos;
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
        iznos: balance.remaining,
        preostalo: remaining,
        opis: `${serviceNames} — placeno ${iznos.toFixed(0)}e od ${balance.remaining.toFixed(0)}e`,
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
        {/* Info o terminu */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <p className="font-medium text-gray-900">
            {patient ? `${patient.ime} ${patient.prezime}` : 'Pacijent'}
          </p>
          {appointment.services && (
            <div className="space-y-0.5">
              {appointment.services.map((svc) => (
                <div key={svc.id} className="flex justify-between text-gray-600">
                  <span>{svc.naziv} {svc.kolicina > 1 ? `x${svc.kolicina}` : ''}</span>
                  <span>{svc.ukupno.toFixed(2)} EUR</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-border pt-1 mt-2 flex justify-between font-medium">
            <span>Ukupno:</span>
            <span>{balance.total.toFixed(2)} EUR</span>
          </div>
          {balance.paid > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Vec placeno:</span>
              <span>{balance.paid.toFixed(2)} EUR</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Za naplatu:</span>
            <span>{balance.remaining.toFixed(2)} EUR</span>
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
