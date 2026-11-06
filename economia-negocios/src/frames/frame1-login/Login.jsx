import { useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import AuroraBackground from '../../components/AuroraBackground'
import GlassPanel from '../../components/GlassPanel'
import UaoLogo from '../../components/UaoLogo'
import GoogleIcon from '../../components/GoogleIcon'
import { useTransition } from '../../components/PageTransition'
import { useAuth } from '../../context/AuthContext'
import { ALLOWED_EMAILS, DEV_FALLBACK, GOOGLE_CLIENT_ID } from '../../config/auth'
import './Login.css'

const MESSAGES = {
  unauthorized:
    'Esta cuenta no tiene acceso. La plataforma es solo para docentes autorizados.',
  unverified: 'Google no pudo verificar el correo de esta cuenta. Intenta con otra.',
  failed: 'No se pudo completar el inicio de sesión. Inténtalo de nuevo.',
}

/** Botón real de Google. Solo se monta si existe un Client ID. */
function GoogleButton({ disabled, onStart, onProfile, onFail }) {
  const login = useGoogleLogin({
    flow: 'implicit',
    scope: 'openid email profile',
    onSuccess: async ({ access_token }) => {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        })
        if (!res.ok) throw new Error('userinfo')
        onProfile(await res.json())
      } catch {
        onFail('failed')
      }
    },
    // El usuario cerró la ventana de Google: no es un error que mostrar.
    onError: () => onFail(null),
    onNonOAuthError: () => onFail(null),
  })

  return (
    <button
      type="button"
      className="login__google"
      disabled={disabled}
      onClick={() => {
        onStart()
        login()
      }}
    >
      <GoogleIcon />
      <span>Iniciar sesión con Google</span>
    </button>
  )
}

export default function Login() {
  const { user, signIn } = useAuth()
  const go = useTransition()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // Solo se redirige directo si ya había sesión al abrir la página; un inicio
  // de sesión nuevo navega con la transición de cortina.
  const hadSession = useRef(Boolean(user))

  if (user && hadSession.current) return <Navigate to="/" replace />

  const handleProfile = (profile) => {
    const result = signIn(profile)
    if (!result.ok) {
      setError(MESSAGES[result.reason])
      setLoading(false)
    }
    const firstName = profile.given_name ?? profile.name?.split(' ')[0] ?? ''
    go('/', { label: firstName ? `Hola, ${firstName}` : 'Bienvenido' })
  }

  const handleFail = (reason) => {
    setError(reason ? MESSAGES[reason] : null)
    setLoading(false)
  }

  return (
    <main className="login">
      <AuroraBackground />

      <GlassPanel live className="login__card" aria-labelledby="login-title">
        <p className="login__eyebrow">Economía de los Negocios</p>
        <h1 id="login-title" className="login__title">
          Bienvenido
        </h1>
        <p className="login__lead">
          Accede con tu cuenta de Google para administrar tus cursos, empresas y simulaciones.
        </p>

        {GOOGLE_CLIENT_ID ? (
          <GoogleButton
            disabled={loading}
            onStart={() => {
              setError(null)
              setLoading(true)
            }}
            onProfile={handleProfile}
            onFail={handleFail}
          />
        ) : (
          <div className="login__missing" role="note">
            Falta configurar <code>VITE_GOOGLE_CLIENT_ID</code> en el archivo <code>.env</code>.
          </div>
        )}

        <p className="login__error" role="alert" aria-live="assertive">
          {error}
        </p>

        {DEV_FALLBACK && (
          <div className="login__dev">
            <span className="login__dev-label">Modo desarrollo · sin Google</span>
            <div className="login__dev-actions">
              {ALLOWED_EMAILS.map((email) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => {
                    setError(null)
                    handleProfile({
                      email,
                      email_verified: true,
                      name: email === 'cichavez@uao.edu.co' ? 'Carlos Ignacio Chavez' : 'Empanadas Claude',
                      given_name: email === 'cichavez@uao.edu.co' ? 'Carlos' : 'Empanadas',
                    })
                  }}
                >
                  {email}
                </button>
              ))}
              <button type="button" onClick={() => handleProfile({ email: 'otra@cuenta.com', email_verified: true })}>
                Probar cuenta no autorizada
              </button>
            </div>
          </div>
        )}
      </GlassPanel>
      <UaoLogo height={28} className="login__uao rise" />
    </main>
  )
}
