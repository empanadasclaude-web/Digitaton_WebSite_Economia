/**
 * Complejo industrial isométrico de la empresa, al estilo de las referencias
 * (blanco/hielo con acentos azules). Tiene vida propia en loop: camiones que
 * entran y salen, humo en la chimenea, turbinas girando, ventanas que parpadean
 * y tuberías con flujo. Todo es SVG + CSS (solo transform/opacity), sin filtros.
 *
 * Tres zonas = tres temas, de adelante hacia atrás (la 3 queda arriba, la 1 abajo):
 *   1 Mercado (bodega + vía de camiones) · 2 Tarifas (planta) · 3 Macro (tanques y energía)
 */
const DX = 42
const DY = 21
const OX = 450
const OY = 150
const N = 10
const SLAB = 28

const P = (x, y, z = 0) => [OX + (x - y) * DX, OY + (x + y) * DY - z]
const L = (x, y, z = 0) => [(x - y) * DX, (x + y) * DY - z] // proyección local (origen 0,0)
const pts = (list) => list.map((p) => p.map((n) => +n.toFixed(1)).join(',')).join(' ')

/** Prisma: caras superior, izquierda (plano y+d) y derecha (plano x+w). */
function box(proj, x, y, w, d, h, z0 = 0) {
  const t = h + z0
  return {
    top: pts([proj(x, y, t), proj(x + w, y, t), proj(x + w, y + d, t), proj(x, y + d, t)]),
    left: pts([proj(x, y + d, t), proj(x + w, y + d, t), proj(x + w, y + d, z0), proj(x, y + d, z0)]),
    right: pts([proj(x + w, y, t), proj(x + w, y + d, t), proj(x + w, y + d, z0), proj(x + w, y, z0)]),
  }
}
function Box({ proj = P, x, y, w, d, h, z0 = 0, tone = '' }) {
  const b = box(proj, x, y, w, d, h, z0)
  return (
    <g className={`ib ${tone}`}>
      <polygon className="ib__l" points={b.left} />
      <polygon className="ib__r" points={b.right} />
      <polygon className="ib__t" points={b.top} />
    </g>
  )
}

/** Cilindro vertical centrado en (cx, cy) de la cuadrícula. */
function Cyl({ cx, cy, r, h, z0 = 0, tone = '', id }) {
  const [sx, sy] = P(cx, cy, z0)
  const rx = r * DX * Math.SQRT2
  const ry = r * DY * Math.SQRT2
  const yt = sy - h
  return (
    <g className={`ic ${tone}`}>
      <path className="ic__body" d={`M${sx - rx},${yt} L${sx - rx},${sy} A${rx},${ry} 0 0 0 ${sx + rx},${sy} L${sx + rx},${yt} Z`} />
      <ellipse className="ic__top" cx={sx} cy={yt} rx={rx} ry={ry} />
      <ellipse className="ic__cap" cx={sx} cy={yt} rx={rx * 0.62} ry={ry * 0.62} />
    </g>
  )
}

/** Ventanas en el plano y = const (cara izquierda) o x = const (cara derecha). */
function Windows({ face, at, from, to, z, h = 12, n, gap = 0.12, className = 'iw' }) {
  const out = []
  const len = (to - from) / n
  for (let i = 0; i < n; i++) {
    const a = from + i * len + gap / 2
    const b = from + (i + 1) * len - gap / 2
    const poly =
      face === 'l'
        ? [P(a, at, z + h), P(b, at, z + h), P(b, at, z), P(a, at, z)]
        : [P(at, a, z + h), P(at, b, z + h), P(at, b, z), P(at, a, z)]
    out.push(<polygon key={i} className={className} style={{ '--i': i }} points={pts(poly)} />)
  }
  return <>{out}</>
}

function Truck({ dir, y, cls }) {
  // dir = +1 (hacia +x) o -1. Origen local en el frente del camión.
  const s = dir
  const cab = s > 0 ? [-0.05, 0.4] : [-0.4, 0.05]
  const cargo = s > 0 ? [-0.95, -0.05] : [0.05, 0.95]
  const [ox, oy] = P(0, y)
  return (
    <g transform={`translate(${ox} ${oy})`}>
      <g className={`truck ${cls}`}>
        <ellipse className="truck__sh" cx="0" cy="3" rx="34" ry="8" />
        <Box proj={L} x={cargo[0]} y={-0.2} w={cargo[1] - cargo[0]} d={0.4} h={15} z0={3} tone="ib--white" />
        <Box proj={L} x={cab[0]} y={-0.2} w={cab[1] - cab[0]} d={0.4} h={11} z0={3} tone="ib--blue" />
      </g>
    </g>
  )
}

function Smoke({ x, y, z }) {
  const [sx, sy] = P(x, y, z)
  return (
    <g transform={`translate(${sx} ${sy})`} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} className="smoke" r="9" style={{ '--i': i }} />
      ))}
    </g>
  )
}

function Turbine({ x, y, h = 112, i = 0 }) {
  const [sx, sy] = P(x, y)
  const hub = [sx, sy - h]
  return (
    <g aria-hidden="true">
      <polygon className="tw__pole" points={`${sx - 3},${sy} ${sx + 3},${sy} ${hub[0] + 1.5},${hub[1]} ${hub[0] - 1.5},${hub[1]}`} />
      <g transform={`translate(${hub[0]} ${hub[1]})`}>
        <g className="tw__blades" style={{ '--i': i }}>
          {[0, 120, 240].map((a) => (
            <polygon key={a} className="tw__blade" points="-2.5,0 2.5,0 1,-38 -1,-38" transform={`rotate(${a})`} />
          ))}
        </g>
        <circle className="tw__hub" r="4.5" />
      </g>
    </g>
  )
}

function Solar({ x, y, w, d }) {
  const lines = []
  for (let i = 1; i < 6; i++) lines.push([P(x + (w * i) / 6, y, 5), P(x + (w * i) / 6, y + d, 5)])
  for (let j = 1; j < 3; j++) lines.push([P(x, y + (d * j) / 3, 5), P(x + w, y + (d * j) / 3, 5)])
  return (
    <g aria-hidden="true">
      <polygon className="sol" points={pts([P(x, y, 5), P(x + w, y, 5), P(x + w, y + d, 5), P(x, y + d, 5)])} />
      {lines.map(([a, b], k) => (
        <line key={k} className="sol__l" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
      ))}
    </g>
  )
}

/** Estado visual de un tema: 'completo' | 'parcial' | 'pendiente'. */
export function estadoTema(p) {
  if (!p) return 'pendiente'
  return p.completo ? 'completo' : p.teoria || p.simulacion ? 'parcial' : 'pendiente'
}

const line = (list) => list.map(([x, y], i) => `${i ? 'L' : 'M'}${P(x, y)[0]},${P(x, y)[1]}`).join(' ')

export default function IsoScene({ temas, progreso, activeId, onHover, onSelect }) {
  const base = [P(0, 0), P(N, 0), P(N, N), P(0, N)]
  const slabL = [P(0, N), P(N, N), P(N, N, -SLAB), P(0, N, -SLAB)]
  const slabR = [P(N, 0), P(N, N), P(N, N, -SLAB), P(N, 0, -SLAB)]
  const grid = []
  for (let i = 1; i < N; i++) grid.push([P(i, 0), P(i, N)], [P(0, i), P(N, i)])

  // Insignias: 1 sobre la bodega (abajo), 2 sobre la planta (centro), 3 sobre tanques/turbinas (arriba).
  const badges = [P(6.3, 7.2, 66), P(3.5, 4.9, 140), P(3.0, 0.9, 160)]

  const zone = (i, children) => {
    const t = temas[i]
    if (!t) return null
    const estado = estadoTema(progreso?.[t.id])
    const active = activeId === t.id
    const [bx, by] = badges[i]
    return (
      <g
        className={`zone zone--${estado}${active ? ' is-active' : ''}`}
        style={{ '--i': i }}
        tabIndex={0}
        role="button"
        aria-label={`Tema ${t.orden}: ${t.nombre}`}
        onMouseEnter={() => onHover?.(t.id)}
        onMouseLeave={() => onHover?.(null)}
        onFocus={() => onHover?.(t.id)}
        onBlur={() => onHover?.(null)}
        onClick={() => onSelect?.(t)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect?.(t))}
      >
        <g className="zone__rise">
          {children}
          <g className="badge" transform={`translate(${bx} ${by - 18})`}>
            <line className="badge__stem" x1="0" y1="12" x2="0" y2="30" />
            <circle className="badge__c" r="17" />
            <text textAnchor="middle" dy="6">{estado === 'completo' ? '✓' : t.orden}</text>
          </g>
        </g>
      </g>
    )
  }

  return (
    <svg className="iso" viewBox="0 0 900 620" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Complejo industrial de la empresa con un área por tema">
      <defs>
        <linearGradient id="iso-slab" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--tint-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--tint-2)' }} />
        </linearGradient>
        <linearGradient id="iso-tank" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--a-soft)' }} />
          <stop offset="0.45" style={{ stopColor: 'var(--a-soft)' }} />
          <stop offset="1" style={{ stopColor: 'var(--a-strong)' }} />
        </linearGradient>
        <linearGradient id="iso-tank-w" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" style={{ stopColor: 'var(--tint-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--tint-3)' }} />
        </linearGradient>
      </defs>

      {/* Plataforma */}
      <g className="iso__base">
        <polygon points={pts(slabL)} style={{ fill: 'var(--tint-3)' }} />
        <polygon points={pts(slabR)} style={{ fill: 'var(--tint-4)' }} />
        <polygon points={pts(base)} fill="url(#iso-slab)" />
        {grid.map(([a, b], i) => (
          <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={{ stroke: 'var(--a-soft)' }} strokeOpacity="0.35" strokeWidth="1" />
        ))}
        {/* Vía (delante de la bodega) */}
        <polygon points={pts([P(0, 8.3), P(N, 8.3), P(N, 9.7), P(0, 9.7)])} style={{ fill: 'var(--tint-3)' }} />
        <path d={line([[0, 9.0], [N, 9.0]])} stroke="#fff" strokeWidth="2" strokeDasharray="14 12" fill="none" />
        {/* Tuberías con flujo */}
        <path className="pipe" d={line([[4.4, 1.8], [4.4, 3.5], [5.6, 3.5]])} />
        <path className="pipe pipe--b" d={line([[1.4, 4.2], [0.8, 4.2], [0.8, 1.9]])} />
        <path className="pipe pipe--c" d={line([[5.2, 6.2], [5.2, 7.0]])} />
        <path className="pipe pipe--d" d={line([[8.6, 2.5], [8.6, 5.8], [7.6, 5.8]])} />
      </g>

      <Solar x={7.6} y={3.2} w={1.8} d={1.2} />

      {/* Zona 3 · Macro: turbinas y tanques (al fondo) */}
      {zone(
        2,
        <>
          <Turbine x={0.9} y={1.0} i={0} />
          <Turbine x={2.0} y={0.5} h={96} i={1} />
          <Cyl cx={3.9} cy={0.9} r={0.5} h={96} tone="ic--blue" />
          <Cyl cx={4.8} cy={1.7} r={0.5} h={96} tone="ic--blue" />
          <Cyl cx={3.8} cy={2.1} r={0.42} h={74} tone="ic--white" />
        </>,
      )}

      {/* Zona 2 · Tarifas: la planta (al centro) */}
      {zone(
        1,
        <>
          <Box x={1.5} y={3.8} w={4.0} d={2.3} h={78} tone="ib--white" />
          <Box x={2.0} y={4.1} w={2.2} d={1.6} h={24} z0={78} tone="ib--white" />
          <Box x={4.6} y={4.3} w={0.5} d={0.5} h={14} z0={78} tone="ib--blue" />
          <Box x={1.7} y={5.3} w={0.6} d={0.5} h={10} z0={78} tone="ib--white" />
          <Windows face="l" at={6.1} from={1.75} to={5.25} z={36} h={20} n={6} />
          <Windows face="r" at={5.5} from={4.05} to={5.85} z={36} h={20} n={3} />
          <Windows face="l" at={6.1} from={1.75} to={5.25} z={10} h={14} n={4} gap={0.5} className="iw iw--dim" />
          <polygon className="gate" points={pts([P(3.2, 6.1, 30), P(4.2, 6.1, 30), P(4.2, 6.1, 0), P(3.2, 6.1, 0)])} />
          <Cyl cx={4.5} cy={4.4} r={0.26} h={64} z0={78} tone="ic--white" />
          <circle className="beacon" cx={P(2.2, 5.5, 114)[0]} cy={P(2.2, 5.5, 114)[1]} r="3" />
        </>,
      )}
      <Smoke x={4.5} y={4.4} z={142} />

      {/* Zona 1 · Mercado: bodega (delante) y camiones */}
      {zone(
        0,
        <>
          <Box x={5.2} y={6.7} w={3.0} d={1.4} h={36} tone="ib--white" />
          <Box x={5.4} y={6.9} w={2.6} d={1.0} h={10} z0={36} tone="ib--blue" />
          <polygon className="gate" points={pts([P(6.0, 8.1, 24), P(7.2, 8.1, 24), P(7.2, 8.1, 0), P(6.0, 8.1, 0)])} />
          <Windows face="r" at={8.2} from={6.9} to={7.9} z={14} h={12} n={2} />
          <Box x={8.5} y={7.0} w={0.9} d={0.9} h={22} tone="ib--white" />
        </>,
      )}

      <Truck dir={1} y={8.6} cls="truck--in" />
      <Truck dir={-1} y={9.4} cls="truck--out" />
      <Truck dir={1} y={8.6} cls="truck--in truck--b" />
    </svg>
  )
}
