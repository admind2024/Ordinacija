import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { usePatients } from '../../contexts/PatientsContext';
import type { Patient } from '../../types';

interface PatientFormProps {
  isOpen: boolean;
  onClose: () => void;
  editPatient?: Patient | null;
}

const izvorOptions = ['Instagram', 'Facebook', 'Google', 'Preporuka prijatelja', 'Prolaznik', 'Ostalo'];
const polOptions = [
  { value: '', label: 'Izaberite...' },
  { value: 'muski', label: 'Muski' },
  { value: 'zenski', label: 'Zenski' },
  { value: 'ostalo', label: 'Ostalo' },
];
const tagOptions = ['VIP', 'Redovan', 'Djeca', 'Problematican'];

export default function PatientForm({ isOpen, onClose, editPatient }: PatientFormProps) {
  const { createPatient, updatePatient } = usePatients();
  const isEdit = !!editPatient;

  const [form, setForm] = useState({
    ime: editPatient?.ime || '',
    prezime: editPatient?.prezime || '',
    datum_rodjenja: editPatient?.datum_rodjenja || '',
    pol: editPatient?.pol || '',
    ime_roditelja: editPatient?.ime_roditelja || '',
    jmbg: editPatient?.jmbg || '',
    telefon: editPatient?.telefon || '',
    email: editPatient?.email || '',
    adresa: editPatient?.adresa || '',
    grad: editPatient?.grad || '',
    izvor_preporuke: editPatient?.izvor_preporuke || '',
    detalji_preporuke: editPatient?.detalji_preporuke || '',
    napomena: editPatient?.napomena || '',
    osiguranje: editPatient?.osiguranje || '',
    popust: editPatient?.popust || 0,
    pocetno_stanje: editPatient?.pocetno_stanje || 0,
    tagovi: editPatient?.tagovi || [] as string[],
    gdpr_saglasnost: editPatient?.gdpr_saglasnost || false,
  });

  function update(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tagovi: prev.tagovi.includes(tag)
        ? prev.tagovi.filter((t) => t !== tag)
        : [...prev.tagovi, tag],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ime || !form.prezime || !form.telefon) return;

    // Clean empty strings to null for Supabase
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(form)) {
      if (value === '' || value === undefined) {
        cleaned[key] = null;
      } else {
        cleaned[key] = value;
      }
    }
    // Ensure required fields are strings
    cleaned.ime = form.ime;
    cleaned.prezime = form.prezime;
    cleaned.telefon = form.telefon;
    cleaned.saldo = form.pocetno_stanje || 0;

    if (isEdit && editPatient) {
      updatePatient(editPatient.id, cleaned as Partial<Patient>);
    } else {
      createPatient(cleaned as Omit<Patient, 'id' | 'created_at'>);
    }
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Izmijeni pacijenta' : 'Novi pacijent'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Licni podaci */}
        <fieldset>
          <legend className="text-sm font-semibold text-gray-700 mb-3">Licni podaci</legend>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ime *" value={form.ime} onChange={(e) => update('ime', e.target.value)} required />
            <Input label="Prezime *" value={form.prezime} onChange={(e) => update('prezime', e.target.value)} required />
            <Input label="Datum rodjenja" type="date" value={form.datum_rodjenja} onChange={(e) => update('datum_rodjenja', e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pol</label>
              <select
                value={form.pol}
                onChange={(e) => update('pol', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {polOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Input label="Ime roditelja / staratelja" value={form.ime_roditelja} onChange={(e) => update('ime_roditelja', e.target.value)} />
            <Input label="JMBG" value={form.jmbg} onChange={(e) => update('jmbg', e.target.value)} />
          </div>
        </fieldset>

        {/* Kontakt */}
        <fieldset>
          <legend className="text-sm font-semibold text-gray-700 mb-3">Kontakt podaci</legend>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telefon *" value={form.telefon} onChange={(e) => update('telefon', e.target.value)} placeholder="+382 67 ..." required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            <Input label="Adresa" value={form.adresa} onChange={(e) => update('adresa', e.target.value)} />
            <Input label="Grad" value={form.grad} onChange={(e) => update('grad', e.target.value)} />
          </div>
        </fieldset>

        {/* Ostalo */}
        <fieldset>
          <legend className="text-sm font-semibold text-gray-700 mb-3">Ostale informacije</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Izvor preporuke</label>
              <select
                value={form.izvor_preporuke}
                onChange={(e) => update('izvor_preporuke', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Izaberite...</option>
                {izvorOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <Input label="Detalji preporuke" value={form.detalji_preporuke} onChange={(e) => update('detalji_preporuke', e.target.value)} placeholder="Npr. ime osobe, naziv posta..." />
            <Input label="Osiguranje" value={form.osiguranje} onChange={(e) => update('osiguranje', e.target.value)} />
            {!isEdit && (
              <Input label="Pocetno stanje (EUR)" type="number" value={form.pocetno_stanje} onChange={(e) => update('pocetno_stanje', Number(e.target.value))} />
            )}
          </div>

          {/* Popust - istaknut */}
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-green-800 mb-2">Popust na cijenu usluga (%)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                value={form.popust}
                onChange={(e) => update('popust', Number(e.target.value))}
                className="w-24 px-3 py-2 border border-green-300 rounded-lg text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-sm text-green-700">% popusta na sve usluge pri zakazivanju</span>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
            <textarea
              value={form.napomena}
              onChange={(e) => update('napomena', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Interna biljeska..."
            />
          </div>

          {/* Tagovi */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tagovi</label>
            <div className="flex gap-2 flex-wrap">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors
                    ${form.tagovi.includes(tag)
                      ? 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* GDPR */}
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={form.gdpr_saglasnost}
              onChange={(e) => update('gdpr_saglasnost', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">
              Saglasnost za obradu podataka o licnosti (GDPR)
            </span>
          </label>
        </fieldset>

        {/* Dugmad */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" type="button" onClick={onClose}>Otkazi</Button>
          <Button type="submit">{isEdit ? 'Sacuvaj izmjene' : 'Kreiraj pacijenta'}</Button>
        </div>
      </form>
    </Modal>
  );
}
