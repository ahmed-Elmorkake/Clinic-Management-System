import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './features/auth/AuthContext.jsx'
import { AppShell } from './layouts/AppShell.jsx'
import { LoginPage } from './features/auth/LoginPage.jsx'
import { RegisterPage } from './features/auth/RegisterPage.jsx'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage.jsx'
import { LandingPage } from './features/landing/LandingPage.jsx'
import { DashboardPage } from './features/dashboard/DashboardPage.jsx'
import { AdminPage } from './features/admin/AdminPage.jsx'
import { PatientsPage } from './features/patients/PatientsPage.jsx'
import { AppointmentsPage } from './features/appointments/AppointmentsPage.jsx'
import { DoctorsPage } from './features/booking/DoctorsPage.jsx'
import { DoctorDetailsPage } from './features/booking/DoctorDetailsPage.jsx'
import { DoctorOnboardingPage } from './features/doctor/DoctorOnboardingPage.jsx'
import { DoctorDashboardPage } from './features/doctor/DoctorDashboardPage.jsx'
import { PatientProfilePage } from './features/patient/PatientProfilePage.jsx'
import { PublicOnly } from './components/PublicOnly.jsx'

function roleHome(role) {
  if (role === 'super_admin') return '/admin'
  if (role === 'doctor') return '/doctor/dashboard'
  return '/patient/dashboard'
}

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="screen-center">جارٍ التحميل…</div>
  return user ? children : <Navigate to="/login" replace />
}

function RoleOnly({ role, children }) {
  const { profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="screen-center">جارٍ التحقق…</div>
  if (profile?.role !== role) return <Navigate to={roleHome(profile?.role)} replace />
  if (role === 'doctor' && !profile?.isProfileComplete && location.pathname !== '/doctor/onboarding') return <Navigate to="/doctor/onboarding" replace />
  return children
}

function RolesOnly({ roles, children }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="screen-center">جارٍ التحقق…</div>
  return roles.includes(profile?.role) ? children : <Navigate to={roleHome(profile?.role)} replace />
}

export default function App() {
  return <Routes>
    <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
    <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
    <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
    <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
    <Route path="/doctor/onboarding" element={<Protected><RoleOnly role="doctor"><DoctorOnboardingPage /></RoleOnly></Protected>} />
    <Route path="/" element={<Protected><AppShell /></Protected>}>
      <Route path="dashboard" element={<RolesOnly roles={['super_admin']}><DashboardPage /></RolesOnly>} />
      <Route path="admin" element={<RoleOnly role="super_admin"><AdminPage /></RoleOnly>} />
      <Route path="doctors" element={<RolesOnly roles={['super_admin', 'patient']}><DoctorsPage /></RolesOnly>} />
      <Route path="doctors/:doctorId" element={<RoleOnly role="patient"><DoctorDetailsPage /></RoleOnly>} />
      <Route path="patients" element={<RolesOnly roles={['super_admin', 'doctor']}><PatientsPage /></RolesOnly>} />
      <Route path="appointments" element={<RolesOnly roles={['super_admin', 'doctor', 'patient']}><AppointmentsPage /></RolesOnly>} />
      <Route path="profile" element={<RoleOnly role="patient"><PatientProfilePage /></RoleOnly>} />
      <Route path="clinic/dashboard" element={<RoleOnly role="super_admin"><DashboardPage /></RoleOnly>} />
      <Route path="doctor/dashboard" element={<RoleOnly role="doctor"><DoctorDashboardPage /></RoleOnly>} />
      <Route path="patient/dashboard" element={<RoleOnly role="patient"><DoctorsPage /></RoleOnly>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
