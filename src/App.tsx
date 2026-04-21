import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CalendarProvider } from './contexts/CalendarContext';
import { PatientsProvider } from './contexts/PatientsContext';
import { BillingProvider } from './contexts/BillingContext';
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
import SurveyPage from './pages/Survey';
import Marketing from './pages/Marketing';
import Establishment from './pages/Establishment';
import Settings from './pages/Settings';
import Examinations from './pages/Examinations';
import Debts from './pages/Debts';
import ServicesPage from './pages/Services';
import SurveyPublic from './pages/SurveyPublic';
import ConfirmAppointment from './pages/ConfirmAppointment';

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
          path="/dugovanja"
          element={
            <ProtectedRoute roles={['admin', 'menadzer', 'recepcija']}>
              <Debts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ankete"
          element={
            <ProtectedRoute roles={['admin', 'menadzer', 'recepcija']}>
              <SurveyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketing"
          element={
            <ProtectedRoute roles={['admin', 'menadzer', 'marketing']}>
              <Marketing />
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
      <Routes>
        {/* Anketa je 100% javna — render prije bilo kakvih providera/auth */}
        <Route path="/anketa/:id" element={<SurveyPublic />} />
        {/* Potvrda dolaska je 100% javna — pacijent klikne link iz SMS-a */}
        <Route path="/potvrda/:token" element={<ConfirmAppointment />} />
        <Route
          path="*"
          element={
            <AuthProvider>
              <CalendarProvider>
                <PatientsProvider>
                  <BillingProvider>
                    <AppRoutes />
                  </BillingProvider>
                </PatientsProvider>
              </CalendarProvider>
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
