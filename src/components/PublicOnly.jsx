import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext.jsx'
import { dashboardForRole } from '../lib/routes.js'
export function PublicOnly({ children }) { const { user, profile, loading } = useAuth(); if (loading) return <div className="screen-center">جارٍ التحميل…</div>; return user ? <Navigate to={dashboardForRole(profile?.role)} replace /> : children }
