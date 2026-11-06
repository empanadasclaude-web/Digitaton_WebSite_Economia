import { useEffect, useId, useState } from 'react'
import './GraficoVivo.css'

/**
 * Gráficos que se animan al resolver una pregunta o una noticia: muestran de dónde partía el
 * mercado (línea punteada) y hacia dónde se movió con la decisión (línea llena).
 * Reciben una `spec` con datos (ver sim/graficos.js); aquí solo se dibujan.
 */
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n))
const lerp = (a, b, t) => a + (b - a) * t
const ease = (t) => t * t * (3 - 2 * t)
const f1 = (n, d = 1) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(n)
const pct = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${f1(Math.abs(n), 1)} %`

/** Progreso 0→1 que se reinicia cuando cambia `clave` (sin animación si el usuario la reduce). */
function useProgreso(clave, ms = 1500) {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setT(1)
      return
    }
    setT(0)
    let raf
    const t0 = performance.now() + 250 // pequeña pausa para que se vea el punto de partida
    const paso = (now) => {
      const v = clamp((now - t0) / ms)
      setT(v)
      if (v < 1) raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [clave, ms])
  return ease(t)
}

const X0 = 62
const X1 = 500
const Y0 = 288
const Y1 = 22
const sx = (q) => X0 + (q / 100) * (X1 - X0)
const sy = (p) => Y0 - (p / 100) * (Y0 - Y1)
const linea = (puntos) => puntos.map(([q, p], i) => `${i ? 'L' : 'M'}${sx(q).toFixed(1)},${sy(p).toFixed(1)}`).join(' ')

function Ejes({ xEt = 'Cantidad', yEt = 'Precio' }) {
  return (
    <g className="gv__ejes">
      <path d={`M${X0},${Y1 - 6} V${Y0} H${X1 + 6}`} />
      <text x={X1} y={Y0 + 22} textAnchor="end" className="gv__et">{xEt}</text>
      <text x={X0 - 12} y={Y1 + 4} textAnchor="end" className="gv__et">{yEt}</text>
    </g>
  )
}

function Chip({ etiqueta, valor, bueno }) {
  const cls = valor > 0.05 ? 'up' : valor < -0.05 ? 'down' : 'flat'
  return (
    <li className={`gv__chip gv__chip--${cls}`}>
      <span>{etiqueta}</span>
      <b>{valor > 0.05 ? '▲' : valor < -0.05 ? '▼' : '='} {pct(valor)}</b>
    </li>
  )
}

/* ------------------------------- Oferta y demanda ------------------------------- */
function Mercado({ spec, clave }) {
  const id = useId()
  const t = useProgreso(clave)
  const a = { dDemanda: 0, dOferta: 0, ...(spec.antes ?? {}) }
  const b = { dDemanda: spec.dDemanda ?? 0, dOferta: spec.dOferta ?? 0, precio: spec.precio, brecha: spec.brecha }
  const eq = (sD, sS) => ({ p: (100 + sD - sS) / 2, q: (100 + sD + sS) / 2 })
  const e0 = eq(a.dDemanda, a.dOferta)
  const sD = lerp(a.dDemanda, b.dDemanda, t)
  const sS = lerp(a.dOferta, b.dOferta, t)
  const e1 = eq(sD, sS)
  const eF = eq(b.dDemanda, b.dOferta)

  const demanda = (d) => linea([[100 + d, 0], [d, 100]])
  const oferta = (s) => linea([[s, 0], [100 + s, 100]])

  const hayPrecio = b.precio !== undefined
  const precio0 = a.precio ?? e0.p
  const pAct = hayPrecio ? lerp(precio0, b.precio, t) : null
  const qd = hayPrecio ? 100 - pAct + sD : null
  const qs = hayPrecio ? pAct + sS : null
  const brechaFinal = hayPrecio && b.brecha ? (b.precio + b.dOferta) - (100 - b.precio + b.dDemanda) : 0

  const chips = []
  if (!hayPrecio) {
    chips.push({ etiqueta: 'Precio de equilibrio', valor: ((eF.p - e0.p) / e0.p) * 100 })
    chips.push({ etiqueta: 'Cantidad de equilibrio', valor: ((eF.q - e0.q) / e0.q) * 100 })
  } else if (b.brecha) {
    const q0 = a.precio !== undefined && a.brecha ? (a.precio + a.dOferta) - (100 - a.precio + a.dDemanda) : null
    chips.push({ etiqueta: brechaFinal > 0.5 ? 'Excedente' : brechaFinal < -0.5 ? 'Escasez' : 'Desequilibrio', valor: Math.abs(brechaFinal) < 0.5 ? 0 : null, texto: Math.abs(brechaFinal) < 0.5 ? 'cerrado' : `${f1(Math.abs(brechaFinal), 0)} unidades` })
    if (q0 !== null && Math.abs(q0) >= 0.5) chips.push({ etiqueta: 'Antes', valor: null, texto: `${q0 > 0 ? 'excedente' : 'escasez'} de ${f1(Math.abs(q0), 0)}` })
  } else {
    const qF = 100 - b.precio + b.dDemanda
    chips.push({ etiqueta: 'Cantidad demandada', valor: ((qF - e0.q) / e0.q) * 100 })
  }

  return (
    <>
      <svg className="gv__svg" viewBox="0 0 520 320" role="img" aria-label="Oferta y demanda">
        <defs>
          <clipPath id={`${id}c`}><rect x={X0} y={Y1 - 4} width={X1 - X0} height={Y0 - Y1 + 4} /></clipPath>
        </defs>
        <Ejes />
        <g clipPath={`url(#${id}c)`}>
          <path d={demanda(a.dDemanda)} className="gv__ghost" />
          <path d={oferta(a.dOferta)} className="gv__ghost" />
          <path d={demanda(sD)} className="gv__d" />
          <path d={oferta(sS)} className="gv__s" />
        </g>
        <text x={sx(Math.min(96, 100 + sD - 10)) } y={sy(4) + 2} className="gv__lbl gv__lbl--d">D</text>
        <text x={sx(Math.min(96, 100 + sS - 4))} y={sy(96)} className="gv__lbl gv__lbl--s">S</text>
        {!hayPrecio && (
          <>
            <circle cx={sx(e0.q)} cy={sy(e0.p)} r="6" className="gv__eq0" />
            <line x1={X0} x2={sx(e1.q)} y1={sy(e1.p)} y2={sy(e1.p)} className="gv__guia" />
            <line x1={sx(e1.q)} x2={sx(e1.q)} y1={sy(e1.p)} y2={Y0} className="gv__guia" />
            <circle cx={sx(e1.q)} cy={sy(e1.p)} r="7" className="gv__eq" />
          </>
        )}
        {hayPrecio && (
          <>
            <line x1={X0} x2={X1} y1={sy(pAct)} y2={sy(pAct)} className="gv__precio" />
            <text x={X1} y={sy(pAct) - 7} textAnchor="end" className="gv__et gv__et--p">Precio {f1(pAct, 0)}</text>
            {b.brecha ? (
              <>
                <line x1={sx(qd)} x2={sx(qs)} y1={sy(pAct)} y2={sy(pAct)} className="gv__brecha" />
                <circle cx={sx(qd)} cy={sy(pAct)} r="6" className="gv__pt gv__pt--d" />
                <circle cx={sx(qs)} cy={sy(pAct)} r="6" className="gv__pt gv__pt--s" />
              </>
            ) : (
              <circle cx={sx(qd)} cy={sy(pAct)} r="7" className="gv__eq" />
            )}
          </>
        )}
      </svg>
      <ul className="gv__chips">
        {chips.map((c) =>
          c.valor === null || c.texto ? (
            <li key={c.etiqueta} className="gv__chip gv__chip--flat"><span>{c.etiqueta}</span><b>{c.texto}</b></li>
          ) : (
            <Chip key={c.etiqueta} {...c} />
          ),
        )}
      </ul>
    </>
  )
}

/* -------------------------------- Elasticidad ---------------------------------- */
const clasifica = (e) => (e < 0.98 ? 'inelástica' : e > 1.02 ? 'elástica' : 'unitaria')

function Elasticidad({ spec, clave }) {
  const id = useId()
  const t = useProgreso(clave)
  const e = spec.e ?? 1
  const dQ = spec.dQ ?? 0
  const dP = spec.dPrecio ?? 0
  const ts = dQ && dP ? ease(clamp(t * 2)) : dQ ? t : 0
  const tp = dQ && dP ? ease(clamp(t * 2 - 1)) : dP ? t : 0

  const Q0 = 50
  const P0 = 50
  const Qs = Q0 * (1 + (dQ / 100) * ts) // cantidad al precio inicial con la curva desplazada
  const curva = (qBase) => {
    const d = Math.min(46, 46 / Math.max(e, 0.35))
    const q = (p) => qBase * (1 - (e * (p - P0)) / 50)
    return linea([[q(P0 - d), P0 - d], [q(P0 + d), P0 + d]])
  }
  const P1f = P0 * (1 + dP / 100)
  const Q1f = Q0 * (1 + dQ / 100) * (1 - (e * dP) / 100)
  const P = lerp(P0, P1f, tp)
  const Q = Qs * (1 - (e * (P - P0)) / 50)

  const ingreso0 = P0 * Q0
  const ingreso1 = P1f * Q1f
  const cambioQ = ((Q1f - Q0) / Q0) * 100
  const cambioI = ((ingreso1 - ingreso0) / ingreso0) * 100

  return (
    <>
      <svg className="gv__svg" viewBox="0 0 520 320" role="img" aria-label="Elasticidad de la demanda">
        <defs>
          <clipPath id={`${id}c`}><rect x={X0} y={Y1 - 4} width={X1 - X0} height={Y0 - Y1 + 4} /></clipPath>
        </defs>
        <Ejes />
        <rect x={X0} y={sy(P0)} width={sx(Q0) - X0} height={Y0 - sy(P0)} className="gv__ing0" />
        <rect x={X0} y={sy(P)} width={sx(Q) - X0} height={Y0 - sy(P)} className={`gv__ing1 ${ingreso1 >= ingreso0 ? 'is-up' : 'is-down'}`} />
        <g clipPath={`url(#${id}c)`}>
          <path d={curva(Q0)} className="gv__ghost" />
          <path d={curva(Qs)} className="gv__d" />
        </g>
        <text x={X0 + 10} y={sy(P0) + 18} className="gv__et gv__et--in">Ingreso total</text>
        <circle cx={sx(Q0)} cy={sy(P0)} r="6" className="gv__eq0" />
        <line x1={X0} x2={sx(Q)} y1={sy(P)} y2={sy(P)} className="gv__guia" />
        <line x1={sx(Q)} x2={sx(Q)} y1={sy(P)} y2={Y0} className="gv__guia" />
        <circle cx={sx(Q)} cy={sy(P)} r="7" className="gv__eq" />
        <text x={sx(Math.min(94, Qs + 44))} y={sy(Math.max(8, P0 - 40))} className="gv__lbl gv__lbl--d">D</text>
      </svg>
      <ul className="gv__chips">
        <li className="gv__chip gv__chip--flat"><span>Elasticidad</span><b>ε = {f1(e, 2)} · {clasifica(e)}</b></li>
        {dP !== 0 && <Chip etiqueta="Precio" valor={dP} />}
        <Chip etiqueta="Cantidad" valor={cambioQ} />
        <Chip etiqueta="Ingreso total" valor={cambioI} />
      </ul>
    </>
  )
}

/* ---------------------------------- Macro ------------------------------------- */
function Macro({ spec, clave }) {
  const t = useProgreso(clave, 1700)
  const serie = spec.serie ?? []
  const valor = spec.valor ?? serie[serie.length - 1]
  const d = spec.decimales ?? 1
  const todos = [...serie, valor, ...(spec.meta !== undefined ? [spec.meta] : [])]
  const lo = Math.min(...todos)
  const hi = Math.max(...todos)
  const pad = (hi - lo || 1) * 0.18
  const yy = (v) => Y0 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (Y0 - Y1)
  const n = serie.length + 1
  const xx = (i) => X0 + 16 + (i / (n - 1)) * (X1 - X0 - 40)
  const ultimo = serie[serie.length - 1]
  const vAct = lerp(ultimo, valor, t)
  const xAct = lerp(xx(n - 2), xx(n - 1), t)
  const hist = serie.map((v, i) => `${i ? 'L' : 'M'}${xx(i).toFixed(1)},${yy(v).toFixed(1)}`).join(' ')
  const cambio = valor - ultimo
  const cambioPct = ultimo ? (cambio / ultimo) * 100 : 0
  const unidad = spec.unidad ? ` ${spec.unidad}` : ''

  return (
    <>
      <svg className="gv__svg" viewBox="0 0 520 320" role="img" aria-label={spec.variable}>
        <path d={`M${X0},${Y1 - 6} V${Y0} H${X1 + 6}`} className="gv__ejes-p" />
        {spec.meta !== undefined && (
          <>
            <line x1={X0} x2={X1} y1={yy(spec.meta)} y2={yy(spec.meta)} className="gv__precio" />
            <text x={X1} y={yy(spec.meta) - 7} textAnchor="end" className="gv__et gv__et--p">Meta {f1(spec.meta, d)}{spec.unidad === '%' ? ' %' : ''}</text>
          </>
        )}
        <path d={hist} className="gv__d" />
        {serie.map((v, i) => <circle key={i} cx={xx(i)} cy={yy(v)} r="4" className="gv__pt gv__pt--h" />)}
        <path d={`M${xx(n - 2).toFixed(1)},${yy(ultimo).toFixed(1)} L${xAct.toFixed(1)},${yy(vAct).toFixed(1)}`} className="gv__s gv__s--macro" />
        <circle cx={xAct} cy={yy(vAct)} r="8" className="gv__eq" />
        <text x={Math.min(xAct, X1 - 30)} y={yy(vAct) - 16} textAnchor="middle" className="gv__valor">{f1(vAct, d)}{spec.unidad === '%' ? ' %' : ''}</text>
        <text x={xx(0)} y={Y0 + 22} className="gv__et">Antes</text>
        <text x={X1} y={Y0 + 22} textAnchor="end" className="gv__et">Ahora</text>
      </svg>
      <ul className="gv__chips">
        <li className="gv__chip gv__chip--flat"><span>{spec.variable}</span><b>{f1(ultimo, d)} → {f1(valor, d)}{unidad}</b></li>
        <Chip etiqueta="Variación" valor={cambioPct} />
      </ul>
    </>
  )
}

const TIPOS = {
  mercado: { Comp: Mercado, tag: 'Oferta y demanda', titulo: (s) => `Mercado de ${s.producto ?? 'tu producto'}` },
  elasticidad: { Comp: Elasticidad, tag: 'Elasticidad', titulo: (s) => `Demanda de ${s.producto ?? 'tu producto'}` },
  macro: { Comp: Macro, tag: 'Indicador macro', titulo: (s) => s.variable ?? 'Indicador' },
}

/** Gráfico vivo. `clave` cambia cuando hay que volver a animar (otra pregunta u otra noticia). */
export default function GraficoVivo({ spec, clave, etiqueta }) {
  const def = TIPOS[spec?.tipo]
  if (!def) return null
  const { Comp } = def
  return (
    <figure className="gv">
      <figcaption className="gv__head">
        <span className="gv__tag">{etiqueta ?? def.tag}</span>
        <b>{def.titulo(spec)}</b>
      </figcaption>
      <Comp spec={spec} clave={clave} />
      {spec.nota && <p className="gv__nota">{spec.nota}</p>}
    </figure>
  )
}
