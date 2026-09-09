import fs from 'node:fs'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
if (!credentialPath) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is required.')
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(credentialPath, 'utf8'))) })

const db = getFirestore()
const auth = getAuth()
const demoDoctorIds = ['demo-cardiology', 'demo-dermatology', 'demo-pediatrics']
const batch = db.batch()
demoDoctorIds.forEach((id) => batch.delete(db.doc(`doctors/${id}`)))
await batch.commit()

try {
  const account = await auth.getUserByEmail('doctor.test.shefaa@example.com')
  await db.doc(`doctors/${account.uid}`).delete()
  await db.doc(`users/${account.uid}`).delete()
  await auth.deleteUser(account.uid)
} catch (error) {
  if (error.code !== 'auth/user-not-found') throw error
}

console.log('Removed demo doctor profiles and the test doctor account.')
