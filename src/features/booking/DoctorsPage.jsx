import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeDoctors } from '../../services/appointments.js'
import { useAuth } from '../auth/AuthContext.jsx'

export function DoctorsPage() {
  const { profile } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  useEffect(() => subscribeDoctors(setDoctors, () => {}), [])
  const published = useMemo(() => doctors.filter((doctor) => doctor.isProfileComplete), [doctors])
  const specialties = [...new Set(published.map((doctor) => doctor.specialty).filter(Boolean))]
  const shown = published.filter((doctor) => {
    const query = search.trim().toLowerCase()
    return (!filter || doctor.specialty === filter) && (!query || `${doctor.fullName} ${doctor.specialty}`.toLowerCase().includes(query))
  })

  return <section className="space-y-6" dir="rtl">
    <div><p className="font-bold text-teal-700">الحجز الإلكتروني</p><h1 className="text-3xl font-bold text-slate-900">اختر طبيبك</h1><p className="mt-2 text-slate-500">الأطباء الذين أكملوا ملفاتهم ومواعيدهم المتاحة.</p></div>
    <div className="flex flex-col gap-3 sm:flex-row"><input className="rounded-xl border bg-white p-3 sm:min-w-72" placeholder="ابحث بالاسم أو التخصص" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="flex gap-2 overflow-auto pb-1"><button onClick={() => setFilter('')} className={`rounded-full px-4 py-2 ${!filter ? 'bg-teal-700 text-white' : 'border bg-white'}`}>الكل</button>{specialties.map((specialty) => <button key={specialty} onClick={() => setFilter(specialty)} className={`rounded-full px-4 py-2 ${filter === specialty ? 'bg-teal-700 text-white' : 'border bg-white'}`}>{specialty}</button>)}</div></div>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{shown.map((doctor) => <article key={doctor.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-teal-100 font-bold text-teal-700">{doctor.fullName?.[0]}</div><div><h2 className="font-bold">د. {doctor.fullName}</h2><p className="text-sm text-teal-700">{doctor.specialty}</p></div></div><p className="mt-4 text-sm text-slate-500">{doctor.bio || 'لم يضف الطبيب نبذة بعد.'}</p><div className="mt-4 flex justify-between"><span>{doctor.consultationDuration || 30} دقيقة</span><b>{doctor.fee || 0} ج.م</b></div>{profile?.role === 'patient' && <Link to={`/doctors/${doctor.id}`} className="mt-5 block rounded-xl bg-teal-700 py-2 text-center font-bold text-white">عرض المواعيد</Link>}</article>)}</div>
    {!shown.length && <div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">لا يوجد أطباء متاحون حاليًا.</div>}
  </section>
}
