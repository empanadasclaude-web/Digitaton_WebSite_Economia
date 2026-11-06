import { useCallback, useRef, useState } from 'react'
import { Scene } from '../ScrollEngine'

/**
 * Gráficos de teoría que se dibujan con el scroll. Reciben el progreso (0→1)
 * de su escena y actualizan el SVG directamente (sin re-renderizar React por
 * cuadro); React solo cambia cuando cambia la "fase" de la explicación.
 */
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => t * t * (3 - 2 * t)
const fmt = (n) => new Intl.NumberFormat('es-CO').format(Math.round(n))
const set = (el, attrs) => el && Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))

/* ------------------------------------------------------------------ */
/* Oferta y demanda                                                    */
/* ------------------------------------------------------------------ */
const W = 640
const H = 440
const X0 = 76
const X1 = 616
const Y0 = 376
const Y1 = 30

export function Mercado({ cfg, height = 460 }) {
  const [fase, setFase] = useState(0)
  const faseRef = useRef(0)
  const el = useRef({})
  const { xMax, yMax, series, fases } = cfg
  const sx = (q) => X0 + (q / xMax) * (X1 - X0)
  const sy = (p) => Y0 - (p / yMax) * (Y0 - Y1)
  const reg = (k) => (node) => {
    el.current[k] = node
  }

  const line = (s, shift) => {
    const qa = -8
    const qb = xMax + 8
    const pa = s.a + s.b * (qa - shift)
    const pb = s.a + s.b * (qb - shift)
    return `M${sx(qa).toFixed(1)},${sy(pa).toFixed(1)} L${sx(qb).toFixed(1)},${sy(pb).toFixed(1)}`
  }
  const find = (id) => series.find((s) => s.desplaza === id || s.id === id)
  const eqAt = (dD, dS) => {
    const D = find('D')
    const S = find('S')
    if (!D || !S) return null
    const q = (S.a - D.a + D.b * dD - S.b * dS) / (D.b - S.b)
    return { q, p: S.a + S.b * (q - dS) }
  }

  const onProgress = useCallback(
    (p) => {
      // Fase actual y mezcla con la anterior
      let i = 0
      fases.forEach((f, k) => {
        if (p >= f.en) i = k
      })
      const cur = fases[i]
      const prev = fases[Math.max(0, i - 1)]
      const f = i === 0 ? 1 : smooth(clamp((p - cur.en) / 0.09))
      if (faseRef.current !== i) {
        faseRef.current = i
        setFase(i)
      }
      const dD = lerp(prev.dD ?? 0, cur.dD ?? 0, f)
      const dS = lerp(prev.dS ?? 0, cur.dS ?? 0, f)
      const e = el.current

      series.forEach((s) => {
        const t = clamp((p - s.mostrar[0]) / (s.mostrar[1] - s.mostrar[0]))
        const shift = s.desplaza === 'D' ? dD : s.desplaza === 'S' ? dS : 0
        set(e[`l-${s.id}`], { d: line(s, shift), 'stroke-dashoffset': 1 - t, opacity: t > 0 ? 1 : 0 })
        const ghost = s.desplaza ? clamp(Math.abs(shift) / 0.8) * 0.5 : 0
        set(e[`g-${s.id}`], { d: line(s, 0), opacity: ghost * (t > 0 ? 1 : 0) })
        // Etiqueta sobre la curva, en el tramo visible (nunca fuera del gráfico)
        const qVis = s.b < 0 ? Math.min(xMax, (0 - s.a) / s.b + shift) : Math.min(xMax, (yMax - s.a) / s.b + shift)
        const qLab = Math.max(0, qVis) * 0.78
        const pLab = s.a + s.b * (qLab - shift)
        const lx = sx(qLab)
        const ly = clamp(sy(pLab), Y1 + 22, Y0 - 10)
        set(e[`t-${s.id}`], { x: Math.min(lx - 8, X1 - 6), y: ly - 14, opacity: t >= 1 ? 1 : 0 })
      })

      // Equilibrio
      const hasEq = Boolean(find('D') && find('S'))
      const eqOn = hasEq && (cur.eq || prev.eq) ? lerp(prev.eq ? 1 : 0, cur.eq ? 1 : 0, f) : 0
      const moved = clamp((Math.abs(dD) + Math.abs(dS)) / 0.8)
      const eq1 = hasEq ? eqAt(0, 0) : null
      const eq2 = hasEq ? eqAt(dD, dS) : null
      const place = (key, pt, op) => {
        if (!pt) return
        const x = sx(pt.q)
        const y = sy(pt.p)
        set(e[`${key}-dot`], { cx: x, cy: y, opacity: op })
        set(e[`${key}-v`], { x1: x, y1: y, x2: x, y2: Y0, opacity: op * 0.7 })
        set(e[`${key}-h`], { x1: x, y1: y, x2: X0, y2: y, opacity: op * 0.7 })
        set(e[`${key}-tq`], { x, opacity: op })
        set(e[`${key}-tp`], { y: y + 4, opacity: op })
      }
      place('eq1', eq1, eqOn * (moved > 0.05 ? 0.45 : 1))
      place('eq2', eq2, eqOn * moved)
      if (e['eq2-lab'] && eq2) set(e['eq2-lab'], { x: sx(eq2.q) + 12, y: sy(eq2.p) - 12, opacity: eqOn * moved })
      if (e['eq1-lab'] && eq1) set(e['eq1-lab'], { x: sx(eq1.q) + 12, y: sy(eq1.p) - 12, opacity: eqOn })
      if (e['eq1-lab']) e['eq1-lab'].textContent = moved > 0.05 ? 'Eq₁' : 'Equilibrio'

      // Línea de precio (movimiento sobre la curva / excedente / escasez)
      const hasP = cur.precio != null || prev.precio != null
      const pOp = hasP ? lerp(prev.precio != null ? 1 : 0, cur.precio != null ? 1 : 0, f) : 0
      const price = cur.precio != null && prev.precio != null ? lerp(prev.precio, cur.precio, f) : (cur.precio ?? prev.precio ?? 0)
      const D = find('D')
      const S = find('S')
      const brecha = (cur.brecha ?? prev.brecha) && pOp > 0
      const y = sy(price)
      set(e['pl'], { x1: X0, x2: X1, y1: y, y2: y, opacity: pOp * 0.8 })
      if (D) {
        const qd = (price - D.a) / D.b + dD
        set(e['pd'], { cx: sx(qd), cy: y, opacity: pOp })
        set(e['pdv'], { x1: sx(qd), x2: sx(qd), y1: y, y2: Y0, opacity: pOp * 0.6 })
        if (S) {
          const qs = (price - S.a) / S.b + dS
          set(e['ps'], { cx: sx(qs), cy: y, opacity: pOp })
          set(e['psv'], { x1: sx(qs), x2: sx(qs), y1: y, y2: Y0, opacity: pOp * 0.6 })
          set(e['gap'], { x1: sx(Math.min(qd, qs)), x2: sx(Math.max(qd, qs)), y1: y, y2: y, opacity: brecha ? pOp : 0 })
          const gl = e['gap-lab']
          if (gl) {
            set(gl, { x: (sx(qd) + sx(qs)) / 2, y: y - 12, opacity: brecha ? pOp : 0 })
            gl.textContent = (cur.brecha ?? prev.brecha) === 'escasez' ? 'Escasez' : 'Excedente'
          }
        } else {
          set(e['ps'], { opacity: 0 })
          set(e['psv'], { opacity: 0 })
          set(e['gap'], { opacity: 0 })
          set(e['gap-lab'], { opacity: 0 })
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg],
  )

  const xt = Array.from({ length: 7 }, (_, i) => (xMax / 6) * i)
  const yt = Array.from({ length: 6 }, (_, i) => (yMax / 5) * i)
  const cur = fases[fase]

  return (
    <Scene height={height} className="scene--light" onProgress={onProgress}>
      <div className="tp-split">
        <div className="tp-copy">
          <p className="kicker">{cfg.kicker}</p>
          <h2 className="tp-h2">{cfg.titulo}</h2>
          <div className="tp-cap" key={fase}>
            <h3>{cur.titulo}</h3>
            <p>{cur.texto}</p>
          </div>
          <div className="tp-dots" aria-hidden="true">
            {fases.map((_, i) => (
              <i key={i} className={i === fase ? 'on' : i < fase ? 'done' : ''} />
            ))}
          </div>
        </div>
        <figure className="tp-chart">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={cfg.titulo}>
            <defs>
              <clipPath id={`clip-${cfg.titulo.length}-${cfg.xMax}`}>
                <rect x={X0} y={Y1 - 6} width={X1 - X0} height={Y0 - Y1 + 6} />
              </clipPath>
            </defs>
            {yt.map((v) => (
              <g key={v}>
                <line className="ax-grid" x1={X0} x2={X1} y1={sy(v)} y2={sy(v)} />
                <text className="ax-t" x={X0 - 10} y={sy(v) + 4} textAnchor="end">{fmt(v)}</text>
              </g>
            ))}
            {xt.map((v) => (
              <text key={v} className="ax-t" x={sx(v)} y={Y0 + 20} textAnchor="middle">{fmt(v)}</text>
            ))}
            <line className="ax" x1={X0} x2={X0} y1={Y1 - 8} y2={Y0} />
            <line className="ax" x1={X0} x2={X1 + 6} y1={Y0} y2={Y0} />
            <text className="ax-l" x={X1} y={Y0 + 42} textAnchor="end">{cfg.ejeX}</text>
            <text className="ax-l" x={X0 - 56} y={Y1 - 12} textAnchor="start">{cfg.ejeY}</text>

            <g clipPath={`url(#clip-${cfg.titulo.length}-${cfg.xMax})`}>
              {series.map((s) => (
                <g key={s.id}>
                  <path ref={reg(`g-${s.id}`)} className="curve curve--ghost" style={{ stroke: s.color }} opacity="0" />
                  <path
                    ref={reg(`l-${s.id}`)}
                    className="curve"
                    pathLength="1"
                    strokeDasharray="1"
                    strokeDashoffset="1"
                    style={{ stroke: s.color }}
                    strokeWidth={s.grosor ?? 3}
                    opacity="0"
                  />
                </g>
              ))}
            </g>
            {series.map((s) => (
              <text key={s.id} ref={reg(`t-${s.id}`)} className="curve-lab" style={{ fill: s.color }} textAnchor="end" opacity="0">
                {s.nombre}
              </text>
            ))}

            {/* precio, excedente, escasez */}
            <line ref={reg('pl')} className="guide guide--price" opacity="0" />
            <line ref={reg('pdv')} className="guide" opacity="0" />
            <line ref={reg('psv')} className="guide" opacity="0" />
            <line ref={reg('gap')} className="gap" opacity="0" />
            <circle ref={reg('pd')} className="pt pt--d" r="6" opacity="0" />
            <circle ref={reg('ps')} className="pt pt--s" r="6" opacity="0" />
            <text ref={reg('gap-lab')} className="gap-lab" textAnchor="middle" opacity="0" />

            {/* equilibrio */}
            {['eq1', 'eq2'].map((k) => (
              <g key={k}>
                <line ref={reg(`${k}-v`)} className="guide" opacity="0" />
                <line ref={reg(`${k}-h`)} className="guide" opacity="0" />
                <text ref={reg(`${k}-tq`)} className="ax-t ax-t--b" y={Y0 + 20} textAnchor="middle" opacity="0">Qe</text>
                <text ref={reg(`${k}-tp`)} className="ax-t ax-t--b" x={X0 - 10} textAnchor="end" opacity="0">Pe</text>
                <circle ref={reg(`${k}-dot`)} className={`pt pt--eq${k === 'eq1' ? '' : '2'}`} r="7" opacity="0" />
              </g>
            ))}
            <text ref={reg('eq1-lab')} className="eq-lab" opacity="0">Equilibrio</text>
            <text ref={reg('eq2-lab')} className="eq-lab" opacity="0">Eq₂</text>
          </svg>
        </figure>
      </div>
    </Scene>
  )
}

/* ------------------------------------------------------------------ */
/* Elasticidad: la curva gira de elástica a inelástica                 */
/* ------------------------------------------------------------------ */
export function Elasticidad({ cfg, height = 560 }) {
  const { etapas } = cfg
  const n = etapas.length
  const [idx, setIdx] = useState(0)
  const idxRef = useRef(0)
  const el = useRef({})
  const reg = (k) => (node) => {
    el.current[k] = node
  }
  // Gráfico: centro (320,200)
  const cx = 320
  const cy = 190

  const onProgress = useCallback(
    (p) => {
      const s = clamp(p, 0, 0.9999) * n
      const i = Math.floor(s)
      const f = smooth(clamp((s - i - 0.5) / 0.5))
      const a = etapas[i].angulo
      const b = etapas[Math.min(n - 1, i + 1)].angulo
      const angle = lerp(a, b, i === n - 1 ? 0 : f)
      const q = lerp(etapas[i].q, etapas[Math.min(n - 1, i + 1)].q, i === n - 1 ? 0 : f)
      if (idxRef.current !== i) {
        idxRef.current = i
        setIdx(i)
      }
      const e = el.current
      set(e.line, { transform: `rotate(${angle.toFixed(2)} ${cx} ${cy})` })
      // % de cambio de la cantidad (barra): 100 = fuera de escala (∞)
      set(e.q, { width: (q / 100) * 220 })
      set(e.qt, { x: 380 + (q / 100) * 220 + 10 })
      if (e.qt) e.qt.textContent = q >= 99 ? '∞' : q <= 0.5 ? '0%' : `${(q / 4).toFixed(0)}%`
    },
    [etapas, n],
  )

  const cur = etapas[idx]
  return (
    <Scene height={height} className="scene--light" onProgress={onProgress}>
      <div className="tp-split">
        <div className="tp-copy">
          <p className="kicker">{cfg.kicker}</p>
          <h2 className="tp-h2">{cfg.titulo}</h2>
          <div className="tp-cap" key={idx}>
            <p className="tp-sym">{cur.simbolo}</p>
            <h3>{cur.nombre}</h3>
            <p>{cur.texto}</p>
          </div>
          <div className="tp-dots" aria-hidden="true">
            {etapas.map((_, i) => (
              <i key={i} className={i === idx ? 'on' : i < idx ? 'done' : ''} />
            ))}
          </div>
        </div>
        <figure className="tp-chart">
          <svg viewBox="0 0 640 440" role="img" aria-label="Curva de demanda que gira de elástica a inelástica">
            <defs>
              <clipPath id="el-clip">
                <rect x="76" y="24" width="540" height="300" />
              </clipPath>
            </defs>
            <line className="ax-grid" x1="76" x2="616" y1={cy} y2={cy} />
            <line className="ax-grid" x1={cx} x2={cx} y1="24" y2="324" />
            <line className="ax" x1="76" x2="76" y1="16" y2="324" />
            <line className="ax" x1="76" x2="622" y1="324" y2="324" />
            <text className="ax-l" x="616" y="352" textAnchor="end">Cantidad</text>
            <text className="ax-l" x="20" y="14">Precio</text>
            <g clipPath="url(#el-clip)">
              <line ref={reg('line')} className="curve" x1={cx - 330} x2={cx + 330} y1={cy} y2={cy} style={{ stroke: 'var(--a-mid)' }} strokeWidth="5" />
            </g>
            <circle cx={cx} cy={cy} r="7" className="pt pt--eq" />
            <text className="ax-t ax-t--b" x={cx + 12} y={cy - 10}>Precio inicial</text>
            {/* Comparación de variaciones */}
            <text className="ax-l" x="96" y="378">Si el precio sube 10%…</text>
            <rect x="96" y="388" width="220" height="14" rx="7" className="bar-p" />
            <text className="ax-t ax-t--b" x="326" y="400">10%</text>
            <text className="ax-l" x="380" y="378">…la cantidad cae</text>
            <rect ref={reg('q')} x="380" y="388" width="0" height="14" rx="7" className="bar-q" />
            <text ref={reg('qt')} className="ax-t ax-t--b" x="390" y="401">0%</text>
          </svg>
        </figure>
      </div>
    </Scene>
  )
}

/* ------------------------------------------------------------------ */
/* Ciclo económico                                                     */
/* ------------------------------------------------------------------ */
const CW = 640
const CH = 300
export function Ciclo({ cfg, height = 520 }) {
  const { fases } = cfg
  const [idx, setIdx] = useState(0)
  const idxRef = useRef(0)
  const el = useRef({})
  const reg = (k) => (node) => {
    el.current[k] = node
  }
  const px = (t) => 40 + t * (CW - 80)
  const py = (t) => CH / 2 - Math.sin(t * Math.PI * 2) * 100
  const seg = (a, b) => {
    const pts = []
    const steps = Math.max(4, Math.round((b - a) * 80))
    for (let i = 0; i <= steps; i++) {
      const t = a + ((b - a) * i) / steps
      pts.push(`${i ? 'L' : 'M'}${px(t).toFixed(1)},${py(t).toFixed(1)}`)
    }
    return pts.join(' ')
  }

  const onProgress = useCallback(
    (p) => {
      const t = clamp((p - 0.04) / 0.9)
      let i = 0
      fases.forEach((f, k) => {
        if (t >= f.rango[0]) i = k
      })
      if (idxRef.current !== i) {
        idxRef.current = i
        setIdx(i)
      }
      set(el.current.dot, { cx: px(t), cy: py(t) })
      set(el.current.halo, { cx: px(t), cy: py(t) })
      set(el.current.trail, { 'stroke-dashoffset': 1 - t })
    },
    [fases],
  )

  const cur = fases[idx]
  return (
    <Scene height={height} className="scene--light" onProgress={onProgress}>
      <div className="tp-split tp-split--ciclo">
        <div className="tp-copy">
          <p className="kicker">{cfg.kicker}</p>
          <h2 className="tp-h2">{cfg.titulo}</h2>
          <div className="tp-cap" key={idx}>
            <h3>{cur.nombre}</h3>
            <p>{cur.texto}</p>
          </div>
          <ul className="tp-ind" key={`i${idx}`}>
            {cur.indicadores.map(([n, v]) => (
              <li key={n}>
                <span>{n}</span>
                <b className={v.includes('↓') ? 'down' : 'up'}>{v}</b>
              </li>
            ))}
          </ul>
        </div>
        <figure className="tp-chart">
          <svg viewBox={`0 0 ${CW} ${CH + 60}`} role="img" aria-label="Fases del ciclo económico">
            <line className="ax-grid" x1="30" x2={CW - 30} y1={CH / 2} y2={CH / 2} />
            <text className="ax-l" x="30" y="16">PIB real</text>
            {fases.map((f, i) => (
              <path key={f.nombre} className={`wave${i === idx ? ' on' : ''}`} d={seg(f.rango[0], f.rango[1])} />
            ))}
            <path
              ref={reg('trail')}
              className="wave-trail"
              d={seg(0, 1)}
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset="1"
            />
            <circle ref={reg('halo')} className="dot-halo" r="16" cx={px(0)} cy={py(0)} />
            <circle ref={reg('dot')} className="dot" r="9" cx={px(0)} cy={py(0)} />
            {fases.map((f, i) => {
              const mid = (f.rango[0] + f.rango[1]) / 2
              const up = ['Auge o pico'].includes(f.nombre)
              const down = ['Valle'].includes(f.nombre)
              const y = up ? py(mid) - 26 : down ? py(mid) + 38 : mid < 0.5 ? py(mid) - 34 : py(mid) + 44
              return (
                <text key={f.nombre} className={`ph-lab${i === idx ? ' on' : ''}`} x={px(mid)} y={y} textAnchor="middle">
                  {f.nombre}
                </text>
              )
            })}
            <text className="ax-l" x={CW - 30} y={CH + 40} textAnchor="end">Tiempo</text>
          </svg>
          {cfg.nota && <figcaption className="tp-note">{cfg.nota}</figcaption>}
        </figure>
      </div>
    </Scene>
  )
}
