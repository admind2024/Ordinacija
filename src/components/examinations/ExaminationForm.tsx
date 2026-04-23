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
  const [razlogDolaska, setRazlogDolaska] = useState(initialData?.razlog_dolaska || '');
  const [nalaz, setNalaz] = useState(initialData?.nalaz || '');
  const [rezultati, setRezultati] = useState(initialData?.rezultati || '');
  const [terapija, setTerapija] = useState(initialData?.terapija || '');
  const [preporuke, setPreporuke] = useState(initialData?.preporuke || '');
  const [kontrolniPregled, setKontrolniPregled] = useState(initialData?.kontrolni_pregled || '');
  const [napomena, setNapomena] = useState(initialData?.napomena || '');

  const ukupnaCijena = appointmentServices?.reduce((sum, s) => sum + s.ukupno, 0) || 0;

  function getData(): Partial<Examination> {
    return {
      razlog_dolaska: razlogDolaska || undefined,
      nalaz: nalaz || undefined,
      rezultati: rezultati || undefined,
      terapija: terapija || undefined,
      preporuke: preporuke || undefined,
      kontrolni_pregled: kontrolniPregled || undefined,
      napomena: napomena || undefined,
    };
  }

  const sectionLabel = 'block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1';
  const taCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none';

  return (
    <div className="space-y-5">
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

      {/* ANAMNEZA I KLINICKI NALAZ */}
      <div className="border border-border rounded-lg p-4 bg-white">
        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-border">
          Anamneza i klinički nalaz
        </h4>
        <div className="space-y-3">
          <div>
            <label className={sectionLabel}>Razlog dolaska / Anamneza</label>
            <textarea
              value={razlogDolaska}
              onChange={(e) => setRazlogDolaska(e.target.value)}
              rows={3}
              placeholder="Zasto je pacijent dosao, heteroanamneza, tegobe..."
              className={taCls}
            />
          </div>
          <div>
            <label className={sectionLabel}>Klinički nalaz</label>
            <textarea
              value={nalaz}
              onChange={(e) => setNalaz(e.target.value)}
              rows={5}
              placeholder="Pri pregledu svijestan, orjentisan... opis po regijama..."
              className={taCls}
            />
          </div>
        </div>
      </div>

      {/* REZULTATI (LABORATORIJSKI I RTG) */}
      <div className="border border-border rounded-lg p-4 bg-white">
        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-border">
          Rezultati (laboratorijski i RTG)
        </h4>
        <textarea
          value={rezultati}
          onChange={(e) => setRezultati(e.target.value)}
          rows={4}
          placeholder="RTG, laboratorijski nalazi, ultrazvuk..."
          className={taCls}
        />
      </div>

      {/* TERAPIJA */}
      <div className="border border-border rounded-lg p-4 bg-white">
        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-border">
          Terapija
        </h4>
        <textarea
          value={terapija}
          onChange={(e) => setTerapija(e.target.value)}
          rows={3}
          placeholder="Prepisana terapija, lijekovi, doziranje..."
          className={taCls}
        />
      </div>

      {/* Preporuke + kontrolni — manje vazno, kompaktnije */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={sectionLabel}>Preporuke</label>
          <textarea
            value={preporuke}
            onChange={(e) => setPreporuke(e.target.value)}
            rows={3}
            placeholder="Preporuke za pacijenta, njega..."
            className={taCls}
          />
        </div>
        <div>
          <label className={sectionLabel}>Kontrolni pregled</label>
          <input
            type="text"
            value={kontrolniPregled}
            onChange={(e) => setKontrolniPregled(e.target.value)}
            placeholder="npr. za 2 nedjelje"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <label className={`${sectionLabel} mt-3`}>
            Interna napomena <span className="text-gray-400 font-normal normal-case">(ne stampa se)</span>
          </label>
          <textarea
            value={napomena}
            onChange={(e) => setNapomena(e.target.value)}
            rows={2}
            placeholder="Interne biljeske..."
            className={`${taCls} bg-amber-50`}
          />
        </div>
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
