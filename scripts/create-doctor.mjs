import fs from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
if (!credentialPath) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is required.')

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(credentialPath, 'utf8'))) })
const auth = getAuth()
const db = getFirestore()
const prompt = createInterface({ input: stdin, output: stdout })

const ask = async (label) => {
  const answer = (await prompt.question(`${label}: `)).trim()
  if (!answer) throw new Error(`${label} is required.`)
  return answer
}

try {
  const fullName = await ask('Doctor full name')
  const email = (await ask('Doctor email')).toLowerCase()
  const password = await ask('Temporary password (minimum 8 characters)')
  const specialty = await ask('Specialty')
  const clinicId = await ask('Clinic ID')

  if (password.length < 8) throw new Error('Password must be at least 8 characters.')
  if (!(await db.doc(`clinics/${clinicId}`).get()).exists) throw new Error('Clinic ID was not found.')

  let account
  try {
    account = await auth.getUserByEmail(email)
    throw new Error('An account already exists with this email.')
  } catch (error) {
    if (error.message === 'An account already exists with this email.') throw error
    if (error.code !== 'auth/user-not-found') throw error
    account = await auth.createUser({ email, password, displayName: fullName })
  }

  await auth.setCustomUserClaims(account.uid, { role: 'doctor', clinicId })
  const batch = db.batch()
  batch.set(db.doc(`users/${account.uid}`), {
    uid: account.uid, email, displayName: fullName, fullName, role: 'doctor', clinicId,
    isActive: true, isProfileComplete: false,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  })
  batch.set(db.doc(`doctors/${account.uid}`), {
    userId: account.uid, fullName, specialty, clinicId, bio: '', fee: 0,
    consultationDuration: 30, workingHours: [], isProfileComplete: false,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  })
  await batch.commit()
  console.log(`Doctor account created successfully. UID: ${account.uid}`)
  console.log(`Login email: ${email}`)
  console.log('The doctor must complete their profile and working hours at first login.')
} finally {
  prompt.close()
}
