#!/usr/bin/env node
import fs from 'node:fs'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'

const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
if (!credentialPath) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is required.')
if (!fs.existsSync(credentialPath)) throw new Error('The Firebase service-account file was not found.')

const credential = JSON.parse(fs.readFileSync(credentialPath, 'utf8'))
initializeApp({ credential: cert(credential) })

const auth = getAuth()
const db = getFirestore()
const server = new McpServer({ name: 'shefaa-clinic-manager', version: '1.0.0' })

const asText = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value })
const failure = (message) => ({ content: [{ type: 'text', text: message }], isError: true })
const clean = (value) => value.trim()

async function writeAudit(action, entityType, entityId, clinicId = null, metadata = {}) {
  await db.collection('auditLogs').add({
    actorId: 'claude_desktop_mcp', source: 'claude_desktop_mcp', action, entityType, entityId, clinicId,
    metadata, timestamp: FieldValue.serverTimestamp(),
  })
}

server.registerTool('list_clinics', {
  title: 'List clinics',
  description: 'Lists existing clinics with their clinicId. Use this before create_doctor when the clinic is not known.',
  inputSchema: {},
}, async () => {
  try {
    const snapshot = await db.collection('clinics').orderBy('name').get()
    return asText({ clinics: snapshot.docs.map((item) => ({ clinicId: item.id, name: item.data().name, phone: item.data().phone || null, email: item.data().email || null, address: item.data().address || null, status: item.data().status || null })), count: snapshot.size })
  } catch {
    return failure('Could not load clinics from Firebase.')
  }
})

server.registerTool('create_clinic', {
  title: 'Create clinic',
  description: 'Creates a new active clinic. Ask for its name before calling this tool.',
  inputSchema: {
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email().optional(),
    address: z.string().trim().max(300).optional(),
  },
}, async ({ name, phone, email, address }) => {
  try {
    const document = await db.collection('clinics').add({
      name: clean(name), phone: phone ? clean(phone) : null, email: email ? clean(email).toLowerCase() : null,
      address: address ? clean(address) : null, status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    })
    await writeAudit('CLINIC_CREATED', 'clinic', document.id, document.id, { name: clean(name) })
    return asText({ success: true, message: 'Clinic added successfully.', clinic: { clinicId: document.id, name: clean(name), status: 'active' } })
  } catch {
    return failure('Could not create the clinic in Firebase.')
  }
})

server.registerTool('create_doctor', {
  title: 'Create doctor account',
  description: 'Creates a Firebase Authentication account and doctor profile. The doctor must complete their profile and availability on first login. This action cannot be undone automatically.',
  inputSchema: {
    fullName: z.string().trim().min(3).max(120),
    email: z.string().trim().email(),
    temporaryPassword: z.string().min(8).max(128),
    specialty: z.string().trim().min(2).max(100),
    clinicId: z.string().trim().min(1),
  },
}, async ({ fullName, email, temporaryPassword, specialty, clinicId }) => {
  const normalizedEmail = clean(email).toLowerCase()
  const normalizedClinicId = clean(clinicId)
  try {
    const clinic = await db.doc(`clinics/${normalizedClinicId}`).get()
    if (!clinic.exists) return failure('Clinic ID was not found. Call list_clinics and use a valid clinicId.')
    try {
      await auth.getUserByEmail(normalizedEmail)
      return failure('A Firebase Authentication account already exists with this email. No changes were made.')
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error
    }

    const account = await auth.createUser({ email: normalizedEmail, password: temporaryPassword, displayName: clean(fullName) })
    try {
      await auth.setCustomUserClaims(account.uid, { role: 'doctor', clinicId: normalizedClinicId })
      const batch = db.batch()
      batch.set(db.doc(`users/${account.uid}`), {
        uid: account.uid, email: normalizedEmail, displayName: clean(fullName), fullName: clean(fullName), role: 'doctor', clinicId: normalizedClinicId,
        isActive: true, isProfileComplete: false, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      })
      batch.set(db.doc(`doctors/${account.uid}`), {
        userId: account.uid, fullName: clean(fullName), specialty: clean(specialty), clinicId: normalizedClinicId,
        bio: '', fee: 0, consultationDuration: 30, workingHours: [], isProfileComplete: false,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      })
      await batch.commit()
      await writeAudit('DOCTOR_CREATED', 'doctor', account.uid, normalizedClinicId, { email: normalizedEmail, fullName: clean(fullName), specialty: clean(specialty) })
      return asText({ success: true, message: 'Doctor account added successfully. The doctor must complete their profile and working hours on first login.', doctor: { uid: account.uid, fullName: clean(fullName), email: normalizedEmail, specialty: clean(specialty), clinicId: normalizedClinicId, clinicName: clinic.data().name, isProfileComplete: false } })
    } catch (error) {
      await auth.deleteUser(account.uid).catch(() => {})
      throw error
    }
  } catch {
    return failure('Could not create the doctor account in Firebase. No account was left active after the failed attempt.')
  }
})

server.registerTool('list_doctors', {
  title: 'List doctors',
  description: 'Lists doctor accounts, optionally limited to a clinic, so you can verify successful creation.',
  inputSchema: { clinicId: z.string().trim().min(1).optional() },
}, async ({ clinicId }) => {
  try {
    const reference = clinicId ? db.collection('doctors').where('clinicId', '==', clean(clinicId)) : db.collection('doctors')
    const snapshot = await reference.get()
    const doctors = snapshot.docs.map((item) => {
      const doctor = item.data()
      return { uid: item.id, fullName: doctor.fullName, specialty: doctor.specialty, clinicId: doctor.clinicId, isProfileComplete: doctor.isProfileComplete === true }
    }).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
    return asText({ doctors, count: doctors.length })
  } catch {
    return failure('Could not load doctors from Firebase.')
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('Shefaa Clinic MCP server is running on stdio.')
