import { addDoc, collection, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'
export const subscribeDoctors = (done, fail) => onSnapshot(query(collection(db, 'doctors')), (s) => done(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.rating || 0) - (a.rating || 0))), fail)
export const getDoctor = async (id) => { const s = await getDoc(doc(db, 'doctors', id)); return s.exists() ? { id: s.id, ...s.data() } : null }
export const subscribeAppointments = (field, value, done, fail) => onSnapshot(query(collection(db, 'appointments'), where(field, '==', value)), (s) => done(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => `${a.date} ${a.timeSlot}`.localeCompare(`${b.date} ${b.timeSlot}`))), fail)
export const bookAppointment = ({ patient, doctor, date, timeSlot }) => addDoc(collection(db, 'appointments'), { patientId: patient.uid, patientName: patient.displayName || patient.email, doctorId: doctor.id, doctorName: doctor.fullName, specialty: doctor.specialty, clinicId: doctor.clinicId, date, timeSlot, status: 'pending', createdAt: serverTimestamp() })
export const updateAppointmentStatus = (id, status) => updateDoc(doc(db, 'appointments', id), { status, updatedAt: serverTimestamp() })
export const subscribeAvailableSlots = (doctorId, done, fail) => onSnapshot(query(collection(db, 'availableSlots'), where('doctorId', '==', doctorId)), (snapshot) => done(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((slot) => slot.status === 'available').sort((a, b) => `${a.date} ${a.timeSlot}`.localeCompare(`${b.date} ${b.timeSlot}`))), fail)
export const reserveAppointment = async ({ patient, doctor, slot }) => {
  const slotRef = doc(db, 'availableSlots', slot.id)
  const appointmentRef = doc(collection(db, 'appointments'))
  await runTransaction(db, async (transaction) => {
    const currentSlot = await transaction.get(slotRef)
    if (!currentSlot.exists() || currentSlot.data().status !== 'available') throw new Error('SLOT_UNAVAILABLE')
    transaction.update(slotRef, { status: 'booked', bookedAt: serverTimestamp() })
    transaction.set(appointmentRef, { patientId: patient.uid, patientName: patient.displayName || patient.email, doctorId: doctor.id, doctorName: doctor.fullName, specialty: doctor.specialty, clinicId: doctor.clinicId, date: slot.date, timeSlot: slot.timeSlot, status: 'pending', createdAt: serverTimestamp() })
  })
}
