import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar, { navigation } from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Pronađi naziv trenutne sekcije iz navigation niza
  const currentNav = navigation.find((n) =>
    n.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(n.path)
  );
  const sectionName = currentNav?.name || 'MOA';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: collapsed ? 64 : 240 }}
      >
        <Header sectionName={sectionName} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
