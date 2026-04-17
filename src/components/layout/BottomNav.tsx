import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Bottom tab bar — vidljiv samo na mobilnom (<md).
 * Minimalni set glavnih tabova za brze reakcije; ostalo u hamburger meniju.
 */

interface Tab {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: string[];
}

const TABS: Tab[] = [
  { path: '/',         label: 'Pocetna',  icon: LayoutDashboard, roles: ['admin', 'menadzer', 'recepcija', 'ljekar', 'marketing'] },
  { path: '/kalendar', label: 'Kalendar', icon: CalendarDays,    roles: ['admin', 'menadzer', 'recepcija', 'ljekar'] },
  { path: '/naplata',  label: 'Naplata',  icon: CreditCard,      roles: ['admin', 'menadzer', 'recepcija'] },
];

export default function BottomNav() {
  const { user } = useAuth();
  if (!user) return null;

  const visible = TABS.filter((t) => t.roles.includes(user.uloga));
  if (visible.length === 0) return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-border safe-bottom safe-left safe-right">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}>
        {visible.map((tab) => (
          <li key={tab.path} className="min-w-0">
            <NavLink
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-1.5 xs:py-2 text-[9px] xs:text-[10px] font-medium transition-colors min-w-0
                  ${isActive ? 'text-primary-600' : 'text-gray-500 active:text-gray-900'}`
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="truncate max-w-full px-0.5">{tab.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
