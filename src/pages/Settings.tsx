import { Shield, Users, Database, Bell, Globe, Key } from 'lucide-react';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  const settingsSections = [
    {
      title: 'Korisnici i uloge',
      icon: Users,
      description: 'Upravljanje korisnicima, ulogama i pravima pristupa',
      items: ['Admin, Menadzer, Recepcija, Ljekar, Marketing', '2FA za administratorske naloge'],
    },
    {
      title: 'Sigurnost',
      icon: Shield,
      description: 'HTTPS, Row Level Security, audit log, backup',
      items: ['GDPR uskladenost — export i brisanje podataka', 'Dnevni automatski backup', 'Rate limiting na API-ju'],
    },
    {
      title: 'Baza podataka',
      icon: Database,
      description: 'Supabase PostgreSQL konfiguracija',
      items: ['Point-in-time recovery', 'Row Level Security', 'Audit log — svaka promjena se biljezi'],
    },
    {
      title: 'Notifikacije',
      icon: Bell,
      description: 'SMS/Viber/Email provider konfiguracija',
      items: [
        'Viber: Messaggio API — PENDING konfiguracija',
        'SMS: Fallback provider — PENDING API kljuc',
        'Email: ZeptoMail — PENDING konfiguracija',
      ],
    },
    {
      title: 'Integracije',
      icon: Globe,
      description: 'Spoljni sistemi i API-ji',
      items: [
        'EFI / Poreska uprava CG — PENDING certifikat',
        'Google Calendar — Srednji prioritet',
        'Stripe / Monri — Faza 2',
      ],
    },
    {
      title: 'API kljucevi',
      icon: Key,
      description: 'Upravljanje API kljucevima za integracije',
      items: ['Supabase URL i Anon Key', 'SMS/Viber API kljuc', 'EFI certifikat'],
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Podesavanja</h2>
        <p className="text-sm text-gray-500 mt-1">Sistemska podesavanja i konfiguracija</p>
      </div>

      {/* Trenutni korisnik */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-lg">
            {user?.ime?.charAt(0)}{user?.prezime?.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900">{user?.ime} {user?.prezime}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-primary-600 font-medium uppercase">{user?.uloga}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsSections.map((section) => (
          <Card key={section.title}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                <section.icon size={20} className="text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                <ul className="mt-2 space-y-1">
                  {section.items.map((item) => (
                    <li key={item} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                      <span className={item.includes('PENDING') ? 'text-amber-600' : ''}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
