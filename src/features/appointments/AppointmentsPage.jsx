import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { subscribeAppointments } from '../../services/appointments.js'

const labels = { pending: 'قيد الانتظار', confirmed: 'مؤكد', completed: 'مكتمل', cancelled: 'ملغي' }

export function AppointmentsPage() {
  const { user, profile } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    const field = profile?.role === 'patient' ? 'patientId' : profile?.role === 'doctor' ? 'doctorId' : 'clinicId'
    const value = profile?.role === 'patient' ? user.uid : profile?.role === 'doctor' ? user.uid : profile?.clinicId
    if (!value) return undefined
    return subscribeAppointments(field, value, setAppointments, () => setError('تعذر تحميل المواعيد الآن.'))
  }, [user, profile?.role, profile?.clinicId])

  const isPatient = profile?.role === 'patient'
  const title = isPatient ? 'مواعيدي' : 'المواعيد'
  const description = isPatient ? 'هذه القائمة تعرض حجوزاتك أنت فقط.' : 'تابع حجوزات العيادة وحالاتها.'
  const shown = useMemo(() => appointments, [appointments])

  return <section className="dashboard-page">
    <div className="page-title"><div><p className="eyebrow">منصة شفاء</p><h1>{title}</h1><p>{description}</p></div></div>
    <section className="panel">
      {error && <p className="alert">{error}</p>}
      {!error && shown.length === 0 && <p className="empty-copy">لا توجد مواعيد مسجلة حتى الآن.</p>}
      {shown.length > 0 && <div className="table-wrap"><table><thead><tr><th>الطبيب</th><th>التخصص</th><th>التاريخ</th><th>الوقت</th><th>الحالة</th></tr></thead><tbody>{shown.map((appointment) => <tr key={appointment.id}><td>{appointment.doctorName || '—'}</td><td>{appointment.specialty || '—'}</td><td>{appointment.date || '—'}</td><td>{appointment.timeSlot || '—'}</td><td><span className={`status-badge ${appointment.status || 'pending'}`}>{labels[appointment.status] || appointment.status}</span></td></tr>)}</tbody></table></div>}
    </section>
  </section>
}
