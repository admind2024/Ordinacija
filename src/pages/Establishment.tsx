import { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PinGate from '../components/ui/PinGate';
import { supabase } from '../lib/supabase';

type RoomRow = {
  id: string;
  naziv: string;
  tip: 'ordinacija' | 'oprema';
  boja: string;
  aktivan: boolean;
};

export default function Establishment() {
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

  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [roomDraft, setRoomDraft] = useState<Record<string, string>>({});
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null);
  const [roomsSavedId, setRoomsSavedId] = useState<string | null>(null);

  async function loadRooms() {
    const { data } = await supabase
      .from('rooms')
      .select('id, naziv, tip, boja, aktivan')
      .order('naziv');
    const list = (data || []) as RoomRow[];
    setRooms(list);
    setRoomDraft(Object.fromEntries(list.map((r) => [r.id, r.naziv])));
  }

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
    loadRooms();
  }, []);

  async function saveRoomName(id: string) {
    const naziv = (roomDraft[id] || '').trim();
    if (!naziv) return;
    setSavingRoomId(id);
    const { error } = await supabase.from('rooms').update({ naziv }).eq('id', id);
    setSavingRoomId(null);
    if (!error) {
      setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, naziv } : r)));
      setRoomsSavedId(id);
      setTimeout(() => setRoomsSavedId((cur) => (cur === id ? null : cur)), 2000);
    }
  }

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
          <p className="text-xs text-gray-500 mb-3">Klikni na naziv da ga promijeniš, pa Sacuvaj.</p>
          <div className="space-y-2">
            {rooms.map((room) => {
              const draft = roomDraft[room.id] ?? room.naziv;
              const dirty = draft.trim() !== room.naziv;
              const busy = savingRoomId === room.id;
              return (
                <div key={room.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: room.boja }} />
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setRoomDraft((prev) => ({ ...prev, [room.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && dirty) saveRoomName(room.id); }}
                    className="flex-1 min-w-0 text-sm font-medium text-gray-900 bg-transparent border border-transparent hover:border-border focus:border-primary-500 focus:outline-none rounded px-2 py-1"
                  />
                  <span className="text-xs text-gray-400 capitalize shrink-0">{room.tip}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    room.aktivan ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {room.aktivan ? 'Aktivna' : 'Neaktivna'}
                  </span>
                  {dirty && (
                    <Button onClick={() => saveRoomName(room.id)} disabled={busy} size="sm">
                      {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Sacuvaj
                    </Button>
                  )}
                  {roomsSavedId === room.id && (
                    <CheckCircle size={14} className="text-green-600 shrink-0" />
                  )}
                </div>
              );
            })}
            {rooms.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Nema unijetih ordinacija.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
    </PinGate>
  );
}
