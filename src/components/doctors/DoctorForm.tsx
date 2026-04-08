import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { Doctor } from '../../types';

interface DoctorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Doctor, 'id'>) => Promise<void>;
  editDoctor?: Doctor | null;
}

const COLORS = ['#2BA5A5', '#D4AA8C', '#3B82F6', '#8B5CF6', '#EF4444', '#F97316', '#22C55E', '#EC4899'];

export default function DoctorForm({ isOpen, onClose, onSave, editDoctor }: DoctorFormProps) {
  const [ime, setIme] = useState(editDoctor?.ime || '');
  const [prezime, setPrezime] = useState(editDoctor?.prezime || '');
  const [specijalizacija, setSpecijalizacija] = useState(editDoctor?.specijalizacija || '');
  const [titula, setTitula] = useState(editDoctor?.titula || 'Dr');
  const [telefon, setTelefon] = useState(editDoctor?.telefon || '');
  const [email, setEmail] = useState(editDoctor?.email || '');
  const [boja, setBoja] = useState(editDoctor?.boja || '#2BA5A5');
  const [biografija, setBiografija] = useState(editDoctor?.biografija || '');
  const [pin, setPin] = useState(editDoctor?.pin || '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ime || !prezime) return;
    setSaving(true);
    await onSave({
      ime, prezime, specijalizacija, titula, telefon, email, boja, biografija, pin: pin || undefined,
      user_id: editDoctor?.user_id || '',
      aktivan: true,
    } as Omit<Doctor, 'id'>);
    setSaving(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editDoctor ? 'Izmijeni ljekara' : 'Novi ljekar'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Ime *" value={ime} onChange={(e) => setIme(e.target.value)} required />
          <Input label="Prezime *" value={prezime} onChange={(e) => setPrezime(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Titula" value={titula} onChange={(e) => setTitula(e.target.value)} placeholder="Dr" />
          <Input label="Specijalizacija" value={specijalizacija} onChange={(e) => setSpecijalizacija(e.target.value)} placeholder="Dermatologija" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="+38269..." />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Input label="PIN za prijavu na Pregled" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="4-cifreni PIN" />
          <p className="text-xs text-amber-600 mt-1">Doktor koristi ovaj PIN za pristup stranici Pregled</p>
        </div>

        {/* Boja */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Boja u kalendaru</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setBoja(c)}
                className={`w-8 h-8 rounded-full transition-all ${boja === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Biografija</label>
          <textarea
            value={biografija}
            onChange={(e) => setBiografija(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Kratka biografija ljekara..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Otkazi</Button>
          <Button type="submit" disabled={!ime || !prezime || saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editDoctor ? 'Sacuvaj' : 'Dodaj ljekara'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
