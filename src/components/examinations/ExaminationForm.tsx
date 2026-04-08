import { useState } from 'react';
import { Save, CheckCircle, Loader2, ShoppingBag } from 'lucide-react';
import Button from '../ui/Button';
import type { Examination, AppointmentService } from '../../types';

interface ExaminationFormProps {
  initialData?: Partial<Examination>;
  onSave: (data: Partial<Examination>, finish: boolean) => Promise<void>;
  saving?: boolean;
  appointmentServices?: AppointmentService[];
  appointmentNapomena?: string;
}

export default function ExaminationForm({ initialData, onSave, saving, appointmentServices, appointmentNapomena }: ExaminationFormProps) {
  // Pre-popuni razlog dolaska sa uslugama iz termina ako nema postojeceg
  const defaultRazlog = initialData?.razlog_dolaska || '';
  const [razlogDolaska, setRazlogDolaska] = useState(defaultRazlog);
  const [nalaz, setNalaz] = useState(initialData?.nalaz || '');
  const [terapija, setTerapija] = useState(initialData?.terapija || '');
  const [preporuke, setPreporuke] = useState(initialData?.preporuke || '');
  const [kontrolniPregled, setKontrolniPregled] = useState(initialData?.kontrolni_pregled || '');
  const [napomena, setNapomena] = useState(initialData?.napomena || '');

  const ukupnaCijena = appointmentServices?.reduce((sum, s) => sum + s.ukupno, 0) || 0;

  function getData(): Partial<Examination> {
    return {
      razlog_dolaska: razlogDolaska || undefined,
      nalaz: nalaz || undefined,
      terapija: terapija || undefined,
      preporuke: preporuke || undefined,
      kontrolni_pregled: kontrolniPregled || undefined,
      napomena: napomena || undefined,
    };
  }

  return (
    <div className="space-y-4">
      {/* Usluge iz termina */}
      {appointmentServices && appointmentServices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={14} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase">Zakazane usluge</span>
          </div>
          <div className="space-y-1">
            {appointmentServices.map((svc) => (
              <div key={svc.id} className="flex justify-between text-sm">
                <span className="text-blue-800">{svc.naziv} {svc.kolicina > 1 ? `x${svc.kolicina}` : ''}</span>
                <span className="font-medium text-blue-900">{svc.ukupno.toFixed(2)} EUR</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold border-t border-blue-200 pt-1 mt-1">
              <span className="text-blue-800">Ukupno</span>
              <span className="text-blue-900">{ukupnaCijena.toFixed(2)} EUR</span>
            </div>
          </div>
        </div>
      )}

      {/* Napomena iz zakazivanja */}
      {appointmentNapomena && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Napomena iz zakazivanja</p>
          <p className="text-sm text-amber-800">{appointmentNapomena}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Razlog dolaska</label>
        <textarea
          value={razlogDolaska}
          onChange={(e) => setRazlogDolaska(e.target.value)}
          rows={2}
          placeholder="Zasto je pacijent dosao..."
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nalaz / Procedura</label>
        <textarea
          value={nalaz}
          onChange={(e) => setNalaz(e.target.value)}
          rows={4}
          placeholder="Opis nalaza, sprovedene procedure, oprema..."
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Terapija</label>
        <textarea
          value={terapija}
          onChange={(e) => setTerapija(e.target.value)}
          rows={3}
          placeholder="Prepisana terapija, lijekovi, doziranje..."
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Preporuke</label>
        <textarea
          value={preporuke}
          onChange={(e) => setPreporuke(e.target.value)}
          rows={3}
          placeholder="Preporuke za pacijenta, sta izbjegavati, njega..."
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kontrolni pregled</label>
        <input
          type="text"
          value={kontrolniPregled}
          onChange={(e) => setKontrolniPregled(e.target.value)}
          placeholder="npr. za 2 nedjelje"
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Interna napomena <span className="text-gray-400 font-normal">(ne stampa se)</span>
        </label>
        <textarea
          value={napomena}
          onChange={(e) => setNapomena(e.target.value)}
          rows={2}
          placeholder="Interne biljeske..."
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-amber-50"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(getData(), false)} disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Sacuvaj
        </Button>
        <Button
          variant="secondary"
          onClick={() => onSave(getData(), true)}
          disabled={saving}
        >
          <CheckCircle size={16} />
          Sacuvaj i zavrsi
        </Button>
      </div>
    </div>
  );
}
