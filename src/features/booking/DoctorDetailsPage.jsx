import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useParams } from 'react-router-dom'
import { db } from '../../firebase.js'
import { reserveAppointment, subscribeAvailableSlots } from '../../services/appointments.js'
import { useAuth } from '../auth/AuthContext.jsx'

export function DoctorDetailsPage() {
  const { doctorId } = useParams()
  const { user, profile } = useAuth()
  const [doctor, setDoctor] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [message, setMessage] = useState('')
  const [bookingId, setBookingId] = useState('')

  useEffect(() => onSnapshot(doc(db, 'doctors', doctorId), (snapshot) => setDoctor(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null)), [doctorId])
  useEffect(() => subscribeAvailableSlots(doctorId, setSlots, () => setMessage('تعذر تحميل المواعيد المتاحة.')), [doctorId])
  const dates = useMemo(() => [...new Set(slots.map((slot) => slot.date))], [slots])
  const activeDate = dates.includes(selectedDate) ? selectedDate : dates[0] || ''
  const dateSlots = slots.filter((slot) => slot.date === activeDate)

  const book = async (slot) => {
    if (!doctor || !user) return
    setBookingId(slot.id); setMessage('')
    try { await reserveAppointment({ patient: { uid: user.uid, email: user.email, displayName: profile?.displayName }, doctor, slot }); setMessage('تم حجز الموعد بنجاح. ستجده الآن في صفحة مواعيدي.') }
    catch (error) { setMessage(error.message === 'SLOT_UNAVAILABLE' ? 'هذا الموعد حُجز للتو. اختر موعدًا آخر.' : 'تعذر إتمام الحجز. حاول مرة أخرى.') }
    finally { setBookingId('') }
  }

  if (!doctor) return <p className="p-8 text-slate-500" dir="rtl">جارٍ تحميل بيانات الطبيب…</p>
  return <section className="space-y-6" dir="rtl"><article className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-teal-700">{doctor.specialty}</p><h1 className="mt-1 text-3xl font-bold">د. {doctor.fullName}</h1><p className="mt-4 max-w-2xl text-slate-600">{doctor.bio}</p><div className="mt-5 flex gap-8 text-sm"><span>سعر الكشف: <b>{doctor.fee} ج.م</b></span><span>مدة الكشف: <b>{doctor.consultationDuration || 30} دقيقة</b></span></div></article><section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">اختر موعدًا متاحًا</h2>{message && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-amber-800">{message}</p>}{dates.length === 0 ? <p className="mt-4 text-slate-500">لا توجد مواعيد متاحة حاليًا.</p> : <><div className="mt-5 flex gap-2 overflow-auto pb-2">{dates.map((date) => <button key={date} onClick={() => setSelectedDate(date)} className={`rounded-xl px-4 py-2 ${date === activeDate ? 'bg-teal-700 text-white' : 'border bg-white'}`}>{date}</button>)}</div><div className="mt-4 flex flex-wrap gap-3">{dateSlots.map((slot) => <button disabled={bookingId === slot.id} key={slot.id} onClick={() => book(slot)} className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 font-bold text-teal-800 disabled:opacity-50">{bookingId === slot.id ? 'جارٍ الحجز…' : slot.timeSlot}</button>)}</div></>}</section></section>
}
