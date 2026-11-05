import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { isAuthorizedEmail, SESSION_KEY, SESSION_TTL_MS } from '../config/auth'

const AuthContext = createContext(null)

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    const expired = Date.now() - session.loggedAt > SESSION_TTL_MS
    // Se vuelve a validar la lista blanca por si cambió desde el último ingreso.
    if (expired || !isAuthorizedEmail(session.email)) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession)

  /**
   * Recibe el perfil devuelto por Google y decide si la cuenta puede entrar.
   * Devuelve { ok: true } o { ok: false, reason: 'unverified' | 'unauthorized' }.
   */
  const signIn = useCallback((profile) => {
    if (!profile?.email || profile.email_verified === false) {
      return { ok: false, reason: 'unverified' }
    }
    if (!isAuthorizedEmail(profile.email)) {
      return { ok: false, reason: 'unauthorized' }
    }
    const session = {
      email: profile.email.toLowerCase(),
      name: profile.name ?? profile.email,
      givenName: profile.given_name ?? (profile.name ?? profile.email).split(' ')[0],
      picture: profile.picture ?? null,
      loggedAt: Date.now(),
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch {
      /* el almacenamiento puede estar bloqueado; la sesión vive en memoria */
    }
    setUser(session)
    return { ok: true }
  }, [])

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* noop */
    }
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
