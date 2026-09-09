import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const rawCredential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
if (!rawCredential) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required.')
const credential = JSON.parse(rawCredential)
const app = getApps()[0] || initializeApp({ credential: cert(credential) })

export const auth = getAuth(app)
export const db = getFirestore(app)
export { FieldValue }
