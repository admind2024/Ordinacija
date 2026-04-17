import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar, { navigation } from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Zatvori mobile drawer pri promjeni rute
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Pronađi naziv trenutne sekcije
  const currentNav = navigation.find((n) =>
    n.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(n.path)
  );
  const sectionName = currentNav?.name || 'MOA';

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content — na mobilnom full-width, na desktopu offset za sidebar */}
      <div className={`transition-[margin] duration-300 overflow-x-hidden ${collapsed ? 'md:ml-16' : 'md:ml-60'}`}>
        <Header sectionName={sectionName} onOpenMenu={() => setMobileOpen(true)} />

        {/* Donji padding = BottomNav visina + safe-area na mobilnom; obicno na desktopu */}
        <main className="p-3 md:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
