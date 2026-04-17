import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  CalendarDays,
  Users,
  CreditCard,
  BarChart3,
  Stethoscope,
  Settings,
  Megaphone,
  ClipboardCheck,
  Wallet,
  LayoutDashboard,
  Package,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ListOrdered,
  X,
} from 'lucide-react';

export const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'menadzer', 'recepcija', 'ljekar'] },
  { name: 'Kalendar', path: '/kalendar', icon: CalendarDays, roles: ['admin', 'menadzer', 'recepcija', 'ljekar'] },
  { name: 'Pacijenti', path: '/pacijenti', icon: Users, roles: ['admin', 'menadzer', 'recepcija', 'ljekar'] },
  { name: 'Pregled', path: '/pregled', icon: ClipboardList, roles: ['admin', 'menadzer', 'ljekar'] },
  { name: 'Naplata', path: '/naplata', icon: CreditCard, roles: ['admin', 'menadzer', 'recepcija'] },
  { name: 'Cjenovnik', path: '/cjenovnik', icon: ListOrdered, roles: ['admin', 'menadzer'] },
  { name: 'Izvjestaji', path: '/izvjestaji', icon: BarChart3, roles: ['admin', 'menadzer'] },
  { name: 'Osoblje', path: '/ljekari', icon: Stethoscope, roles: ['admin', 'menadzer'] },
  { name: 'Materijali', path: '/materijali', icon: Package, roles: ['admin', 'menadzer', 'ljekar'] },
  { name: 'Dugovanja', path: '/dugovanja', icon: Wallet, roles: ['admin', 'menadzer', 'recepcija'] },
  { name: 'Ankete', path: '/ankete', icon: ClipboardCheck, roles: ['admin', 'menadzer', 'recepcija'] },
  { name: 'Marketing', path: '/marketing', icon: Megaphone, roles: ['admin', 'menadzer', 'marketing'] },
  { name: 'Ustanova', path: '/ustanova', icon: Building2, roles: ['admin'] },
  { name: 'Podesavanja', path: '/podesavanja', icon: Settings, roles: ['admin'] },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const { user } = useAuth();

  const visibleNav = navigation.filter(
    (item) => user && item.roles.includes(user.uloga)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-full bg-sidebar text-white z-50 flex flex-col transition-transform duration-300 safe-top safe-bottom
          ${collapsed ? 'md:w-16' : 'md:w-60'}
          w-[85vw] max-w-[280px]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo + mobile close */}
        <div className={`flex items-center h-16 border-b border-white/10 shrink-0 ${collapsed ? 'md:justify-center md:px-2' : 'px-4'} justify-between gap-3 px-4`}>
          <div className={`flex items-center ${collapsed ? 'md:gap-0' : 'gap-3'} gap-3 min-w-0`}>
            <img
              src="https://pedgschrivtpbzcoqniu.supabase.co/storage/v1/object/public/Razno/MOA%20LOGO%201.png"
              alt="MOA"
              className={`object-contain shrink-0 ${collapsed ? 'md:h-9' : 'h-11'} h-11`}
            />
            <span className={`font-semibold text-sm truncate ${collapsed ? 'md:hidden' : ''}`}>MOA</span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="md:hidden p-2 -mr-2 text-white/70 hover:text-white"
            aria-label="Zatvori meni"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigacija */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {visibleNav.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onMobileClose}
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
                  <span className={collapsed ? 'md:hidden' : ''}>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Collapse toggle — samo desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center h-12 border-t border-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
          aria-label={collapsed ? 'Prosiri meni' : 'Suzi meni'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>
    </>
  );
}
