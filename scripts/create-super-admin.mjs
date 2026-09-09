import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'SUPER_ADMIN_EMAIL', 'SUPER_ADMIN_PASSWORD']
const missing = required.filter((name) => !process.env[name])
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`)

const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
})

const auth = getAuth(app)
const db = getFirestore(app)
const email = process.env.SUPER_ADMIN_EMAIL.trim().toLowerCase()

let user; let existed = true
try {
  user = await auth.getUserByEmail(email)
} catch (error) {
  if (error.code !== 'auth/user-not-found') throw error
  existed = false
  user = await auth.createUser({
    email,
    password: process.env.SUPER_ADMIN_PASSWORD,
    displayName: process.env.SUPER_ADMIN_DISPLAY_NAME || 'System Administrator',
  })
}

await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), role: 'super_admin' })
await db.doc(`users/${user.uid}`).set({
  uid: user.uid,
  email,
  displayName: user.displayName || process.env.SUPER_ADMIN_DISPLAY_NAME || 'System Administrator',
  role: 'super_admin',
  clinicId: null,
  branchId: null,
  isActive: true,
  permissions: ['*'],
  updatedAt: FieldValue.serverTimestamp(),
  ...(existed ? {} : { createdAt: FieldValue.serverTimestamp() }),
}, { merge: true })

console.log(existed ? 'Super Admin already exists; profile verified.' : 'Super Admin created successfully.')
