import { Building2, MapPin, Phone, Mail, Hash } from 'lucide-react';
import Card from '../components/ui/Card';
import { useCalendar } from '../contexts/CalendarContext';

export default function Establishment() {
  const { rooms } = useCalendar();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Ustanova</h2>
        <p className="text-sm text-gray-500 mt-1">Podaci o ustanovi, ordinacije i oprema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Podaci o ustanovi */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Podaci o ustanovi</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Building2 size={16} className="text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">Demo Poliklinika</p>
                <p className="text-xs text-gray-400">Naziv ustanove</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-gray-400" />
              <div>
                <p className="text-gray-700">Bulevar revolucije 1, Niksic, Crna Gora</p>
                <p className="text-xs text-gray-400">Adresa</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-gray-400" />
              <p className="text-gray-700">+382 40 123 456</p>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-gray-400" />
              <p className="text-gray-700">info@demo-poliklinika.me</p>
            </div>
            <div className="flex items-center gap-3">
              <Hash size={16} className="text-gray-400" />
              <div>
                <p className="text-gray-700">PIB: 12345678</p>
                <p className="text-xs text-gray-400">Poreski identifikacioni broj</p>
              </div>
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
  );
}
