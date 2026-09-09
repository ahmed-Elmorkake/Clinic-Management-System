/* global require, exports */
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

initializeApp()
const auth = getAuth()
const db = getFirestore()

async function callerProfile(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication is required.')
  const snapshot = await db.doc(`users/${request.auth.uid}`).get()
  if (!snapshot.exists || snapshot.data().isActive !== true) throw new HttpsError('permission-denied', 'Active profile is required.')
  return { uid: request.auth.uid, ...snapshot.data() }
}

function assertRole(profile, roles) {
  if (!roles.includes(profile.role)) throw new HttpsError('permission-denied', 'Insufficient privileges.')
}

function cleanText(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new HttpsError('invalid-argument', `${name} is required.`)
  return value.trim()
}

async function recordAudit(actorId, action, entityType, entityId, clinicId = null) {
  await db.collection('auditLogs').add({ actorId, action, entityType, entityId, clinicId, timestamp: FieldValue.serverTimestamp() })
}

async function provisionUser({ email, displayName, phone, role, clinicId, branchId, actorId }) {
  const normalizedEmail = cleanText(email, 'email').toLowerCase()
  let account
  try { account = await auth.getUserByEmail(normalizedEmail) } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error
    // Password is generated only in server memory; the user receives a password-reset setup link.
    account = await auth.createUser({ email: normalizedEmail, displayName: cleanText(displayName, 'displayName'), password: `${require('crypto').randomBytes(32).toString('base64url')}Aa1!`, emailVerified: false })
  }
  await auth.setCustomUserClaims(account.uid, { ...(account.customClaims || {}), role, clinicId })
  await db.doc(`users/${account.uid}`).set({ uid: account.uid, email: normalizedEmail, displayName: cleanText(displayName, 'displayName'), phone: cleanText(phone, 'phone'), role, clinicId, branchId: branchId || null, isActive: true, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp(), createdBy: actorId }, { merge: true })
  const setupLink = await auth.generatePasswordResetLink(normalizedEmail)
  return { uid: account.uid, setupLink }
}

exports.createClinic = onCall(async (request) => {
  const profile = await callerProfile(request); assertRole(profile, ['super_admin'])
  const data = request.data || {}
  const clinic = await db.collection('clinics').add({ name: cleanText(data.name, 'name'), phone: data.phone?.trim() || null, email: data.email?.trim().toLowerCase() || null, address: data.address?.trim() || null, status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: profile.uid })
  await recordAudit(profile.uid, 'CLINIC_CREATED', 'clinic', clinic.id)
  return { clinicId: clinic.id }
})

exports.createClinicAdmin = onCall(async (request) => {
  const profile = await callerProfile(request); assertRole(profile, ['super_admin'])
  const data = request.data || {}; const clinicId = cleanText(data.clinicId, 'clinicId')
  if (!(await db.doc(`clinics/${clinicId}`).get()).exists) throw new HttpsError('not-found', 'Clinic not found.')
  const result = await provisionUser({ ...data, role: 'clinic_admin', clinicId, branchId: null, actorId: profile.uid })
  await recordAudit(profile.uid, 'CLINIC_ADMIN_CREATED', 'user', result.uid, clinicId)
  return result
})

exports.createDoctor = onCall(async (request) => {
  const profile = await callerProfile(request); assertRole(profile, ['super_admin'])
  const data = request.data || {}; const email = cleanText(data.email, 'email').toLowerCase(); const password = cleanText(data.password, 'password')
  if (password.length < 8) throw new HttpsError('invalid-argument', 'Password must be at least 8 characters.')
  let account
  try { account = await auth.getUserByEmail(email); throw new HttpsError('already-exists', 'Email already exists.') } catch (error) { if (error.code !== 'auth/user-not-found') throw error; account = await auth.createUser({ email, password, displayName: cleanText(data.fullName, 'fullName') }) }
  const specialty = cleanText(data.specialty, 'specialty'); const clinicId = cleanText(data.clinicId, 'clinicId')
  await auth.setCustomUserClaims(account.uid, { role: 'doctor', clinicId })
  await db.doc(`users/${account.uid}`).set({ uid: account.uid, email, displayName: data.fullName.trim(), fullName: data.fullName.trim(), role: 'doctor', clinicId, isActive: true, isProfileComplete: false, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: profile.uid }, { merge: true })
  await db.doc(`doctors/${account.uid}`).set({ userId: account.uid, fullName: data.fullName.trim(), specialty, clinicId, bio: '', fee: 0, consultationDuration: 30, workingHours: [], isProfileComplete: false, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  await recordAudit(profile.uid, 'DOCTOR_CREATED', 'doctor', account.uid, clinicId)
  return { uid: account.uid }
})

exports.inviteClinicStaff = onCall(async (request) => {
  const profile = await callerProfile(request); assertRole(profile, ['clinic_admin'])
  const data = request.data || {}; if (!['doctor', 'receptionist'].includes(data.role)) throw new HttpsError('invalid-argument', 'Unsupported staff role.')
  let branchId = data.branchId || null
  if (branchId) { const branch = await db.doc(`branches/${branchId}`).get(); if (!branch.exists || branch.data().clinicId !== profile.clinicId) throw new HttpsError('permission-denied', 'Branch is outside your clinic.') }
  const result = await provisionUser({ ...data, role: data.role, clinicId: profile.clinicId, branchId, actorId: profile.uid })
  await recordAudit(profile.uid, data.role === 'doctor' ? 'DOCTOR_INVITED' : 'RECEPTIONIST_INVITED', 'user', result.uid, profile.clinicId)
  return result
})

exports.setUserActive = onCall(async (request) => {
  const profile = await callerProfile(request); const data = request.data || {}; const targetId = cleanText(data.uid, 'uid')
  const target = await db.doc(`users/${targetId}`).get(); if (!target.exists) throw new HttpsError('not-found', 'User not found.')
  const targetProfile = target.data(); const canManage = profile.role === 'super_admin' || (profile.role === 'clinic_admin' && targetProfile.clinicId === profile.clinicId && ['doctor', 'receptionist'].includes(targetProfile.role))
  if (!canManage || targetProfile.role === 'super_admin') throw new HttpsError('permission-denied', 'You cannot modify this account.')
  await db.doc(`users/${targetId}`).update({ isActive: data.isActive === true, updatedAt: FieldValue.serverTimestamp() })
  await auth.updateUser(targetId, { disabled: data.isActive !== true })
  await recordAudit(profile.uid, data.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'user', targetId, targetProfile.clinicId || null)
  return { ok: true }
})
