import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../../firebase.js'
import { hasPermission } from '../../lib/permissions.js'
/* eslint-disable react-refresh/only-export-components */
const AuthContext = createContext(null)
export function AuthProvider({ children }) { const [user, setUser] = useState(null); const [profile, setProfile] = useState(null); const [loading, setLoading] = useState(isFirebaseConfigured); useEffect(() => { if (!isFirebaseConfigured) return undefined; let stopProfile = () => {}; const stopAuth = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); stopProfile(); if (currentUser) stopProfile = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => { setProfile(snap.exists() ? snap.data() : null); setLoading(false) }, () => setLoading(false)); else { setProfile(null); setLoading(false) } }); return () => { stopAuth(); stopProfile() } }, []); const value = useMemo(() => ({ user, profile, loading, configured: isFirebaseConfigured, logout: () => signOut(auth), can: (permission) => hasPermission(profile?.role, permission) }), [user, profile, loading]); return <AuthContext.Provider value={value}>{children}</AuthContext.Provider> }
export const useAuth = () => useContext(AuthContext)
