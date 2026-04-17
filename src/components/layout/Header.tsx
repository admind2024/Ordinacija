import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Menu } from 'lucide-react';

interface HeaderProps {
  sectionName?: string;
  onOpenMenu?: () => void;
}

export default function Header({ sectionName = 'MOA', onOpenMenu }: HeaderProps) {
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
    <header className="sticky top-0 z-20 h-14 md:h-16 bg-surface border-b border-border flex items-center justify-between px-3 md:px-6 safe-top">
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger — samo na mobilnom */}
        <button
          onClick={onOpenMenu}
          className="md:hidden p-2 -ml-1 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Otvori meni"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-base md:text-lg font-semibold text-gray-900 truncate">{sectionName}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Desktop: puno ime + uloga */}
        <div className="hidden md:flex items-center gap-2 text-sm">
          <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
            <User size={16} />
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-900">{user.ime} {user.prezime}</p>
            <p className="text-xs text-gray-500">{roleLabels[user.uloga] || user.uloga}</p>
          </div>
        </div>

        {/* Mobile: samo inicijali */}
        <div className="md:hidden w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-semibold">
          {user.ime?.charAt(0)}{user.prezime?.charAt(0)}
        </div>

        <button
          onClick={signOut}
          className="p-2 text-gray-400 hover:text-danger rounded-lg hover:bg-gray-100 transition-colors"
          title="Odjavi se"
          aria-label="Odjavi se"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
