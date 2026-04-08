import { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PinGate from '../components/ui/PinGate';
import { useCalendar } from '../contexts/CalendarContext';
import { supabase } from '../lib/supabase';

export default function Establishment() {
  const { rooms } = useCalendar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [estId, setEstId] = useState<string | null>(null);

  const [form, setForm] = useState({
    naziv: '',
    adresa: '',
    grad: '',
    telefon: '',
    email: '',
    pib: '',
    pdv_broj: '',
    logo_url: '',
  });

  useEffect(() => {
    supabase.from('establishments').select('*').limit(1).single()
      .then(({ data }) => {
        if (data) {
          setEstId(data.id);
          setForm({
            naziv: data.naziv || '',
            adresa: data.adresa || '',
            grad: data.grad || '',
            telefon: data.telefon || '',
            email: data.email || '',
            pib: data.pib || '',
            pdv_broj: data.pdv_broj || '',
            logo_url: data.logo_url || '',
          });
        }
        setLoading(false);
      });
  }, []);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const payload = { ...form };
    // Clean empty strings to null
    const cleaned: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(payload)) {
      cleaned[k] = v || null;
    }
    cleaned.naziv = form.naziv; // required

    if (estId) {
      await supabase.from('establishments').update(cleaned).eq('id', estId);
    } else {
      const { data } = await supabase.from('establishments').insert(cleaned).select().single();
      if (data) setEstId(data.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <PinGate title="Ustanova">
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ustanova</h2>
          <p className="text-sm text-gray-500 mt-1">Podaci o ustanovi, ordinacije i oprema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Podaci o ustanovi — editabilno */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Podaci o ustanovi</h3>
          </div>
          <div className="space-y-4">
            <Input label="Naziv ustanove *" value={form.naziv} onChange={(e) => update('naziv', e.target.value)} />
            <Input label="Adresa" value={form.adresa} onChange={(e) => update('adresa', e.target.value)} />
            <Input label="Grad" value={form.grad} onChange={(e) => update('grad', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Telefon" value={form.telefon} onChange={(e) => update('telefon', e.target.value)} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="PIB" value={form.pib} onChange={(e) => update('pib', e.target.value)} />
              <Input label="PDV broj" value={form.pdv_broj} onChange={(e) => update('pdv_broj', e.target.value)} />
            </div>
            <Input label="URL logotipa" value={form.logo_url} onChange={(e) => update('logo_url', e.target.value)} placeholder="https://..." />

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={!form.naziv || saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Sacuvaj
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle size={16} /> Sacuvano
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Ordinacije i oprema */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Ordinacije i oprema</h3>
          <div className="space-y-2">
            {rooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: room.boja }} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{room.naziv}</p>
                    <p className="text-xs text-gray-400 capitalize">{room.tip}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  room.aktivan ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {room.aktivan ? 'Aktivna' : 'Neaktivna'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
    </PinGate>
  );
}
