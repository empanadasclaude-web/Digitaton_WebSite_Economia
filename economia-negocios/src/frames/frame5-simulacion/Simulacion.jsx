import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import AccountMenu from '../../components/AccountMenu'
import AuroraBackground from '../../components/AuroraBackground'
import ConfirmDialog from '../../components/ConfirmDialog'
import GlassPanel from '../../components/GlassPanel'
import { BoltGlyph, BoltIcon, ChevronIcon, DownloadIcon, NewspaperIcon } from '../../components/Icons'
import { useTransition } from '../../components/PageTransition'
import ThemeSwitch from '../../components/ThemeSwitch'
import { useData } from '../../data/DataContext'
import IsoScene from '../frame4-homeGrupo/IsoScene'
import { aplicarNoticia, contarVotos, decidir, estadoPublico, generarCodigo, generarToken, indicadoresIniciales, nivel, preguntasDelTema, saludEmpresa, ETIQUETA_SALUD } from '../../sim/motor'
import GraficoVivo from '../../sim/GraficoVivo'
import { especificacion, especificacionNoticia, lineaTiempo, noticiasDisponibles } from '../../sim/graficos'
import Periodico from '../../sim/Periodico'
import QrCode from '../../sim/QrCode'
import { getTransport } from '../../sim/transport'
import { descargarXlsx, libroSimulacion } from '../../sim/xlsx'
import '../frame4-homeGrupo/IsoScene.css'
import './Simulacion.css'

const KEY = (c, t) => `edn.sim.docente.${c}.${t}`
const initials = (n) =>
  n
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
const COLORS = ['#ffffff', '#ffd24d', '#6df0b0', '#9bb8ff', '#ff9ec7']
const LETRAS = 'ABCD'

function cargarGuardada(cursoId, temaId) {
  try {
    return JSON.parse(localStorage.getItem(KEY(cursoId, temaId)))
  } catch {
    return null
  }
}

/**
 * Simulación del tema (vista del docente, en el proyector).
 *
 * Flujo: sala de espera con QR → votaciones (una por pregunta) → el docente cierra
 * cada votación → decisión colectiva (opción más votada; si hay empate el docente
 * elige) → se aplican los efectos (datos de la pregunta) a los indicadores →
 * resumen final y resultados guardados en el curso (descargables en Excel).
 *
 * Fases de la sesión: sala · votando · cerrada · desempate · resultado · fin.
 */
export default function Simulacion() {
  const { cursoId, temaId } = useParams()
  const go = useTransition()
  const { cursos, empresas, temas, guardarSimulacion } = useData()
  const curso = cursos.find((c) => c.id === cursoId)
  const empresa = curso && empresas.find((e) => e.id === curso.empresaId)
  const tema = temas.find((t) => t.id === temaId)
  const preguntasTema = useMemo(() => (empresa ? preguntasDelTema(empresa, temaId) : []), [empresa, temaId])

  const [transport, setTransport] = useState(null)
  const [ses, setSes] = useState(() => cargarGuardada(cursoId, temaId))
  const [live, setLive] = useState({ participantes: [], votos: {} })
  const [conectado, setConectado] = useState(true)
  const [aviso, setAviso] = useState('')
  const [confirmSalir, setConfirmSalir] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const [verPeriodico, setVerPeriodico] = useState(false)
  const sesRef = useRef(ses)
  const liveRef = useRef(live)
  const arrancado = useRef(false)

  const titulo = tema ? `Simulación T${tema.orden}` : 'Simulación'

  useEffect(() => {
    let vivo = true
    getTransport().then((t) => vivo && setTransport(t))
    return () => {
      vivo = false
    }
  }, [])

  const publicar = useCallback(
    async (next) => {
      try {
        await transport.publicar(next.codigo, next.token, estadoPublico(next, empresa, titulo))
        setConectado(true)
      } catch (e) {
        setConectado(false)
        setAviso(e.code === 'no-existe' ? 'La sesión ya no existe en el servidor.' : 'No se pudo avisar a los estudiantes. Reintentando con el siguiente cambio.')
      }
    },
    [transport, empresa, titulo],
  )

  /** Guarda la sesión en el navegador del docente y la publica para los estudiantes. */
  const commit = useCallback(
    async (next) => {
      sesRef.current = next
      setSes(next)
      try {
        localStorage.setItem(KEY(cursoId, temaId), JSON.stringify(next))
      } catch {
        /* sin almacenamiento: la sesión vive solo mientras la página siga abierta */
      }
      await publicar(next)
    },
    [cursoId, temaId, publicar],
  )

  // Crear la sesión (una sola vez) o retomar la que ya estaba en curso.
  useEffect(() => {
    if (!transport || !empresa || !curso || arrancado.current) return
    arrancado.current = true
    ;(async () => {
      const guardada = sesRef.current
      if (guardada && !guardada.guardado) {
        try {
          await transport.leerDocente(guardada.codigo, guardada.token)
          await publicar(guardada)
          return
        } catch {
          /* la sesión ya no existe (por ejemplo, vencida): se crea una nueva */
        }
      }
      if (!preguntasTema.length) return
      const valores = indicadoresIniciales(empresa, curso)
      for (let intento = 0; intento < 5; intento++) {
        const nueva = {
          codigo: generarCodigo(),
          token: generarToken(),
          fase: 'sala',
          idx: 0,
          preguntas: structuredClone(preguntasTema),
          valores,
          valoresIniciales: valores,
          decisiones: [],
          noticias: [],
          autoNoticia: true,
          autoUsada: false,
          guardado: false,
          creada: new Date().toISOString(),
        }
        try {
          await transport.crear(nueva.codigo, nueva.token, estadoPublico(nueva, empresa, titulo))
          sesRef.current = nueva
          setSes(nueva)
          localStorage.setItem(KEY(cursoId, temaId), JSON.stringify(nueva))
          return
        } catch (e) {
          if (e.code !== 'codigo-en-uso') {
            setAviso('No se pudo crear la sesión. Revisa la conexión e intenta de nuevo.')
            return
          }
        }
      }
    })()
  }, [transport, empresa, curso, preguntasTema, publicar, cursoId, temaId, titulo])

  // Sondeo de participantes y votos.
  useEffect(() => {
    if (!transport || !ses || ses.guardado) return
    let vivo = true
    const tick = async () => {
      try {
        const d = await transport.leerDocente(ses.codigo, ses.token)
        if (!vivo) return
        liveRef.current = { participantes: d.participantes, votos: d.votos }
        setLive(liveRef.current)
        setConectado(true)
      } catch {
        if (vivo) setConectado(false)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => {
      vivo = false
      clearInterval(id)
    }
  }, [transport, ses?.codigo, ses?.token, ses?.guardado]) // eslint-disable-line react-hooks/exhaustive-deps

  const preguntaActual = ses?.preguntas[ses.idx]
  const votosActuales = (preguntaActual && live.votos[preguntaActual.id]) || {}
  const nVotos = Object.keys(votosActuales).filter((pid) => live.participantes.some((p) => p.id === pid)).length

  // ---- acciones del docente ----
  const iniciar = () => commit({ ...sesRef.current, fase: 'votando', idx: 0 })

  const cerrarVotacion = async () => {
    if (trabajando) return
    setTrabajando(true)
    try {
      const s = sesRef.current
      await commit({ ...s, fase: 'cerrada' }) // los estudiantes ya no pueden votar
      let votos = liveRef.current.votos
      try {
        votos = (await transport.leerDocente(s.codigo, s.token)).votos
      } catch {
        /* se usan los últimos votos recibidos */
      }
      const p = s.preguntas[s.idx]
      const v = votos[p.id] ?? {}
      const c = contarVotos(p, v)
      if (c.empate) {
        await commit({ ...s, fase: 'desempate', empateLideres: c.lideres, votosFinal: v })
      } else {
        const dec = decidir({ empresa, pregunta: p, votos: v, valores: s.valores })
        await commit({ ...s, fase: 'resultado', decisiones: [...s.decisiones, { ...dec, votos: v }], valores: dec.despues })
      }
    } finally {
      setTrabajando(false)
    }
  }

  const desempatar = async (opcionId) => {
    const s = sesRef.current
    const p = s.preguntas[s.idx]
    const dec = decidir({ empresa, pregunta: p, votos: s.votosFinal ?? {}, valores: s.valores, eleccion: opcionId })
    await commit({ ...s, fase: 'resultado', empateLideres: undefined, votosFinal: undefined, decisiones: [...s.decisiones, { ...dec, votos: s.votosFinal ?? {} }], valores: dec.despues })
  }

  const finalizar = useCallback(
    async (base) => {
      const s = base ?? sesRef.current
      if (s.guardado) return
      let participantes = liveRef.current.participantes
      try {
        participantes = (await transport.leerDocente(s.codigo, s.token)).participantes
      } catch {
        /* se usan los últimos participantes conocidos */
      }
      const hechas = s.decisiones.length
      const datos = {
        curso: curso.nombre,
        empresa: empresa.nombre,
        tema: tema.nombre,
        codigo: s.codigo,
        fecha: new Date().toISOString(),
        indicadores: empresa.indicadores.map(({ id, nombre, min, max }) => ({ id, nombre, min, max })),
        valoresIniciales: s.valoresIniciales,
        valoresFinales: s.valores,
        participantes: participantes.map(({ id, nombre }) => ({ id, nombre })),
        noticias: (s.noticias ?? []).map(({ grafico, ...n }) => n),
        linea: lineaTiempo(s).map(({ tipo, indice, id, titular, valores }) => ({ tipo, indice, id, titular, valores })),
        respuestas: s.decisiones.flatMap((d) => Object.entries(d.votos ?? {}).map(([participanteId, opcionId]) => ({ participanteId, preguntaId: d.preguntaId, opcionId }))),
        preguntas: s.preguntas.slice(0, hechas).map((p, i) => ({
          id: p.id,
          texto: p.texto,
          concepto: p.conceptoAcademico,
          opciones: p.opciones.map(({ id, texto }) => ({ id, texto })),
          decision: (({ votos, ...resto }) => resto)(s.decisiones[i]),
        })),
      }
      const fecha = datos.fecha.slice(0, 10)
      const resultado = {
        id: `res-${s.codigo}`,
        nombre: `Simulación T${tema.orden} - ${curso.nombre} - ${fecha}.xlsx`,
        temaId,
        fecha: datos.fecha,
        participantes: datos.participantes.length,
        datos,
      }
      guardarSimulacion(cursoId, temaId, resultado, s.valores)
      await commit({ ...s, fase: 'fin', guardado: true, resultado })
    },
    [transport, curso, empresa, tema, temaId, cursoId, guardarSimulacion, commit],
  )

  /** Lanza una noticia de última hora (al azar entre las disponibles) y aplica sus efectos. */
  const lanzarNoticia = async () => {
    const s = sesRef.current
    const lista = noticiasDisponibles(empresa, curso, temaId, temas, (s.noticias ?? []).map((n) => n.id))
    if (!lista.length) return false
    const ev = lista[Math.floor(Math.random() * lista.length)]
    const n = aplicarNoticia({ empresa, noticia: ev, valores: s.valores, despuesDePregunta: s.idx })
    await commit({ ...s, fase: 'noticia', noticiaActual: n, noticias: [...(s.noticias ?? []), n], autoUsada: true, valores: n.despues })
    return true
  }

  const siguiente = async () => {
    const s = sesRef.current
    const total = s.preguntas.length
    // Noticia sorpresa a mitad de la simulación (si el docente la dejó activada)
    if (s.fase === 'resultado' && s.autoNoticia && !s.autoUsada && s.idx === Math.ceil(total / 2) - 1 && s.idx + 1 < total) {
      if (await lanzarNoticia()) return
    }
    if (s.idx + 1 < total) await commit({ ...s, fase: 'votando', idx: s.idx + 1, noticiaActual: undefined })
    else await finalizar()
  }

  const alternarAuto = () => commit({ ...sesRef.current, autoNoticia: !sesRef.current.autoNoticia })

  const salir = () => go(`/curso/${cursoId}`, { label: curso.nombre })
  const pedirSalir = () => (ses && ses.fase !== 'fin' && ses.fase !== 'sala' ? setConfirmSalir(true) : salir())

  if (!curso || !empresa || !tema) return <Navigate to="/" replace />
  if (!curso.estado.contextoVisto) return <Navigate to={`/curso/${cursoId}/contexto`} replace />

  const url = ses ? `${window.location.origin}/unirse/${ses.codigo}` : ''
  const sinPreguntas = transport && !preguntasTema.length && !ses
  const decActual = ses?.decisiones[ses.idx]
  const fase = ses?.fase
  const salud = saludEmpresa(empresa.indicadores, ses?.valores)
  const disponibles = ses ? noticiasDisponibles(empresa, curso, temaId, temas, (ses.noticias ?? []).map((n) => n.id)) : []
  const hayNoticias = noticiasDisponibles(empresa, curso, temaId, temas, []).length > 0
  const noticia = fase === 'noticia' ? ses.noticiaActual : null
  const esResultado = fase === 'resultado' || fase === 'noticia'
  const cambiosFase = fase === 'resultado' ? decActual?.cambios : noticia?.cambios
  // Gráfico vivo: solo de temas ya vistos (ver sim/graficos.js)
  const specGrafico =
    fase === 'resultado' && decActual && preguntaActual
      ? especificacion(preguntaActual, preguntaActual.opciones.find((o) => o.id === decActual.opcionId), temaId, temas, curso)
      : noticia
        ? especificacionNoticia(noticia, temaId, temas, curso)
        : null
  const claveGrafico = noticia ? `n-${noticia.id}` : `p-${ses?.idx}-${decActual?.opcionId}`

  return (
    <main className={`sim${fase === 'fin' ? ' sim--fin' : ''}`}>
      <AuroraBackground variant="panel" />
      <div className="sim__scene" aria-hidden="true" inert>
        <IsoScene temas={temas} progreso={{}} activeId={null} salud={salud} />
      </div>

      <header className="sim__bar rise" style={{ '--d': 0 }}>
        <div className="sim__head">
          <button type="button" className="chip-btn" onClick={pedirSalir}>
            <span className="chip-btn__chev">
              <ChevronIcon size={16} />
            </span>
            Salir
          </button>
          <div>
            <h1 className="sim__course">{curso.nombre}</h1>
            <p className="sim__company">{empresa.nombre}</p>
          </div>
        </div>
        <div className="sim__titles">
          <h2 className="sim__title">{titulo}</h2>
          {ses && (
            <p className="sim__code">
              Código: <b>{ses.codigo}</b>
            </p>
          )}
        </div>
        <div className="sim__tools">
          <ThemeSwitch />
          <AccountMenu onNotice={setAviso} />
        </div>
      </header>

      <aside className="sim__rail rise" style={{ '--d': 1 }} aria-label="Participantes">
        <span className="sim__rail-count">{live.participantes.length}</span>
        <ul className="sim__people">
          {live.participantes.map((p) => (
            <li key={p.id} className={`person${fase === 'votando' && votosActuales[p.id] ? ' is-done' : ''}`} title={p.nombre}>
              {initials(p.nombre)}
            </li>
          ))}
        </ul>
        <span className="sim__rail-label">Participantes</span>
      </aside>

      <div className="sim__center">
      {specGrafico && (
        <GlassPanel flat className="sim__chart glass--dense">
          <GraficoVivo spec={specGrafico} clave={claveGrafico} etiqueta={noticia ? 'Última hora' : undefined} />
        </GlassPanel>
      )}
      <section className="sim__inds rise" style={{ '--d': 2 }}>
        <h2 className="sim__inds-title">Estado Indicadores</h2>
        <p className={`salud salud--${salud}`}>
          <i aria-hidden="true" />
          {ETIQUETA_SALUD[salud]}
        </p>
        <ul className={`sim__inds-list${esResultado ? ' is-result' : ''}`}>
          {empresa.indicadores.map((i) => {
            const valor = ses?.valores[i.id] ?? i.valorInicial
            const cambio = esResultado ? cambiosFase?.find((c) => c.indicadorId === i.id) : null
            const cambió = !!cambio && cambio.aplicado !== 0
            return (
              <li key={i.id} className={`ind-row${esResultado ? (cambió ? ' is-changed' : ' is-still') : ''}${cambió && cambio.aplicado > 0 ? ' is-up' : ''}${cambió && cambio.aplicado < 0 ? ' is-down' : ''}`}>
                <span className="ind-row__name">{i.nombre}</span>
                <b className={`ind-row__val ind-row__val--${nivel(i, valor)}`}>{Math.round(valor)}</b>
                {cambio && cambio.aplicado !== 0 && (
                  <span className={`ind-row__delta ${cambio.aplicado > 0 ? 'up' : 'down'}`}>
                    {cambio.aplicado > 0 ? '▲ +' : '▼ '}
                    {cambio.aplicado}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      </div>

      <section className="sim__stage rise" style={{ '--d': 3 }} aria-live="polite">
        {sinPreguntas && (
          <Tarjeta>
            <h2 className="q__title">Sin preguntas para este tema</h2>
            <p className="q__text">
              {empresa.nombre} todavía no tiene preguntas del Tema {tema.orden}. Agrégalas en la configuración de la empresa y vuelve a
              iniciar la simulación.
            </p>
            <Link className="pill-btn" to={`/empresas/${empresa.id}`}>
              Editar empresa
            </Link>
          </Tarjeta>
        )}

        {!ses && !sinPreguntas && (
          <Tarjeta>
            <p className="q__text">{transport ? 'Creando la sesión…' : 'Conectando…'}</p>
            {aviso && <p className="q__aviso">{aviso}</p>}
          </Tarjeta>
        )}

        {ses && fase === 'sala' && (
          <Tarjeta className="sala">
            <h2 className="q__title">Únete desde tu celular</h2>
            <div className="sala__body">
              <QrCode text={url} />
              <div className="sala__info">
                <p className="sala__label">Escanea el QR o entra a</p>
                <p className="sala__url">{url.replace(/^https?:\/\//, '')}</p>
                <p className="sala__label">Código</p>
                <p className="sala__code">{ses.codigo}</p>
                <p className="sala__count">
                  <b>{live.participantes.length}</b> {live.participantes.length === 1 ? 'participante' : 'participantes'} en la sala
                </p>
              </div>
            </div>
            {transport?.modo === 'local' && (
              <p className="q__aviso">
                Modo de prueba: sin servidor en línea, solo funcionan pestañas de este mismo navegador. Para que entren celulares,
                configura Upstash Redis en Vercel (ver README).
              </p>
            )}
            {hayNoticias && (
              <label className="sala__auto">
                <input type="checkbox" checked={ses.autoNoticia !== false} onChange={alternarAuto} />
                <span>
                  <b>Noticia de última hora</b> sorpresa a mitad de la simulación
                </span>
              </label>
            )}
            <button type="button" className="pill-btn q__go" onClick={iniciar} disabled={!live.participantes.length}>
              {live.participantes.length ? `Iniciar simulación · ${ses.preguntas.length} preguntas` : 'Esperando participantes…'}
            </button>
          </Tarjeta>
        )}

        {ses && preguntaActual && ['votando', 'cerrada', 'desempate', 'resultado'].includes(fase) && (
          <Tarjeta>
            <p className="q__meta">
              Pregunta {ses.idx + 1} de {ses.preguntas.length}
              {preguntaActual.conceptoAcademico && <span> · {preguntaActual.conceptoAcademico}</span>}
            </p>
            <h2 className="q__title">Pregunta {ses.idx + 1}</h2>
            <p className="q__text">{preguntaActual.texto}</p>
            <ul className="opts">
              {preguntaActual.opciones.map((o, i) => {
                const d = fase === 'resultado' ? decActual : null
                const pct = d ? d.porcentajes[o.id] : null
                const gana = d && d.opcionId === o.id
                const lider = fase === 'desempate' && ses.empateLideres?.includes(o.id)
                const Tag = lider ? 'button' : 'div'
                return (
                  <li key={o.id}>
                    <Tag
                      type={lider ? 'button' : undefined}
                      className={`sopt${gana ? ' is-win' : ''}${d && !gana ? ' is-lose' : ''}${lider ? ' is-pick' : ''}`}
                      onClick={lider ? () => desempatar(o.id) : undefined}
                      style={d ? { '--pct': `${pct}%` } : undefined}
                    >
                      <span className="sopt__l">{LETRAS[i]}.</span>
                      <span className="sopt__t">{o.texto}</span>
                      {d && (
                        <span className="sopt__r">
                          {pct}% <small>({d.conteos[o.id]})</small>
                        </span>
                      )}
                    </Tag>
                  </li>
                )
              })}
            </ul>

            {fase === 'votando' && (
              <div className="qcard__foot">
                <p className="q__count">
                  <b>{nVotos}</b> de {live.participantes.length} respondieron
                </p>
                <button type="button" className="pill-btn q__go" onClick={cerrarVotacion} disabled={trabajando}>
                  Cerrar votación
                </button>
              </div>
            )}
            {fase === 'cerrada' && <p className="q__aviso">Contando votos…</p>}
            {fase === 'desempate' && (
              <p className="q__aviso q__aviso--strong">
                Hay empate. Elige tú la decisión de la clase: toca una de las opciones empatadas.
              </p>
            )}
            {fase === 'resultado' && decActual && (
              <div className="qcard__foot">
                <p className="q__count">
                  {decActual.desempatada ? 'Empate: decidió el docente. ' : ''}
                  {decActual.votantes} {decActual.votantes === 1 ? 'voto' : 'votos'}
                </p>
                <div className="qcard__btns">
                  {disponibles.length > 0 && !(ses.noticias ?? []).some((n) => n.despuesDePregunta === ses.idx) && (
                    <button type="button" className="pill-btn pill-btn--ghost" onClick={lanzarNoticia} title="Lanza un hecho inesperado que mueve los indicadores">
                      <BoltIcon size={16} /> Última hora
                    </button>
                  )}
                  <button type="button" className="pill-btn q__go" onClick={siguiente}>
                    {ses.idx + 1 < ses.preguntas.length ? 'Siguiente pregunta' : 'Ver resultados finales'}
                  </button>
                </div>
              </div>
            )}
          </Tarjeta>
        )}

        {ses && fase === 'noticia' && noticia && (
          <Tarjeta className="noticia">
            <p className="noticia__tag">
              <i aria-hidden="true" /> Última hora
            </p>
            <h2 className="noticia__titular">{noticia.titular}</h2>
            <p className="q__text">{noticia.detalle}</p>
            <p className="q__aviso">Mira cómo cambian los indicadores: la clase no eligió esto, pero tendrá que reaccionar.</p>
            <div className="qcard__foot">
              <span />
              <button type="button" className="pill-btn q__go" onClick={siguiente}>
                {ses.idx + 1 < ses.preguntas.length ? 'Siguiente pregunta' : 'Ver resultados finales'}
              </button>
            </div>
          </Tarjeta>
        )}

        {ses && fase === 'fin' && (
          <Tarjeta className="fin">
            <h2 className="q__title">Simulación terminada</h2>
            <p className="q__text">
              {ses.resultado?.participantes ?? 0} participantes · {ses.decisiones.length} decisiones colectivas. Los resultados quedaron
              guardados en el curso.
            </p>
            <Evolucion ses={ses} empresa={empresa} />
            <p className="q__aviso">La participación no es una calificación: coincidir con la mayoría no significa responder correctamente.</p>
            <div className="qcard__foot">
              <button type="button" className="pill-btn" onClick={() => setVerPeriodico(true)}>
                <NewspaperIcon size={18} /> Ver el periódico
              </button>
              <button type="button" className="pill-btn" onClick={() => descargarXlsx(libroSimulacion(ses.resultado.datos), ses.resultado.nombre)}>
                <DownloadIcon size={18} /> Descargar Excel
              </button>
              <button type="button" className="pill-btn q__go" onClick={salir}>
                Volver al grupo
              </button>
            </div>
          </Tarjeta>
        )}

        {ses && fase !== 'fin' && fase !== 'sala' && ses.decisiones.length > 0 && fase !== 'cerrada' && (
          <button type="button" className="sim__end" onClick={() => finalizar()}>
            Terminar simulación ahora
          </button>
        )}
      </section>

      {(aviso || !conectado) && ses && (
        <div className="toast-region" role="status" aria-live="polite">
          <GlassPanel className="glass--dense toast">{!conectado ? 'Sin conexión con el servidor… reintentando' : aviso}</GlassPanel>
        </div>
      )}

      {verPeriodico && ses?.resultado && <Periodico datos={ses.resultado.datos} onClose={() => setVerPeriodico(false)} />}

      {confirmSalir && (
        <ConfirmDialog
          title="¿Salir de la simulación?"
          message="La sesión sigue abierta y podrás retomarla entrando de nuevo, pero los estudiantes se quedarán esperando."
          confirmLabel="Salir"
          onConfirm={salir}
          onCancel={() => setConfirmSalir(false)}
        />
      )}
    </main>
  )
}

function Tarjeta({ className = '', children }) {
  return <div className={`qcard ${className}`}>{children}</div>
}

/** Evolución de los indicadores a lo largo de las decisiones. */
function Evolucion({ ses, empresa }) {
  const W = 560
  const H = 190
  const linea = lineaTiempo(ses)
  const pasos = linea.map((p) => p.valores)
  const x = (i) => 30 + (i / Math.max(1, pasos.length - 1)) * (W - 50)
  const y = (v, ind) => H - 24 - ((v - ind.min) / (ind.max - ind.min || 1)) * (H - 40)
  return (
    <figure className="evo">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución de los indicadores">
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1="30" x2={W - 20} y1={H - 24 - t * (H - 40)} y2={H - 24 - t * (H - 40)} className="evo__grid" />
        ))}
        {empresa.indicadores.map((ind, k) => (
          <polyline
            key={ind.id}
            fill="none"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ stroke: COLORS[k % COLORS.length] }}
            points={pasos.map((p, i) => `${x(i)},${y(p[ind.id], ind)}`).join(' ')}
          />
        ))}
        {linea.map((p, i) => (
          p.tipo === 'noticia' ? (
            <g key={i} className="evo__t" style={{ color: 'currentColor' }}><BoltGlyph x={x(i)} y={H - 10} /></g>
          ) : (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="evo__t">
              {p.tipo === 'inicio' ? 'Inicio' : p.indice + 1}
            </text>
          )
        ))}
      </svg>
      <figcaption className="evo__legend">
        {empresa.indicadores.map((ind, k) => (
          <span key={ind.id}>
            <i style={{ background: COLORS[k % COLORS.length] }} />
            {ind.nombre}: {Math.round(ses.valoresIniciales[ind.id])} → <b>{Math.round(ses.valores[ind.id])}</b>
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
