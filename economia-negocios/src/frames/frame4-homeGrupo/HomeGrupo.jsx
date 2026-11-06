import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import AccountMenu from '../../components/AccountMenu'
import AuroraBackground from '../../components/AuroraBackground'
import GlassPanel from '../../components/GlassPanel'
import UaoLogo from '../../components/UaoLogo'
import ThemeSwitch from '../../components/ThemeSwitch'
import { ChevronIcon } from '../../components/Icons'
import { useTransition } from '../../components/PageTransition'
import { useData, progresoDeTema } from '../../data/DataContext'
import IsoScene from './IsoScene'
import { saludEmpresa, ETIQUETA_SALUD } from '../../sim/motor'
import './HomeGrupo.css'
import './IsoScene.css'

export default function HomeGrupo() {
  const { cursoId } = useParams()
  const go = useTransition()
  const { temas, cursos, empresas } = useData()
  const curso = cursos.find((c) => c.id === cursoId)
  const empresa = curso && empresas.find((e) => e.id === curso.empresaId)

  const [hover, setHover] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg) => setToast({ msg, key: Date.now() }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  if (!curso || !empresa) return <Navigate to="/" replace />
  // Primera vez en el grupo: antes del home va el contexto de la empresa.
  if (!curso.estado.contextoVisto) return <Navigate to={`/curso/${curso.id}/contexto`} replace />

  const progresos = Object.fromEntries(temas.map((t) => [t.id, progresoDeTema(curso, t.id)]))
  const openSimulacion = (t) => go(`/curso/${curso.id}/tema/${t.id}/simulacion`, { label: `Simulación T${t.orden}` })
  const indicadores = (curso.estado.indicadores ?? [])
    .map((i) => {
      const def = empresa.indicadores.find((d) => d.id === i.id)
      return def ? { ...def, valor: i.valor } : null
    })
    .filter(Boolean)

  const salud = saludEmpresa(empresa.indicadores, Object.fromEntries((curso.estado.indicadores ?? []).map((i) => [i.id, i.valor])))
  const openTema = (t) => go(`/curso/${curso.id}/tema/${t.id}`, { label: `Tema ${t.orden}` })

  return (
    <main className="home">
      <AuroraBackground variant="panel" />

      <header className="home__bar rise" style={{ '--d': 0 }}>
        <div className="home__head">
          <button type="button" className="chip-btn" onClick={() => go('/', { label: 'Mis cursos' })}>
            <span className="chip-btn__chev">
              <ChevronIcon size={16} />
            </span>
            Mis cursos
          </button>
          <div className="home__titles">
            <h1 className="home__title">{curso.nombre}</h1>
            <p className="home__eyebrow">{empresa.nombre}</p>
          </div>
        </div>
        <div className="home__tools">
          <UaoLogo height={22} className="home__uao" />
          <ThemeSwitch className="home__theme" />
          <button
            type="button"
            className="pill-btn pill-btn--sm replay"
            onClick={() => go(`/curso/${curso.id}/contexto`, { label: empresa.nombre, state: { replay: true } })}
          >
            Ver contexto
          </button>
          <AccountMenu onNotice={showToast} />
        </div>
      </header>

      <div className="home__mid">
        <aside className="metrics rise" style={{ '--d': 1 }} aria-label="Métricas de la empresa">
          <h2 className="metrics__title">Métricas de la empresa</h2>
          <p className={`salud salud--${salud}`}>
            <i aria-hidden="true" />
            {ETIQUETA_SALUD[salud]}
          </p>
          <ul className="metrics__list">
            {indicadores.map((i) => {
              const min = i.min ?? 0
              const max = i.max ?? 100
              const w = Math.min(1, Math.max(0, (i.valor - min) / (max - min || 1)))
              return (
                <li key={i.id} className="metric">
                  <span className="metric__name">{i.nombre}</span>
                  <b className="metric__val">{Math.round(i.valor)}</b>
                  <i className="metric__bar" style={{ '--w': w }} />
                </li>
              )
            })}
          </ul>
        </aside>
        <section className="home__scene rise" style={{ '--d': 1 }}>
          <IsoScene temas={temas} progreso={progresos} activeId={hover} onHover={setHover} onSelect={openTema} salud={salud} />
        </section>
      </div>

      <ol className="tcards">
        {temas.map((t, i) => {
          const p = progresos[t.id]
          return (
            <li
              key={t.id}
              className={`tcard rise${p.completo ? ' is-done' : ''}${hover === t.id ? ' is-active' : ''}`}
              style={{ '--d': 2 + i }}
              onMouseEnter={() => setHover(t.id)}
              onMouseLeave={() => setHover(null)}
            >
              {p.completo && (
                <span className="tcard__check" aria-label="Tema completado">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
              )}
              <p className="tcard__n">Tema {t.orden}</p>
              <h2 className="tcard__name">{t.nombre}</h2>
              <ul className="tcard__st">
                <li className={p.teoria ? 'ok' : ''}>{p.teoria ? 'Teoría vista' : 'Teoría pendiente'}</li>
                <li className={p.simulacion ? 'ok' : ''}>{p.simulacion ? 'Simulación realizada' : 'Sin simulación'}</li>
              </ul>
              <div className="tcard__acts">
                <button type="button" className="pill-btn tcard__go" onClick={() => openTema(t)}>
                  {p.completo ? 'Repasar tema' : 'Ir a Tema'}
                </button>
                {p.teoria && !p.simulacion && (
                  <button type="button" className="pill-btn tcard__sim" onClick={() => openSimulacion(t)}>
                    Hacer simulación
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <GlassPanel key={toast.key} className="glass--dense toast">
            {toast.msg}
          </GlassPanel>
        )}
      </div>
    </main>
  )
}
