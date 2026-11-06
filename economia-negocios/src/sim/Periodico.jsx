import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { armarPeriodico } from './armarPeriodico'
import './Periodico.css'

const TINTAS = ['#1b1410', '#a11d2d', '#2b6a4f', '#9a6b00', '#3b4b9a']
const nf = (n) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)

/** Evolución de los indicadores en tinta de periódico. */
function Grafico({ datos }) {
  const W = 420
  const H = 170
  const inds = datos.indicadores
  const pasos = datos.linea?.length
    ? datos.linea
    : [{ tipo: 'inicio', valores: datos.valoresIniciales }, ...datos.preguntas.map((p) => ({ tipo: 'decision', valores: p.decision.despues }))]
  const x = (i) => 28 + (i / Math.max(1, pasos.length - 1)) * (W - 44)
  const y = (v, ind) => H - 22 - ((v - ind.min) / (ind.max - ind.min || 1)) * (H - 38)
  return (
    <figure className="pp__fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución de los indicadores">
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1="28" x2={W - 14} y1={H - 22 - t * (H - 38)} y2={H - 22 - t * (H - 38)} className="pp__gl" />
        ))}
        {inds.map((ind, k) => (
          <polyline key={ind.id} fill="none" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" stroke={TINTAS[k % TINTAS.length]} strokeDasharray={k > 2 ? '5 3' : undefined} points={pasos.map((p, i) => `${x(i)},${y(p.valores[ind.id], ind)}`).join(' ')} />
        ))}
        {pasos.map((p, i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="pp__tick">
            {p.tipo === 'inicio' ? 'Inicio' : p.tipo === 'noticia' ? '⚡' : (p.indice ?? i - pasos.slice(0, i).filter((q) => q.tipo === 'noticia').length) + 1}
          </text>
        ))}
      </svg>
      <figcaption>
        {inds.map((ind, k) => (
          <span key={ind.id}>
            <i style={{ background: TINTAS[k % TINTAS.length] }} />
            {ind.nombre}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

/** Portada de periódico generada con los datos de una simulación. */
export default function Periodico({ datos, onClose }) {
  const p = useMemo(() => armarPeriodico(datos), [datos])

  useEffect(() => {
    const prev = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      prev?.focus?.()
    }
  }, [onClose])

  const h = p.historias
  return createPortal(
    <div className="pp" role="dialog" aria-modal="true" aria-label={p.masthead} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pp__tools">
        <button type="button" className="pill-btn" onClick={() => window.print()}>
          Imprimir / guardar PDF
        </button>
        <button type="button" className="pill-btn pill-btn--ghost" onClick={onClose} autoFocus>
          Cerrar
        </button>
      </div>

      <article className="pp__sheet">
        <div className="pp__top">
          <span>{p.fechaTexto}</span>
          <span>Edición especial · {p.curso}</span>
          <span>{p.tema}</span>
        </div>
        <h1 className="pp__mast">{p.masthead}</h1>
        <div className="pp__rule" />
        <p className="pp__sub">Economía de los Negocios · Simulación de {p.empresa}</p>

        <div className="pp__grid">
          <section className="pp__main">
            <p className="pp__kicker">Portada</p>
            <h2 className="pp__headline">{p.titular}</h2>
            <p className="pp__lead">{p.bajada}</p>
            <Grafico datos={datos} />
            <p className="pp__small">
              {p.participacion.participantes} {p.participacion.participantes === 1 ? 'participante' : 'participantes'} · {p.participacion.pct} % de participación en las votaciones. La participación no es una calificación.
            </p>
          </section>

          <aside className="pp__side">
            {p.ultimaHora.length > 0 && (
              <section className="pp__box pp__box--alert">
                <p className="pp__kicker pp__kicker--alert">⚡ Última hora</p>
                {p.ultimaHora.map((n) => (
                  <div key={n.titular} className="pp__news">
                    <h3>{n.titular}</h3>
                    <p>{n.detalle}</p>
                    {n.cambios.length > 0 && (
                      <p className="pp__fx">
                        {n.cambios.map((c) => (
                          <span key={c.nombre} className={c.delta > 0 ? 'up' : 'down'}>
                            {c.nombre} {c.delta > 0 ? '▲' : '▼'} {Math.abs(c.delta)}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                ))}
              </section>
            )}
            {['dividida', 'impacto', 'unanime'].map((k) =>
              h[k] ? (
                <section key={k} className="pp__box">
                  <p className="pp__kicker">{h[k].kicker}</p>
                  <h3>{h[k].titulo}</h3>
                  <p>{h[k].cuerpo}</p>
                </section>
              ) : null,
            )}
          </aside>
        </div>

        <section className="pp__decs">
          <p className="pp__kicker">Las decisiones del curso</p>
          <ol>
            {p.resumenDecisiones.map((d) => (
              <li key={d.n}>
                <b>{d.concepto}.</b> {d.texto}
              </li>
            ))}
          </ol>
        </section>

        <footer className="pp__ticker" aria-label="Cotizaciones de los indicadores">
          <span className="pp__ticker-t">Cotizaciones</span>
          {p.cotizaciones.map((c) => (
            <span key={c.id} className={`pp__q ${c.delta > 0 ? 'up' : c.delta < 0 ? 'down' : ''}`}>
              {c.nombre} <b>{nf(c.hasta)}</b> {c.delta > 0 ? '▲' : c.delta < 0 ? '▼' : '='} {nf(Math.abs(c.delta))}
            </span>
          ))}
        </footer>
      </article>
    </div>,
    document.body,
  )
}
