import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './PageTransition.css'

/**
 * Transición entre frames estilo "cortina": cinco barras verticales suben y
 * cubren la pantalla mostrando el nombre del destino; el frame cambia por
 * debajo y las barras siguen de largo para revelar el nuevo frame.
 */
const BARS = 5
const STAGGER_MS = 70
const BAR_MS = 750
const DWELL_MS = 350
const COVER_MS = BAR_MS + (BARS - 1) * STAGGER_MS + DWELL_MS
const REVEAL_MS = BAR_MS + (BARS - 1) * STAGGER_MS + 60

const TransitionContext = createContext(null)

export function TransitionProvider({ children }) {
  const navigate = useNavigate()
  const [state, setState] = useState({ phase: 'idle', label: '' })
  const busy = useRef(false)

  /**
   * go('/ruta', { label, onCovered, state })
   * `onCovered` corre cuando la pantalla ya está tapada (útil para cerrar sesión
   * sin que se vea el cambio de estado).
   */
  const go = useCallback(
    (to, { label = '', onCovered, state } = {}) => {
      if (busy.current) return
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        onCovered?.()
        navigate(to, { state })
        return
      }
      busy.current = true
      setState({ phase: 'cover', label })
      setTimeout(() => {
        onCovered?.()
        navigate(to, { state })
        window.scrollTo(0, 0)
        setState((s) => ({ ...s, phase: 'reveal' }))
        setTimeout(() => {
          setState({ phase: 'idle', label: '' })
          busy.current = false
        }, REVEAL_MS)
      }, COVER_MS)
    },
    [navigate],
  )

  return (
    <TransitionContext.Provider value={go}>
      {children}
      <div className={`curtain curtain--${state.phase}`} aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => (
          <span key={i} className="curtain__bar" style={{ '--i': i }} />
        ))}
        <div className="curtain__label">
          <span key={state.label}>{state.label}</span>
        </div>
      </div>
    </TransitionContext.Provider>
  )
}

export function useTransition() {
  const ctx = useContext(TransitionContext)
  if (!ctx) throw new Error('useTransition debe usarse dentro de <TransitionProvider>')
  return ctx
}
