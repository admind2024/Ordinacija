import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  CalendarDays,
  Users,
  CreditCard,
  BarChart3,
  Stethoscope,
  Settings,
  Bell,
  LayoutDashboard,
  Package,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'menadzer', 'recepcija', 'ljekar'] },
  { name: 'Kalendar', path: '/kalendar', icon: CalendarDays, roles: ['admin', 'menadzer', 'recepcija', 'ljekar'] },
  { name: 'Pacijenti', path: '/pacijenti', icon: Users, roles: ['admin', 'menadzer', 'recepcija', 'ljekar'] },
  { name: 'Naplata', path: '/naplata', icon: CreditCard, roles: ['admin', 'menadzer', 'recepcija'] },
  { name: 'Izvjestaji', path: '/izvjestaji', icon: BarChart3, roles: ['admin', 'menadzer'] },
  { name: 'Ljekari', path: '/ljekari', icon: Stethoscope, roles: ['admin', 'menadzer'] },
  { name: 'Materijali', path: '/materijali', icon: Package, roles: ['admin', 'menadzer', 'ljekar'] },
  { name: 'Notifikacije', path: '/notifikacije', icon: Bell, roles: ['admin', 'menadzer', 'marketing'] },
  { name: 'Ustanova', path: '/ustanova', icon: Building2, roles: ['admin'] },
  { name: 'Podesavanja', path: '/podesavanja', icon: Settings, roles: ['admin'] },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const visibleNav = navigation.filter(
    (item) => user && item.roles.includes(user.uloga)
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-sidebar text-white z-40 flex flex-col transition-all duration-300
        ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
          M
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm truncate">Med Platforma</span>
        )}
      </div>

      {/* Navigacija */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {visibleNav.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
                  }`
                }
                title={collapsed ? item.name : undefined}
              >
                <item.icon size={20} className="shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-white/10 text-gray-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
