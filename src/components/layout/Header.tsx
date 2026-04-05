import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    menadzer: 'Menadzer',
    recepcija: 'Recepcija',
    ljekar: 'Ljekar',
    marketing: 'Marketing',
  };

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Medicinska Platforma</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
            <User size={16} />
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-900">{user.ime} {user.prezime}</p>
            <p className="text-xs text-gray-500">{roleLabels[user.uloga] || user.uloga}</p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="p-2 text-gray-400 hover:text-danger rounded-lg hover:bg-gray-100 transition-colors"
          title="Odjavi se"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
