import { useState } from 'react';
import { Save, CheckCircle, Loader2, ShoppingBag, Printer, X, History, Copy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import TemplatePicker from './TemplatePicker';
import Button from '../ui/Button';
import type { Examination, AppointmentService } from '../../types';

interface ExaminationFormProps {
  initialData?: Partial<Examination>;
  onSave: (data: Partial<Examination>, finish: boolean, print?: boolean) => Promise<void>;
  saving?: boolean;
  appointmentServices?: AppointmentService[];
  appointmentNapomena?: string;
  doctorId?: string;
  previousExam?: Partial<Examination> | null; // posljednji zavrseni pregled pacijenta
}

export default function ExaminationForm({ initialData, onSave, saving, appointmentServices, appointmentNapomena, doctorId, previousExam }: ExaminationFormProps) {
  const [showPrev, setShowPrev] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
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
  const labelRow = 'flex items-center justify-between gap-2 mb-1';

  const prethodnaPolja: { key: keyof Examination; label: string; set: (v: string) => void; cur: string }[] = [
    { key: 'razlog_dolaska', label: 'Anamneza', set: setRazlogDolaska, cur: razlogDolaska },
    { key: 'nalaz', label: 'Klinički nalaz', set: setNalaz, cur: nalaz },
    { key: 'rezultati', label: 'Rezultati', set: setRezultati, cur: rezultati },
    { key: 'terapija', label: 'Terapija', set: setTerapija, cur: terapija },
    { key: 'preporuke', label: 'Preporuke', set: setPreporuke, cur: preporuke },
  ];
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

      {/* Prethodni pregled — za kontrole: vidi i prepisi sta je bilo prosli put */}
      {previousExam && (
        <div className="border border-primary-200 bg-primary-50/50 rounded-lg">
          <button type="button" onClick={() => setShowPrev((v) => !v)} aria-expanded={showPrev}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-primary-800">
            <span className="flex items-center gap-2"><History size={14} /> Prethodni pregled
              {previousExam.datum && <span className="font-normal text-primary-700">· {format(parseISO(previousExam.datum), 'dd.MM.yyyy.')}</span>}
            </span>
            <span className="text-xs">{showPrev ? 'Sakrij' : 'Prikaži'}</span>
          </button>
          {showPrev && (
            <div className="px-4 pb-3 space-y-2">
              {prethodnaPolja.filter((f) => previousExam[f.key]).map((f) => (
                <div key={f.key} className="bg-white border border-border rounded-md p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{f.label}</span>
                    <button type="button"
                      onClick={() => { const t = String(previousExam[f.key]); f.set(f.cur.trim() ? `${f.cur.trimEnd()}\n${t}` : t); }}
                      className="inline-flex items-center gap-1 text-[11px] text-primary-700 hover:underline">
                      <Copy size={11} /> Prepiši
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{String(previousExam[f.key])}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ANAMNEZA I KLINICKI NALAZ */}
      <div className="border border-border rounded-lg p-4 bg-white">
        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-border">
          Anamneza i klinički nalaz
        </h4>
        <div className="space-y-3">
          <div>
            <div className={labelRow}>
              <label className={`${sectionLabel} !mb-0`}>Razlog dolaska / Anamneza</label>
              <TemplatePicker polje="razlog_dolaska" doctorId={doctorId} value={razlogDolaska} onInsert={setRazlogDolaska} />
            </div>
            <textarea
              value={razlogDolaska}
              onChange={(e) => setRazlogDolaska(e.target.value)}
              rows={3}
              placeholder="Zasto je pacijent dosao, heteroanamneza, tegobe..."
              className={taCls}
            />
          </div>
          <div>
            <div className={labelRow}>
              <label className={`${sectionLabel} !mb-0`}>Klinički nalaz</label>
              <TemplatePicker polje="nalaz" doctorId={doctorId} value={nalaz} onInsert={setNalaz} />
            </div>
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
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Rezultati (laboratorijski i RTG)</h4>
          <TemplatePicker polje="rezultati" doctorId={doctorId} value={rezultati} onInsert={setRezultati} />
        </div>
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
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Terapija</h4>
          <TemplatePicker polje="terapija" doctorId={doctorId} value={terapija} onInsert={setTerapija} />
        </div>
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
          <div className={labelRow}>
            <label className={`${sectionLabel} !mb-0`}>Preporuke</label>
            <TemplatePicker polje="preporuke" doctorId={doctorId} value={preporuke} onInsert={setPreporuke} />
          </div>
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

      <div className="flex flex-wrap gap-3 pt-2">
        <Button onClick={() => onSave(getData(), false)} disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Sacuvaj
        </Button>
        <Button
          variant="secondary"
          onClick={() => setConfirmFinish(true)}
          disabled={saving}
        >
          <CheckCircle size={16} />
          Zavrsi pregled
        </Button>
      </div>

      {/* Confirm dialog — zavrsi + opcija stampe */}
      {confirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setConfirmFinish(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                <h3 className="font-semibold text-gray-900">Zavrsi pregled</h3>
              </div>
              <button
                onClick={() => !saving && setConfirmFinish(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-700">Zelite li da stampate nalaz?</p>
              <p className="text-xs text-gray-400 mt-1">Pregled se u oba slucaja cuva i zatvara.</p>
            </div>
            <div className="px-5 py-3 border-t border-border flex flex-wrap gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={async () => { await onSave(getData(), true, false); setConfirmFinish(false); }}
                disabled={saving}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                Ne, samo zatvori
              </Button>
              <Button
                onClick={async () => { await onSave(getData(), true, true); setConfirmFinish(false); }}
                disabled={saving}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                Da, stampaj i zatvori
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
