import { Scene, WordReveal } from '../ScrollEngine'
import { Ciclo, Elasticidad, Mercado } from './Graficos'

const pad = (n) => String(n).padStart(2, '0')
const fmt = (n) => new Intl.NumberFormat('es-CO').format(n)

/** Portada del tema: el número y el título entran con movimiento. */
export function Portada({ t }) {
  const words = t.titulo.split(' ')
  return (
    <Scene height={170} className="s-hero">
      <div className="hero scene__pin-fill">
        <span className="hero__sq hero__sq--a" aria-hidden="true" />
        <span className="hero__sq hero__sq--b" aria-hidden="true" />
        <span className="hero__ring" aria-hidden="true" />
        <span className="hero__ring hero__ring--2" aria-hidden="true" />
        <div className="hero__body">
          <p className="hero__tag">{t.empresa}</p>
          <p className="tp-num" aria-hidden="true">{t.kicker}</p>
          <h1 className="tp-title">
            {words.map((w, i) => (
              <span key={i} className="hero__l" style={{ '--i': i * 2 }}>
                {w}{' '}
              </span>
            ))}
          </h1>
          <p className="tp-sub">{t.subtitulo}</p>
          <div className="hero__meta">
            {t.chips.map((c) => (
              <span key={c} className="chip">{c}</span>
            ))}
          </div>
        </div>
        <div className="hero__hint" aria-hidden="true">
          Desliza
          <i />
        </div>
      </div>
    </Scene>
  )
}

export function Statement({ s }) {
  return (
    <Scene height={Math.max(240, 110 + s.texto.split(/\s+/).length * 8)}>
      <div className="scene__pin-fill">
        <p className="kicker">{s.kicker}</p>
        <WordReveal text={s.texto} className="words--long" />
      </div>
    </Scene>
  )
}

export function Definicion({ s }) {
  return (
    <Scene height={300}>
      <div className="def scene__pin-fill">
        <p className="kicker">{s.kicker}</p>
        <h2 className="def__term">{s.termino}</h2>
        <WordReveal text={s.definicion} className="def__text" from={0.12} to={0.7} />
        <div className="facts">
          {s.ejemplos?.map((e) => (
            <span key={e} className="chip">{e}</span>
          ))}
        </div>
      </div>
    </Scene>
  )
}

/** Tarjetas que van entrando una a una. */
export function Tarjetas({ s }) {
  const n = s.items.length
  const cols = s.columnas ?? (n <= 3 ? n : n === 4 ? 2 : 3)
  return (
    <Scene height={170 + n * 42}>
      <div className="cards scene__pin-fill">
        <p className="kicker">{s.kicker}</p>
        <h2 className="tp-h2 tp-h2--wide">{s.titulo}</h2>
        <div className="cards__grid" style={{ '--n': n, '--cols': cols }}>
          {s.items.map((it, i) => (
            <article key={i} className="ccard" style={{ '--i': i }}>
              {it.etiqueta && <p className="ccard__tag">{it.etiqueta}</p>}
              {it.valor && <p className="ccard__val">{it.valor}</p>}
              <h3 className="ccard__t">{it.titulo}</h3>
              <p className="ccard__d">{it.texto}</p>
            </article>
          ))}
        </div>
      </div>
    </Scene>
  )
}

/** Preguntas / situaciones: pila de tarjetas (igual que la situación de la empresa). */
export function Preguntas({ s }) {
  const n = s.items.length
  return (
    <Scene height={160 + n * 90}>
      <div className="stack scene__pin-fill">
        <div>
          <p className="kicker">{s.kicker}</p>
          <h2 className="stack__title">{s.titulo}</h2>
        </div>
        <div className="stack__deck">
          {s.items.map((t, i) => (
            <p key={i} className="scard" style={{ '--i': i, '--n': n }}>
              {t}
            </p>
          ))}
        </div>
      </div>
    </Scene>
  )
}

/** Pasos: el que toca se enfoca (misma mecánica que los retos de la empresa). */
export function Pasos({ s }) {
  const n = s.items.length
  return (
    <Scene height={140 + n * 100}>
      <div className="retos steps scene__pin-fill" style={{ '--n': n }}>
        <div className="retos__head">
          <p className="kicker">{s.kicker}</p>
          <h2 className="retos__title retos__title--sm">{s.titulo}</h2>
        </div>
        <div className="retos__view">
          <div className="retos__list">
            {s.items.map((it, i) => (
              <div key={i} className="reto" style={{ '--i': i }}>
                <span className="reto__n" aria-hidden="true">{pad(i + 1)}</span>
                <div>
                  <p className="step__t">{it.titulo}</p>
                  <p className="reto__t">{it.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Scene>
  )
}

/** Dos (o más) columnas que se abren y van listando sus puntos. */
export function Comparar({ s }) {
  const n = s.columnas.length
  return (
    <Scene height={260 + n * 40}>
      <div className="cmp scene__pin-fill">
        <p className="kicker">{s.kicker}</p>
        <h2 className="tp-h2 tp-h2--wide">{s.titulo}</h2>
        <div className="cmp__cols" style={{ '--n': n }}>
          {s.columnas.map((c, ci) => (
            <section key={ci} className="cmp__col" style={{ '--c': ci, '--side': ci % 2 ? 1 : -1 }}>
              <h3 className="cmp__t">{c.titulo}</h3>
              <p className="cmp__s">{c.subtitulo}</p>
              <ul>
                {c.puntos.map((p, i) => (
                  <li key={i} style={{ '--k': i + ci * 0.4 }}>{p}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {s.nota && <p className="cmp__note">{s.nota}</p>}
      </div>
    </Scene>
  )
}

/** Cadena de causas y efectos, nodo por nodo. */
export function Cadena({ s }) {
  const total = s.filas.reduce((a, f) => a + f.nodos.length, 0)
  let g = 0
  return (
    <Scene height={200 + total * 55}>
      <div className="chain scene__pin-fill" style={{ '--n': total }}>
        <p className="kicker">{s.kicker}</p>
        <h2 className="tp-h2 tp-h2--wide">{s.titulo}</h2>
        {s.filas.map((fila, r) => (
          <div key={r} className="chain__row">
            <p className="chain__tag" style={{ '--i': g }}>{fila.etiqueta}</p>
            <div className="chain__nodes">
              {fila.nodos.map((n, k) => {
                const i = g++
                return (
                  <div key={k} className="chain__node" style={{ '--i': i }}>
                    <span className="chain__n">{k + 1}</span>
                    <h3>{n.titulo}</h3>
                    <p>{n.texto}</p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Scene>
  )
}

/** Cifras con barra proporcional. */
export function Cifras({ s }) {
  return (
    <Scene height={230 + s.items.length * 30}>
      <div className="cif scene__pin-fill">
        <p className="kicker">{s.kicker}</p>
        <h2 className="tp-h2 tp-h2--wide">{s.titulo}</h2>
        <div className="cif__list">
          {s.items.map((it, i) => (
            <div key={i} className="cif__item" style={{ '--i': i, '--w': it.valor / s.max }}>
              <p className="cif__big">{it.texto}</p>
              <div className="cif__bar"><i /></div>
              <p className="cif__lab">{it.etiqueta}</p>
              <p className="cif__det">{it.detalle}</p>
            </div>
          ))}
        </div>
        {s.nota && <p className="cmp__note">{s.nota}</p>}
      </div>
    </Scene>
  )
}

/** Grupos de barras que suben de a uno (antes/después). */
export function Barras({ s }) {
  const G = s.grupos.length
  const max = Math.max(...s.grupos.flatMap((g) => g.barras.map((b) => b.valor))) * 1.12
  return (
    <Scene height={170 + G * 150} className="scene--light">
      <div className="bars scene__pin-fill" style={{ '--G': G }}>
        <p className="kicker">{s.kicker}</p>
        <h2 className="tp-h2 tp-h2--wide tp-h2--dark">{s.titulo}</h2>
        <div className="bars__groups">
          {s.grupos.map((g, gi) => (
            <section key={gi} className="bgrp" style={{ '--g': gi }}>
              <h3 className="bgrp__t">{g.titulo}</h3>
              <p className="bgrp__a">{g.accion}</p>
              <div className="bgrp__plot">
                {g.barras.map((b, bi) => (
                  <div key={bi} className={`bar${b.destacar ? ' bar--hi' : ''}`} style={{ '--h': b.valor / max, '--b': bi }}>
                    <span className="bar__v">{b.texto ?? fmt(b.valor)}</span>
                    <i />
                    <span className="bar__l">{b.etiqueta}</span>
                  </div>
                ))}
              </div>
              <p className="bgrp__e">{g.efecto}</p>
              <p className="bgrp__r">{g.resultado}</p>
            </section>
          ))}
        </div>
      </div>
    </Scene>
  )
}

export function Cierre({ t, onVolver, onSimular, simulacionLista = false }) {
  return (
    <Scene height={210} id="cierre">
      <div className="fin scene__pin-fill tp-fin">
        <span className="fin__big" aria-hidden="true">{t.kicker}</span>
        <div className="fin__body">
          <h2 className="fin__title">{t.cierre.titulo}</h2>
          <ul className="tp-sum">
            {t.cierre.puntos.map((p, i) => (
              <li key={i} style={{ '--i': i }}>{p}</li>
            ))}
          </ul>
          <div className="tp-actions">
            <button type="button" className="cta" onClick={onVolver}>Volver al grupo</button>
            <button type="button" className="cta cta--ghost" onClick={onSimular} disabled={!simulacionLista}>
              Hacer la simulación
              {!simulacionLista && <small>Próximamente</small>}
            </button>
          </div>
        </div>
      </div>
    </Scene>
  )
}

const LIGHT = new Set(['mercado', 'elasticidad', 'ciclo', 'barras'])
export const esClara = (tipo) => LIGHT.has(tipo)

export function Seccion({ s }) {
  switch (s.tipo) {
    case 'statement': return <Statement s={s} />
    case 'definicion': return <Definicion s={s} />
    case 'tarjetas': return <Tarjetas s={s} />
    case 'preguntas': return <Preguntas s={s} />
    case 'pasos': return <Pasos s={s} />
    case 'comparar': return <Comparar s={s} />
    case 'cadena': return <Cadena s={s} />
    case 'cifras': return <Cifras s={s} />
    case 'barras': return <Barras s={s} />
    case 'mercado': return <Mercado cfg={s} height={380 + s.fases.length * 70} />
    case 'elasticidad': return <Elasticidad cfg={s} height={260 + s.etapas.length * 90} />
    case 'ciclo': return <Ciclo cfg={s} height={300 + s.fases.length * 70} />
    default: return null
  }
}
