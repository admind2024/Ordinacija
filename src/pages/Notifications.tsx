import { useState } from 'react';
import { Bell, Send, MessageSquare, Mail } from 'lucide-react';
import Card from '../components/ui/Card';

type NotifyTab = 'reminders' | 'campaigns' | 'templates' | 'log';

const demoNotifications = [
  { id: 1, patient: 'Ana Jovanovic', kanal: 'viber', tip: 'podsjetnik', status: 'delivered', datum: '2026-04-05 08:00', sadrzaj: 'Podsjetnik: Termin sutra u 10:00' },
  { id: 2, patient: 'Marko Petrovic', kanal: 'sms', tip: 'potvrda', status: 'delivered', datum: '2026-04-04 14:30', sadrzaj: 'Termin zakazan za 07.04. u 09:00' },
  { id: 3, patient: 'Jelena Vukovic', kanal: 'viber', tip: 'podsjetnik', status: 'failed', datum: '2026-04-04 08:00', sadrzaj: 'Podsjetnik: Termin danas u 11:00' },
  { id: 4, patient: 'Tamara Bulatovic', kanal: 'email', tip: 'post_procedura', status: 'delivered', datum: '2026-04-03 10:00', sadrzaj: 'Kako se osjecate nakon tretmana?' },
  { id: 5, patient: 'Nikola Djukanovic', kanal: 'sms', tip: 'podsjetnik', status: 'sent', datum: '2026-04-05 07:00', sadrzaj: 'Podsjetnik: Termin danas u 09:00' },
];

const kanalIcons = { viber: MessageSquare, sms: Send, email: Mail };
const statusColors = {
  delivered: 'text-green-600 bg-green-100',
  sent: 'text-blue-600 bg-blue-100',
  failed: 'text-red-600 bg-red-100',
  pending: 'text-amber-600 bg-amber-100',
};
const statusLabels = { delivered: 'Isporuceno', sent: 'Poslano', failed: 'Neuspjelo', pending: 'Ceka' };

export default function Notifications() {
  const [tab, setTab] = useState<NotifyTab>('reminders');

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Notifikacije</h2>
        <p className="text-sm text-gray-500 mt-1">Automatski podsjetnici i marketing kampanje</p>
      </div>

      {/* PENDING */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-800">
          <strong>PENDING:</strong> SMS/Viber API konfiguracija (API kljuc, sender ID) — dostaviti naknadno.
          Viber je primarni kanal, SMS je fallback (auto ako Viber nije isporucen za 60 sek).
        </p>
      </div>

      {/* Tabovi */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mb-6">
        {[
          { key: 'reminders' as const, label: 'Podsjetnici' },
          { key: 'campaigns' as const, label: 'Kampanje' },
          { key: 'templates' as const, label: 'Sabloni' },
          { key: 'log' as const, label: 'Log poruka' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'reminders' && (
        <div className="space-y-6">
          {/* Konfiguracija */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Automatski podsjetnici</h3>
            <div className="space-y-3">
              {[
                { name: '24h prije termina', active: true, kanal: 'Viber → SMS fallback' },
                { name: '2h prije termina', active: true, kanal: 'Viber → SMS fallback' },
                { name: 'Potvrda zakazivanja', active: true, kanal: 'Viber + Email' },
                { name: 'Post-proceduralna poruka (1-3 dana)', active: false, kanal: 'Viber' },
                { name: 'Kontrolni pregled podsjetnik', active: false, kanal: 'SMS' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.kanal}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.active ? 'Aktivan' : 'Neaktivan'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Statistika */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-gray-500">Poslano danas</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Isporuceno</p>
              <p className="text-2xl font-bold text-green-600">7</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Neuspjelo</p>
              <p className="text-2xl font-bold text-red-600">1</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">SMS fallback</p>
              <p className="text-2xl font-bold text-amber-600">2</p>
            </Card>
          </div>
        </div>
      )}

      {tab === 'campaigns' && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Send size={48} className="mb-4" />
            <p className="text-lg font-medium">Marketing kampanje</p>
            <p className="text-sm mt-1">Kreiranje kampanja, ciljna grupa, varijable, statistike — u izradi (Faza 2)</p>
          </div>
        </Card>
      )}

      {tab === 'templates' && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquare size={48} className="mb-4" />
            <p className="text-lg font-medium">Sabloni poruka</p>
            <p className="text-sm mt-1">Biblioteka sablona, varijable ({'{ime}'}, {'{datum_termina}'}) — u izradi (Faza 2)</p>
          </div>
        </Card>
      )}

      {tab === 'log' && (
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Log poslanih poruka</h3>
          </div>
          <div className="divide-y divide-border">
            {demoNotifications.map((notif) => {
              const Icon = kanalIcons[notif.kanal as keyof typeof kanalIcons] || Bell;
              const sColor = statusColors[notif.status as keyof typeof statusColors] || statusColors.pending;
              const sLabel = statusLabels[notif.status as keyof typeof statusLabels] || notif.status;

              return (
                <div key={notif.id} className="px-6 py-3 flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{notif.patient}</p>
                    <p className="text-xs text-gray-500 truncate">{notif.sadrzaj}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sColor}`}>{sLabel}</span>
                    <p className="text-xs text-gray-400 mt-1">{notif.datum}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
