import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import UaoLogo from '../../components/UaoLogo'
import { useTransition } from '../../components/PageTransition'
import { useData } from '../../data/DataContext'
import { Scene, ScrollyRoot, WordReveal, toItems } from '../../scrolly/ScrollEngine'

/**
 * Contexto de la empresa en scrollytelling. Se arma solo con lo que el docente
 * llenó al crear la empresa: las secciones vacías simplemente no aparecen.
 *
 * Primera vez en el curso: al terminar (o al saltar) se marca como visto y se
 * entra al home del grupo. Desde el home se puede volver a ver (`state.replay`).
 */
const pad = (n) => String(n).padStart(2, '0')

export default function ContextoEmpresa() {
  const { cursoId } = useParams()
  const { state } = useLocation()
  const replay = Boolean(state?.replay)
  const go = useTransition()
  const { cursos, empresas, markContextoVisto } = useData()
  const curso = cursos.find((c) => c.id === cursoId)
  const empresa = curso && empresas.find((e) => e.id === curso.empresaId)

  const [active, setActive] = useState(0)

  // Texto de cada capítulo; lo que está vacío no genera escena.
  const story = useMemo(() => {
    if (!empresa) return null
    const contexto = (empresa.contexto || empresa.actividad || '').trim()
    const historia = toItems(empresa.historia)
    const productos = toItems(empresa.productos).slice(0, 6)
    const publico = (empresa.publico ?? '').trim()
    const situacion = toItems(empresa.situacion).slice(0, 5)
    const retos = toItems(empresa.retos).slice(0, 6)
    const indicadores = (curso.estado.indicadores ?? [])
      .map((i) => {
        const def = empresa.indicadores.find((d) => d.id === i.id)
        return def ? { id: i.id, nombre: def.nombre, valor: Math.round(i.valor), max: def.max ?? 100 } : null
      })
      .filter(Boolean)
    const missing = [
      !contexto && 'contexto',
      !historia.length && 'historia',
      !productos.length && 'productos',
      !publico && 'público objetivo',
      !situacion.length && 'situación actual',
      !retos.length && 'retos',
    ].filter(Boolean)
    return { contexto, historia, productos, publico, situacion, retos, indicadores, missing }
  }, [empresa, curso])

  const finish = useCallback(() => {
    markContextoVisto(cursoId)
    go(`/curso/${cursoId}`, { label: curso?.nombre ?? '' })
  }, [cursoId, curso, go, markContextoVisto])

  // Escape = saltar (lo mismo que el botón).
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && finish()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [finish])

  if (!curso || !empresa) return <Navigate to="/" replace />

  const { contexto, historia, productos, publico, situacion, retos, indicadores, missing } = story
  const letters = Array.from(empresa.nombre)

  // Capítulos en orden, para el contador "03 / 08" y el tono de la interfaz fija.
  const keys = [
    'hero',
    contexto && 'contexto',
    historia.length > 0 && 'historia',
    productos.length > 0 && 'productos',
    publico && 'publico',
    situacion.length > 0 && 'situacion',
    retos.length > 0 && 'retos',
    indicadores.length > 0 && 'indicadores',
    'fin',
  ].filter(Boolean)
  const chapters = keys.length

  return (
    <main className="scrolly-page" aria-label={`Contexto de ${empresa.nombre}`}>
      <ScrollyRoot onSceneChange={setActive}>
        <div className="scrolly__bg" aria-hidden="true" />

        <div className={`sc-ui${keys[active] === 'publico' ? ' sc-ui--light' : ''}`}>
          <div className="sc-ui__bar" aria-hidden="true" />
          <div className="sc-ui__top">
            <span className="sc-ui__brand">{empresa.nombre}</span>
            <UaoLogo height={22} className="sc-ui__uao" />
            <button type="button" className="sc-ui__skip" onClick={finish}>
              {replay ? 'Volver al grupo' : 'Saltar'}
            </button>
          </div>
          <span className="sc-ui__count" aria-hidden="true">
            {pad(Math.min(active + 1, chapters))} / {pad(chapters)}
          </span>
        </div>

        {/* 0 · Portada */}
        <Scene height={170} className="s-hero">
          <div className="hero scene__pin-fill">
            <span className="hero__sq hero__sq--a" aria-hidden="true" />
            <span className="hero__sq hero__sq--b" aria-hidden="true" />
            <span className="hero__ring" aria-hidden="true" />
            <span className="hero__ring hero__ring--2" aria-hidden="true" />
            <div className="hero__body">
              <span className="hero__logo">
                {empresa.logo ? <img src={empresa.logo} alt="" /> : <span>{empresa.nombre[0]}</span>}
              </span>
              <p className="hero__tag">{curso.nombre} · Contexto de la empresa</p>
              <h1 className="hero__name" aria-label={empresa.nombre}>
                {letters.map((l, i) => (
                  <span key={i} className="hero__l" style={{ '--i': i }} aria-hidden="true">
                    {l === ' ' ? ' ' : l}
                  </span>
                ))}
              </h1>
              {(empresa.sector || empresa.actividad) && (
                <div className="hero__meta">
                  {empresa.sector && <span className="chip">{empresa.sector}</span>}
                  {empresa.ficticia && <span className="chip">Empresa ficticia</span>}
                </div>
              )}
            </div>
            <div className="hero__hint" aria-hidden="true">
              Desliza
              <i />
            </div>
          </div>
        </Scene>

        {/* 1 · Quiénes somos */}
        {contexto && (
          <Scene height={Math.max(240, 110 + contexto.split(/\s+/).length * 7)}>
            <div className="scene__pin-fill">
              <p className="kicker">Quiénes somos</p>
              <WordReveal text={contexto} className={contexto.length > 90 ? 'words--long' : ''} />
              {empresa.actividad && contexto !== empresa.actividad && (
                <div className="facts">
                  <span className="chip">{empresa.actividad}</span>
                </div>
              )}
            </div>
          </Scene>
        )}

        {/* 2 · Historia (galería horizontal) */}
        {historia.length > 0 && (
          <Scene height={150 + historia.length * 90}>
            <div className="gallery scene__pin-fill" style={{ '--n': historia.length }}>
              <p className="kicker">Nuestra historia</p>
              <div className="gallery__track">
                {historia.map((t, i) => (
                  <article key={i} className="gcard">
                    <span className="gcard__n" aria-hidden="true">
                      {pad(i + 1)}
                    </span>
                    <p className="gcard__t">{t}</p>
                  </article>
                ))}
              </div>
            </div>
          </Scene>
        )}

        {/* 3 · Productos (marquesinas) */}
        {productos.length > 0 && (
          <Scene height={220 + productos.length * 40}>
            <div className="marq scene__pin-fill">
              <p className="kicker">Lo que hacemos</p>
              {productos.map((p, i) => (
                <div
                  key={i}
                  className="marq__row"
                  style={{ '--dir': i % 2 ? 1 : -1 }}
                >
                  {Array.from({ length: 7 }, (_, k) => (
                    <span key={k} aria-hidden={k > 0 ? 'true' : undefined} style={{ display: 'contents' }}>
                      <span>{p}</span>
                      <i>✦</i>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </Scene>
        )}

        {/* 4 · Público (iris) */}
        {publico && (
          <Scene height={260} className="s-iris">
            <div className="iris scene__pin-fill">
              <span className="iris__disc" aria-hidden="true" />
              <div className="iris__body">
                <p className="kicker">A quién servimos</p>
                <p className="iris__text">{publico}</p>
              </div>
            </div>
          </Scene>
        )}

        {/* 5 · Situación (pila de tarjetas) */}
        {situacion.length > 0 && (
          <Scene height={160 + situacion.length * 90}>
            <div className="stack scene__pin-fill">
              <div>
                <p className="kicker">Dónde estamos hoy</p>
                <h2 className="stack__title">La situación actual</h2>
              </div>
              <div className="stack__deck" style={{ '--n': situacion.length }}>
                {situacion.map((t, i) => (
                  <p key={i} className="scard" style={{ '--i': i, '--n': situacion.length }}>
                    {t}
                  </p>
                ))}
              </div>
            </div>
          </Scene>
        )}

        {/* 6 · Retos */}
        {retos.length > 0 && (
          <Scene height={120 + retos.length * 100}>
            <div className="retos scene__pin-fill" style={{ '--n': retos.length }}>
              <div className="retos__head">
                <p className="kicker">Lo que viene</p>
                <h2 className="retos__title">Los retos</h2>
              </div>
              <div className="retos__view">
                <div className="retos__list">
                  {retos.map((t, i) => (
                    <div key={i} className="reto" style={{ '--i': i }}>
                      <span className="reto__n" aria-hidden="true">
                        {pad(i + 1)}
                      </span>
                      <p className="reto__t">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Scene>
        )}

        {/* 7 · Indicadores */}
        {indicadores.length > 0 && (
          <Scene height={190 + indicadores.length * 30}>
            <div className="inds scene__pin-fill">
              <p className="kicker">Así arranca el grupo</p>
              <h2 className="inds__title">Los indicadores de partida</h2>
              <div className="inds__list">
                {indicadores.map((ind, i) => (
                  <div key={ind.id} className="sind" style={{ '--i': i, '--val': ind.valor, '--max': ind.max }}>
                    <span className="sind__name">{ind.nombre}</span>
                    <span className="sind__num" role="img" aria-label={`${ind.valor}`} />
                    <span className="sind__bar" />
                  </div>
                ))}
              </div>
            </div>
          </Scene>
        )}

        {/* 8 · Cierre */}
        <Scene height={150}>
          <div className="fin scene__pin-fill">
            <span className="fin__big" aria-hidden="true">
              {empresa.nombre}
            </span>
            <div className="fin__body">
              <h2 className="fin__title">{replay ? 'Eso es todo' : 'Ahora le toca a tu grupo'}</h2>
              <p className="fin__sub">
                {replay
                  ? 'Cuando quieras, vuelve al grupo para seguir con los temas.'
                  : `Cada decisión mueve los indicadores de ${empresa.nombre}. Entremos al grupo.`}
              </p>
              <button type="button" className="cta" onClick={finish}>
                {replay ? 'Volver al grupo' : 'Entrar al grupo'}
              </button>
              {missing.length > 0 && (
                <p className="fin__hint">
                  Faltan secciones por completar ({missing.join(', ')}).{' '}
                  <a
                    href={`/empresas/${empresa.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      go(`/empresas/${empresa.id}`, { label: empresa.nombre })
                    }}
                  >
                    Editar empresa
                  </a>
                </p>
              )}
            </div>
          </div>
        </Scene>
      </ScrollyRoot>
    </main>
  )
}
