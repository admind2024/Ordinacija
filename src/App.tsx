import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CalendarProvider } from './contexts/CalendarContext';
import { PatientsProvider } from './contexts/PatientsContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Patients from './pages/Patients';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Doctors from './pages/Doctors';
import Materials from './pages/Materials';
import Notifications from './pages/Notifications';
import Establishment from './pages/Establishment';
import Settings from './pages/Settings';
import Examinations from './pages/Examinations';
import ServicesPage from './pages/Services';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/kalendar" element={<Calendar />} />
        <Route path="/pacijenti" element={<Patients />} />
        <Route
          path="/naplata"
          element={
            <ProtectedRoute roles={['admin', 'menadzer', 'recepcija']}>
              <Billing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/izvjestaji"
          element={
            <ProtectedRoute roles={['admin', 'menadzer']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ljekari"
          element={
            <ProtectedRoute roles={['admin', 'menadzer']}>
              <Doctors />
            </ProtectedRoute>
          }
        />
        <Route path="/pregled" element={<Examinations />} />
        <Route path="/cjenovnik" element={<ServicesPage />} />
        <Route path="/materijali" element={<Materials />} />
        <Route
          path="/notifikacije"
          element={
            <ProtectedRoute roles={['admin', 'menadzer', 'marketing']}>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ustanova"
          element={
            <ProtectedRoute roles={['admin']}>
              <Establishment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/podesavanja"
          element={
            <ProtectedRoute roles={['admin']}>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CalendarProvider>
          <PatientsProvider>
            <AppRoutes />
          </PatientsProvider>
        </CalendarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
