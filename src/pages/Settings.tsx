import Card from '../components/ui/Card';
import PinGate from '../components/ui/PinGate';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  return (
    <PinGate title="Podesavanja">
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Podesavanja</h2>
          <p className="text-sm text-gray-500 mt-1">Sistemska konfiguracija</p>
        </div>

        <Card>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Trenutni korisnik</h3>
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
      </div>
    </PinGate>
  );
}
