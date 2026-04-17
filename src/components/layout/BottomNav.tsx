import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, CreditCard, ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Bottom tab bar — vidljiv samo na mobilnom (<md).
 * 5 glavnih sekcija filtrirane po ulozi korisnika.
 */

interface Tab {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: string[];
}

const TABS: Tab[] = [
  { path: '/',          label: 'Pocetna',   icon: LayoutDashboard, roles: ['admin', 'menadzer', 'recepcija', 'ljekar'] },
  { path: '/kalendar',  label: 'Kalendar',  icon: CalendarDays,    roles: ['admin', 'menadzer', 'recepcija', 'ljekar'] },
  { path: '/pacijenti', label: 'Pacijenti', icon: Users,           roles: ['admin', 'menadzer', 'recepcija', 'ljekar'] },
  { path: '/naplata',   label: 'Naplata',   icon: CreditCard,      roles: ['admin', 'menadzer', 'recepcija'] },
  { path: '/pregled',   label: 'Pregled',   icon: ClipboardList,   roles: ['admin', 'menadzer', 'ljekar'] },
];

export default function BottomNav() {
  const { user } = useAuth();
  if (!user) return null;

  const visible = TABS.filter((t) => t.roles.includes(user.uloga)).slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-border safe-bottom">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}>
        {visible.map((tab) => (
          <li key={tab.path}>
            <NavLink
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors
                  ${isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-700'}`
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={22} strokeWidth={isActive ? 2.25 : 2} />
                  <span className="truncate max-w-full px-1">{tab.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
