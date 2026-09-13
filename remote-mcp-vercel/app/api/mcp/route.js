import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { z } from 'zod'
import { auth, db, FieldValue } from '../../../lib/firebase.js'
import { asScopeList, verifyToken } from '../../../lib/oauth.js'
import { config } from '../../../lib/config.js'

export const runtime = 'nodejs'

const text = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data })
const failure = (message) => ({ content: [{ type: 'text', text: message }], isError: true })
const clean = (value) => value.trim()

const audit = (action, entityType, entityId, clinicId = null, metadata = {}) => db.collection('auditLogs').add({ actorId: 'claude_remote_mcp', source: 'claude_remote_mcp', action, entityType, entityId, clinicId, metadata, timestamp: FieldValue.serverTimestamp() })

const handler = createMcpHandler((server) => {
  server.registerTool('list_clinics', { title: 'List clinics', description: 'Lists clinics and clinic IDs before creating a doctor.', inputSchema: {} }, async () => {
    const snapshot = await db.collection('clinics').orderBy('name').get()
    return text({ clinics: snapshot.docs.map((item) => ({ clinicId: item.id, name: item.data().name, phone: item.data().phone || null, address: item.data().address || null, status: item.data().status || null })), count: snapshot.size })
  })

  server.registerTool('create_clinic', { title: 'Create clinic', description: 'Creates a new active clinic.', inputSchema: { name: z.string().trim().min(2).max(120), phone: z.string().trim().max(30).optional(), email: z.string().trim().email().optional(), address: z.string().trim().max(300).optional() } }, async ({ name, phone, email, address }) => {
    try {
      const document = await db.collection('clinics').add({ name: clean(name), phone: phone ? clean(phone) : null, email: email ? clean(email).toLowerCase() : null, address: address ? clean(address) : null, status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
      await audit('CLINIC_CREATED', 'clinic', document.id, document.id, { name: clean(name) })
      return text({ success: true, message: 'Clinic added successfully.', clinic: { clinicId: document.id, name: clean(name), status: 'active' } })
    } catch { return failure('Could not create the clinic in Firebase.') }
  })

  server.registerTool('create_doctor', { title: 'Create doctor account', description: 'Creates the doctor Firebase Authentication account and profile. The doctor completes their details and availability at first login.', inputSchema: { fullName: z.string().trim().min(3).max(120), email: z.string().trim().email(), temporaryPassword: z.string().min(8).max(128), specialty: z.string().trim().min(2).max(100), clinicId: z.string().trim().min(1) } }, async ({ fullName, email, temporaryPassword, specialty, clinicId }) => {
    const normalizedEmail = clean(email).toLowerCase(); const normalizedClinicId = clean(clinicId)
    try {
      const clinic = await db.doc(`clinics/${normalizedClinicId}`).get()
      if (!clinic.exists) return failure('Clinic ID was not found. Use list_clinics first.')
      try { await auth.getUserByEmail(normalizedEmail); return failure('An account already exists with this email. No changes were made.') } catch (error) { if (error.code !== 'auth/user-not-found') throw error }
      const account = await auth.createUser({ email: normalizedEmail, password: temporaryPassword, displayName: clean(fullName) })
      try {
        await auth.setCustomUserClaims(account.uid, { role: 'doctor', clinicId: normalizedClinicId })
        const batch = db.batch()
        batch.set(db.doc(`users/${account.uid}`), { uid: account.uid, email: normalizedEmail, displayName: clean(fullName), fullName: clean(fullName), role: 'doctor', clinicId: normalizedClinicId, isActive: true, isProfileComplete: false, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
        batch.set(db.doc(`doctors/${account.uid}`), { userId: account.uid, fullName: clean(fullName), specialty: clean(specialty), clinicId: normalizedClinicId, bio: '', fee: 0, consultationDuration: 30, workingHours: [], isProfileComplete: false, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
        await batch.commit(); await audit('DOCTOR_CREATED', 'doctor', account.uid, normalizedClinicId, { email: normalizedEmail, fullName: clean(fullName), specialty: clean(specialty) })
        return text({ success: true, message: 'Doctor account added successfully. The doctor must complete their profile and working hours on first login.', doctor: { uid: account.uid, fullName: clean(fullName), email: normalizedEmail, specialty: clean(specialty), clinicId: normalizedClinicId, clinicName: clinic.data().name, isProfileComplete: false } })
      } catch (error) { await auth.deleteUser(account.uid).catch(() => {}); throw error }
    } catch { return failure('Could not create the doctor account in Firebase. No account was left active after the failed attempt.') }
  })

  server.registerTool('list_doctors', { title: 'List doctors', description: 'Lists doctors to verify successful additions.', inputSchema: { clinicId: z.string().trim().min(1).optional() } }, async ({ clinicId }) => {
    const query = clinicId ? db.collection('doctors').where('clinicId', '==', clean(clinicId)) : db.collection('doctors')
    const snapshot = await query.get(); const doctors = snapshot.docs.map((item) => ({ uid: item.id, fullName: item.data().fullName, specialty: item.data().specialty, clinicId: item.data().clinicId, isProfileComplete: item.data().isProfileComplete === true })).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
    return text({ doctors, count: doctors.length })
  })
}, { serverInfo: { name: 'shefaa-clinic-manager', version: '1.0.0' } }, { basePath: '/api', disableSse: true, maxDuration: 60 })

const verifyAccessToken = async (_request, bearerToken) => {
  if (!bearerToken) return undefined
  try { const payload = await verifyToken(bearerToken); const scopes = asScopeList(payload.scope); if (payload.type !== 'access_token' || payload.sub !== config.adminEmail || !scopes.includes('shefaa:manage')) return undefined; return { token: bearerToken, clientId: String(payload.sub), scopes, extra: { email: payload.sub } } } catch { return undefined }
}

const secured = withMcpAuth(handler, verifyAccessToken, { required: true, requiredScopes: ['shefaa:manage'], resourceMetadataPath: '/.well-known/oauth-protected-resource', resourceUrl: `${config.origin}/api/mcp` })
export { secured as GET, secured as POST }
