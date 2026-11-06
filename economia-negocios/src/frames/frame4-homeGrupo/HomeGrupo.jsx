import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import AccountMenu from '../../components/AccountMenu'
import AuroraBackground from '../../components/AuroraBackground'
import GlassPanel from '../../components/GlassPanel'
import UaoLogo from '../../components/UaoLogo'
import { ChevronIcon } from '../../components/Icons'
import { useTransition } from '../../components/PageTransition'
import { useData } from '../../data/DataContext'
import IsoScene from './IsoScene'
import './HomeGrupo.css'
import './IsoScene.css'

const ESTADO = { pendiente: 'Pendiente', 'en-curso': 'En curso', completado: 'Completado' }

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

  const progreso = curso.estado.progresoTemas ?? {}
  const indicadores = (curso.estado.indicadores ?? [])
    .map((i) => {
      const def = empresa.indicadores.find((d) => d.id === i.id)
      return def ? { ...def, valor: i.valor } : null
    })
    .filter(Boolean)

  const openTema = (t) => showToast(`El Tema ${t.orden} se abre en el siguiente frame`)

  return (
    <main className="home">
      <AuroraBackground variant="panel" />

      <header className="home__bar rise" style={{ '--d': 0 }}>
        <button type="button" className="chip-btn" onClick={() => go('/', { label: 'Mis cursos' })}>
          <span className="chip-btn__chev">
            <ChevronIcon size={16} />
          </span>
          Mis cursos
        </button>
        <UaoLogo height={24} className="home__uao" />
        <AccountMenu onNotice={showToast} />
      </header>

      <section className="home__grid">
        <div className="home__stage rise" style={{ '--d': 1 }}>
          <p className="home__eyebrow">{empresa.nombre}</p>
          <h1 className="home__title">{curso.nombre}</h1>
          <IsoScene
            temas={temas}
            progreso={progreso}
            activeId={hover}
            onHover={setHover}
            onSelect={openTema}
          />
        </div>

        <aside className="home__side">
          <GlassPanel flat className="side-card rise" style={{ '--d': 2 }}>
            <h2 className="side-card__title">Temas</h2>
            <ol className="temas">
              {temas.map((t) => {
                const estado = progreso[t.id] ?? 'pendiente'
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`tema${hover === t.id ? ' is-active' : ''}`}
                      onMouseEnter={() => setHover(t.id)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(t.id)}
                      onBlur={() => setHover(null)}
                      onClick={() => openTema(t)}
                    >
                      <span className="tema__n">{t.orden}</span>
                      <span className="tema__body">
                        <span className="tema__name">{t.nombre}</span>
                        <span className={`tema__state tema__state--${estado}`}>{ESTADO[estado] ?? estado}</span>
                      </span>
                      <ChevronIcon size={18} />
                    </button>
                  </li>
                )
              })}
            </ol>
          </GlassPanel>

          <GlassPanel flat className="side-card rise" style={{ '--d': 3 }}>
            <h2 className="side-card__title">Indicadores</h2>
            <ul className="inds-mini">
              {indicadores.map((i) => (
                <li key={i.id}>
                  <span>{i.nombre}</span>
                  <b>{Math.round(i.valor)}</b>
                  <i style={{ '--w': Math.min(1, Math.max(0, (i.valor - (i.min ?? 0)) / ((i.max ?? 100) - (i.min ?? 0)))) }} />
                </li>
              ))}
            </ul>
          </GlassPanel>

          <button
            type="button"
            className="pill-btn replay rise"
            style={{ '--d': 4 }}
            onClick={() => go(`/curso/${curso.id}/contexto`, { label: empresa.nombre, state: { replay: true } })}
          >
            Ver contexto de la empresa
          </button>
        </aside>
      </section>

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
