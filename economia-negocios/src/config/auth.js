// Único lugar donde se define quién puede entrar a la plataforma.
// Solo docentes autorizados (y el equipo de desarrollo para pruebas).
const lista = (v) => String(v ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)

// Correos autorizados + los que se agreguen con VITE_ALLOWED_EMAILS (separados por coma).
export const ALLOWED_EMAILS = [
  'cichavez@uao.edu.co',
  'empanadasclaude@gmail.com',
  ...lista(import.meta.env.VITE_ALLOWED_EMAILS),
]

// Dominios completos autorizados (cualquier cuenta @uao.edu.co). Cambia con VITE_ALLOWED_DOMAINS.
export const ALLOWED_DOMAINS = lista(import.meta.env.VITE_ALLOWED_DOMAINS ?? 'uao.edu.co')

// Cuenta virtual del acceso con código de evaluador (el servidor es quien valida el código).
export const REVIEW_EMAIL = 'evaluador@revision.local'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// Sin Client ID, en desarrollo se habilita un acceso de prueba para poder
// avanzar con los siguientes frames. En producción este modo no existe.
export const DEV_FALLBACK = import.meta.env.DEV && !GOOGLE_CLIENT_ID

export const SESSION_KEY = 'edn.session'
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12 horas

export function isAuthorizedEmail(email) {
  if (typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  if (normalized === REVIEW_EMAIL) return true
  if (ALLOWED_EMAILS.some((allowed) => allowed.toLowerCase() === normalized)) return true
  const dominio = normalized.split('@')[1]
  return Boolean(dominio) && ALLOWED_DOMAINS.includes(dominio)
}

// El enlace «Soy evaluador» solo se muestra si VITE_REVIEW_ACCESS vale «true». Para quitarlo: borra la variable y redespliega.
export const REVIEW_VISIBLE = import.meta.env.VITE_REVIEW_ACCESS === 'true'
