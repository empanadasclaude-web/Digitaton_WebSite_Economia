import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTransition } from '../../components/PageTransition'
import UaoLogo from '../../components/UaoLogo'
import { useData } from '../../data/DataContext'
import { ScrollyRoot } from '../../scrolly/ScrollEngine'
import { Cierre, Portada, Seccion, esClara } from '../../scrolly/teoria/Escenas'
import '../../scrolly/teoria/teoria.css'

const pad = (n) => String(n).padStart(2, '0')

/**
 * Teoría de un tema en scrollytelling. El contenido sale de `seed/teoria.json`
 * (secciones con un `tipo` que decide qué escena se dibuja), así el docente
 * explica avanzando con el scroll. Al llegar al cierre el tema queda como
 * "teoría vista" en el grupo.
 */
export default function TemaTeoria() {
  const { cursoId, temaId } = useParams()
  const go = useTransition()
  const { cursos, empresas, temas, teoria, markTeoriaVista } = useData()
  const curso = cursos.find((c) => c.id === cursoId)
  const empresa = curso && empresas.find((e) => e.id === curso.empresaId)
  const tema = temas.find((t) => t.id === temaId)
  const contenido = teoria[temaId]
  const [active, setActive] = useState(0)

  const secciones = contenido?.secciones ?? []
  // Orden de escenas: portada, secciones, cierre.
  const keys = useMemo(
    () => [{ tipo: 'portada' }, ...secciones, { tipo: 'cierre' }],
    [secciones],
  )
  const total = keys.length
  const llegoAlCierre = active >= total - 1

  useEffect(() => {
    if (llegoAlCierre && curso) markTeoriaVista(cursoId, temaId)
  }, [llegoAlCierre, curso, cursoId, temaId, markTeoriaVista])

  const volver = useCallback(
    () => go(`/curso/${cursoId}`, { label: curso?.nombre ?? '' }),
    [go, cursoId, curso],
  )

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && volver()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [volver])

  if (!curso || !empresa || !tema || !contenido) return <Navigate to={curso ? `/curso/${cursoId}` : '/'} replace />

  const claro = esClara(keys[active]?.tipo)
  const portada = { ...contenido, empresa: `${curso.nombre} · ${empresa.nombre}` }

  return (
    <main className="scrolly-page scrolly-page--teoria" aria-label={`Teoría: ${contenido.titulo}`}>
      <ScrollyRoot onSceneChange={setActive}>
        <div className="scrolly__bg" aria-hidden="true" />
        <div className={`sc-ui${claro ? ' sc-ui--light' : ''}`}>
          <div className="sc-ui__bar" aria-hidden="true" />
          <div className="sc-ui__top">
            <span className="sc-ui__brand">{contenido.kicker} · {contenido.titulo}</span>
            <UaoLogo height={22} className="sc-ui__uao" />
            <button type="button" className="sc-ui__skip" onClick={volver}>Volver al grupo</button>
          </div>
          <span className="sc-ui__count" aria-hidden="true">
            {pad(Math.min(active + 1, total))} / {pad(total)}
          </span>
        </div>

        <Portada t={portada} />
        {secciones.map((s, i) => (
          <Seccion key={i} s={s} />
        ))}
        <Cierre t={contenido} onVolver={volver} onSimular={() => go(`/curso/${cursoId}/tema/${temaId}/simulacion`, { label: `Simulación T${tema.orden}` })} simulacionLista />
      </ScrollyRoot>
    </main>
  )
}
