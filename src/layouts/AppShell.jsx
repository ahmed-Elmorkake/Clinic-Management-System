import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext.jsx'

const navigation = {
  super_admin: [['/admin', '▦', 'لوحة الإدارة'], ['/doctors', '⚕', 'الأطباء']],
  doctor: [['/doctor/dashboard', '◷', 'مواعيدي'], ['/appointments', '▦', 'كل المواعيد']],
  patient: [['/patient/dashboard', '⚕', 'الأطباء والحجز'], ['/appointments', '◷', 'مواعيدي'], ['/profile', '◉', 'ملفي الشخصي']],
}

const roleLabels = { super_admin: 'مدير النظام', doctor: 'طبيب', patient: 'مريض' }

export function AppShell() {
  const { profile, user, logout } = useAuth()
  const name = profile?.displayName || user?.email?.split('@')[0] || 'مستخدم'
  const links = navigation[profile?.role] || []

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><div className="brand-mark">✚</div><div><b>شفاء</b><span>إدارة العيادات</span></div></div>
      <nav className="sidebar-nav" aria-label="التنقل الرئيسي">
        {links.map(([to, icon, label]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}><i>{icon}</i><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar-user"><div className="sidebar-avatar">{name[0]}</div><div className="sidebar-user-text"><strong>{name}</strong><span>{roleLabels[profile?.role] || 'مستخدم'}</span></div><button type="button" className="logout-button" aria-label="تسجيل الخروج" onClick={logout}>⇥</button></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><p className="eyebrow">منصة شفاء</p><h2>مرحبًا، {name.split(' ')[0]}</h2></div><div className="topbar-actions">{profile?.role === 'patient' ? <NavLink to="/profile" className="profile-pill" aria-label="ملفي الشخصي"><span className="profile-dot">{name[0]}</span></NavLink> : <span className="profile-pill" aria-label="الحساب الحالي"><span className="profile-dot">{name[0]}</span></span>}</div></header>
      <main className="page-shell"><Outlet /></main>
    </div>
  </div>
}
