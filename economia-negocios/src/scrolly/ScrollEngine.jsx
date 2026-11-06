import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import './scrolly.css'

/**
 * Motor de scrollytelling sin dependencias.
 *
 * - El scroll es el nativo (nada de secuestrar la rueda): se lee `scrollY` y se
 *   suaviza con un lerp, así los elementos "llegan" con inercia detrás del dedo.
 * - Cada <Scene> es una sección alta con un contenido `sticky`. El motor escribe
 *   su progreso (0 → 1) en la variable CSS `--p`; todo el movimiento se define
 *   en CSS con calc()/clamp() usando solo transform y opacity (compositor).
 * - El bucle rAF corre únicamente mientras hay movimiento pendiente.
 * - Sin backdrop-filter en ningún lado de las escenas.
 */
const EngineContext = createContext(null)
const clamp01 = (n) => Math.min(1, Math.max(0, n))

export function ScrollyRoot({ children, className = '', onSceneChange }) {
  const rootRef = useRef(null)
  const scenes = useRef([]) // { el, top, range }
  const st = useRef({ target: 0, cur: 0, raf: 0, vh: 0, active: -1 })

  const engine = useMemo(() => {
    const measure = () => {
      const s = st.current
      s.vh = window.innerHeight
      scenes.current.forEach((sc) => {
        const r = sc.el.getBoundingClientRect()
        sc.top = r.top + window.scrollY
        sc.range = Math.max(1, r.height - s.vh)
      })
    }
    const apply = () => {
      const s = st.current
      const root = rootRef.current
      let active = 0
      scenes.current.forEach((sc, i) => {
        const p = clamp01((s.cur - sc.top) / sc.range)
        sc.el.style.setProperty('--p', p.toFixed(4))
        sc.cb?.current?.(p)
        // La escena activa es la que ocupa el centro de la pantalla.
        if (s.cur + s.vh * 0.5 >= sc.top) active = i
      })
      if (root) {
        const max = Math.max(1, document.documentElement.scrollHeight - s.vh)
        root.style.setProperty('--gp', clamp01(s.cur / max).toFixed(4))
      }
      if (active !== s.active) {
        s.active = active
        onSceneChange?.(active)
      }
    }
    const tick = () => {
      const s = st.current
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      s.cur += (s.target - s.cur) * (reduce ? 1 : 0.11)
      if (Math.abs(s.target - s.cur) < 0.4) s.cur = s.target
      apply()
      s.raf = s.cur === s.target ? 0 : requestAnimationFrame(tick)
    }
    const kick = () => {
      const s = st.current
      s.target = window.scrollY
      if (!s.raf) s.raf = requestAnimationFrame(tick)
    }
    return {
      register(el, cb) {
        const sc = { el, cb, top: 0, range: 1 }
        scenes.current.push(sc)
        scenes.current.sort((a, b) => (a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1))
        measure()
        st.current.cur = st.current.target = window.scrollY
        apply()
        return () => {
          scenes.current = scenes.current.filter((x) => x !== sc)
        }
      },
      measure,
      apply,
      kick,
    }
    // onSceneChange se lee en caliente; no debe recrear el motor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    const s = st.current
    s.target = s.cur = window.scrollY
    engine.measure()
    engine.apply()
    const onResize = () => {
      engine.measure()
      engine.kick()
    }
    window.addEventListener('scroll', engine.kick, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('load', onResize)
    document.fonts?.ready.then(onResize)
    return () => {
      window.removeEventListener('scroll', engine.kick)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onResize)
      cancelAnimationFrame(s.raf)
      s.raf = 0
    }
  }, [engine])

  return (
    <EngineContext.Provider value={engine}>
      <div ref={rootRef} className={`scrolly ${className}`}>
        {children}
      </div>
    </EngineContext.Provider>
  )
}

/**
 * Escena fijada: `height` en vh es el recorrido de scroll (más alto = más lento).
 * Los hijos leen `--p` (0 → 1) con calc()/clamp().
 */
export function Scene({ height = 300, className = '', id, onProgress, children }) {
  const engine = useContext(EngineContext)
  const ref = useRef(null)
  // `onProgress(p)` se llama en cada cuadro de scroll: sirve para gráficos que se dibujan sin re-renderizar React.
  const cb = useRef(onProgress)
  cb.current = onProgress
  useLayoutEffect(() => engine.register(ref.current, cb), [engine])
  // Las imágenes/fuentes que llegan tarde cambian alturas: se vuelve a medir.
  useEffect(() => {
    const t = setTimeout(() => {
      engine.measure()
      engine.apply()
    }, 400)
    return () => clearTimeout(t)
  }, [engine])
  return (
    <section ref={ref} id={id} className={`scene ${className}`} style={{ height: `${height}vh` }}>
      <div className="scene__pin">{children}</div>
    </section>
  )
}

/** Texto que se enciende palabra por palabra con el scroll. */
export function WordReveal({ text, className = '', from = 0.08, to = 0.8 }) {
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <p className={`words ${className}`}>
      {words.map((w, i) => (
        <span key={i} className="words__w" style={{ '--s': (from + ((to - from) * i) / words.length).toFixed(3) }}>
          {w}
        </span>
      ))}
    </p>
  )
}

/** Divide un texto en ideas: por líneas o, si es un párrafo, por oraciones. */
export function toItems(text) {
  const t = (text ?? '').trim()
  if (!t) return []
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  if (lines.length > 1) return lines
  return t.split(/(?<=[.!?])\s+/).map((l) => l.trim()).filter(Boolean)
}
