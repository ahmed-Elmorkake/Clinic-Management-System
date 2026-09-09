import { useState } from 'react'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../auth/AuthContext.jsx'

export function PatientProfilePage() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const values = form || { displayName: profile?.displayName || profile?.fullName || '', phone: profile?.phone || '', dateOfBirth: profile?.dateOfBirth || '', gender: profile?.gender || '' }

  const save = async (event) => {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    setMessage('')
    try {
      await updateDoc(doc(db, 'users', user.uid), { ...values, updatedAt: serverTimestamp() })
      setMessage('تم حفظ بياناتك بنجاح.')
    } catch {
      setMessage('تعذر حفظ البيانات. حاول مرة أخرى.')
    } finally { setSaving(false) }
  }

  return <section className="dashboard-page profile-page">
    <div className="page-title"><div><p className="eyebrow">حسابي</p><h1>ملفي الشخصي</h1><p>حدّث بياناتك الشخصية في أي وقت.</p></div></div>
    <form className="panel profile-form" onSubmit={save}>
      <label>الاسم الكامل<input required value={values.displayName} onChange={(e) => setForm({ ...values, displayName: e.target.value })} /></label>
      <label>البريد الإلكتروني<input value={user?.email || ''} disabled /></label>
      <label>رقم الهاتف<input value={values.phone} onChange={(e) => setForm({ ...values, phone: e.target.value })} /></label>
      <label>تاريخ الميلاد<input type="date" value={values.dateOfBirth} onChange={(e) => setForm({ ...values, dateOfBirth: e.target.value })} /></label>
      <label>النوع<select value={values.gender} onChange={(e) => setForm({ ...values, gender: e.target.value })}><option value="">اختر</option><option value="male">ذكر</option><option value="female">أنثى</option></select></label>
      <div className="profile-form-actions"><button disabled={saving} className="primary-button">{saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}</button>{message && <span className="form-message">{message}</span>}</div>
    </form>
  </section>
}
