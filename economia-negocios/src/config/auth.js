// Único lugar donde se define quién puede entrar a la plataforma.
// Solo docentes autorizados (y el equipo de desarrollo para pruebas).
export const ALLOWED_EMAILS = [
  'cichavez@uao.edu.co',
  'empanadasclaude@gmail.com',
]

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// Sin Client ID, en desarrollo se habilita un acceso de prueba para poder
// avanzar con los siguientes frames. En producción este modo no existe.
export const DEV_FALLBACK = import.meta.env.DEV && !GOOGLE_CLIENT_ID

export const SESSION_KEY = 'edn.session'
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12 horas

export function isAuthorizedEmail(email) {
  if (typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  return ALLOWED_EMAILS.some((allowed) => allowed.toLowerCase() === normalized)
}
