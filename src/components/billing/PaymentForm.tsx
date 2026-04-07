import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useBilling } from '../../contexts/BillingContext';
import type { Appointment, PaymentMethod } from '../../types';
import { usePatients } from '../../contexts/PatientsContext';

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
}

const methodLabels: Record<PaymentMethod, string> = {
  gotovina: 'Gotovina (bez fiskalnog)',
  gotovina_fiskalni: 'Gotovina (fiskalni)',
  kartica_fiskalni: 'Kartica (fiskalni)',
  administrativna_zabrana: 'Administrativna zabrana',
  osiguranje: 'Osiguranje',
  bon: 'Bon / Voucher',
  online: 'Online placanje',
};

export default function PaymentForm({ isOpen, onClose, appointment }: PaymentFormProps) {
  const { patients } = usePatients();
  const { addPayment, getAppointmentBalance } = useBilling();
  const balance = getAppointmentBalance(appointment);
  const patient = patients.find((p) => p.id === appointment.patient_id);

  const [iznos, setIznos] = useState(balance.remaining > 0 ? balance.remaining : 0);
  const [metoda, setMetoda] = useState<PaymentMethod>('gotovina_fiskalni');
  const [napomena, setNapomena] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (iznos <= 0) return;

    addPayment({
      id: `pay-${Date.now()}`,
      appointment_id: appointment.id,
      iznos,
      metoda,
      napomena: napomena || undefined,
      datum: new Date().toISOString(),
      fiskalni_status: metoda.includes('fiskalni') ? 'pending' : undefined,
    });

    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dodaj naplatu" size="md">
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
                  <span>{svc.naziv}</span>
                  <span>{svc.ukupno.toFixed(2)} EUR</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-border pt-1 mt-2 flex justify-between font-medium">
            <span>Ukupno:</span>
            <span>{balance.total.toFixed(2)} EUR</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Placeno:</span>
            <span>{balance.paid.toFixed(2)} EUR</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Preostalo:</span>
            <span>{balance.remaining.toFixed(2)} EUR</span>
          </div>
        </div>

        {/* Iznos */}
        <Input
          label="Iznos naplate (EUR) *"
          type="number"
          step="0.01"
          min="0.01"
          value={iznos}
          onChange={(e) => setIznos(Number(e.target.value))}
          required
        />

        {/* Metoda */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nacin placanja *</label>
          <select
            value={metoda}
            onChange={(e) => setMetoda(e.target.value as PaymentMethod)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {(Object.entries(methodLabels) as [PaymentMethod, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Fiskalni info */}
        {metoda.includes('fiskalni') && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700">
              <strong>PENDING:</strong> Fiskalni racun ce biti automatski generisan nakon integracije sa EFI servisom.
            </p>
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
          <Button type="submit">Naplati {iznos.toFixed(2)} EUR</Button>
        </div>
      </form>
    </Modal>
  );
}
