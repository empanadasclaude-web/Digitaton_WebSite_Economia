import AuroraBackground from '../../components/AuroraBackground'
import GlassPanel from '../../components/GlassPanel'
import { useAuth } from '../../context/AuthContext'

/**
 * Marcador temporal: confirma que el login funciona.
 * Se reemplaza en el siguiente frame por el panel de cursos y empresas.
 */
export default function Home() {
  const { user, signOut } = useAuth()

  return (
    <main style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24 }}>
      <AuroraBackground />
      <GlassPanel style={{ zIndex: 1, padding: '40px 48px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontWeight: 600, fontSize: '2.4rem' }}>Hola, {user.givenName}</h1>
        <p style={{ color: 'var(--ink-soft)', margin: '12px 0 28px' }}>{user.email}</p>
        <button
          type="button"
          onClick={signOut}
          style={{
            background: 'none',
            border: 0,
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Cerrar sesión
        </button>
      </GlassPanel>
    </main>
  )
}
