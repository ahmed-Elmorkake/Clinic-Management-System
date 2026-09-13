import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const hasBase64Credential = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64)
const base64Credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim().replace(/^['"]|['"]$/g, '').replace(/\s+/g, '')
const rawCredential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (hasBase64Credential ? Buffer.from(base64Credential, 'base64').toString('utf8') : '')
if (!rawCredential) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 is required.')
let credential
try {
  credential = JSON.parse(rawCredential)
} catch {
  throw new Error(hasBase64Credential ? 'FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 is invalid. Regenerate it from the complete JSON file and paste it into this variable only.' : 'FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.')
}
const app = getApps()[0] || initializeApp({ credential: cert(credential) })

export const auth = getAuth(app)
export const db = getFirestore(app)
export { FieldValue }
