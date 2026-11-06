import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AuroraBackground from '../../components/AuroraBackground'
import UaoLogo from '../../components/UaoLogo'
import { getTransport } from '../../sim/transport'
import './Estudiante.css'

const LETRAS = 'ABCD'
const KEY = (c) => `edn.sim.est.${c}`
const guardado = (c) => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY(c)))
  } catch {
    return null
  }
}

/**
 * Vista móvil del estudiante: se entra con el QR (/unirse/CODIGO), sin cuenta.
 * Solo escribe su nombre, espera en la sala y responde cuando el docente abre cada pregunta.
 */
export default function Estudiante() {
  const params = useParams()
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState((params.codigo ?? '').toUpperCase())
  const [nombre, setNombre] = useState('')
  const [transport, setTransport] = useState(null)
  const [yo, setYo] = useState(() => (params.codigo ? guardado(params.codigo.toUpperCase()) : null))
  const [data, setData] = useState(null) // última lectura del servidor
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [elegida, setElegida] = useState({}) // preguntaId → opción (optimista)
  const vistaRef = useRef(0)

  useEffect(() => {
    let vivo = true
    getTransport().then((t) => vivo && setTransport(t))
    return () => {
      vivo = false
    }
  }, [])

  // Sondeo mientras haya sesión.
  const cod = (params.codigo ?? '').toUpperCase()
  useEffect(() => {
    if (!transport || !cod) return
    let vivo = true
    const tick = async () => {
      try {
        const d = await transport.leerEstudiante(cod, yo?.pid)
        if (vivo) {
          setData(d)
          setError((e) => (e === 'conexion' ? '' : e))
        }
      } catch {
        if (vivo) setError('conexion')
      }
    }
    tick()
    const id = setInterval(tick, 1200)
    return () => {
      vivo = false
      clearInterval(id)
    }
  }, [transport, cod, yo?.pid])

  const unirse = async (e) => {
    e.preventDefault()
    const c = codigo.trim().toUpperCase()
    const n = nombre.trim()
    if (!c || !n || !transport) return
    setEnviando(true)
    setError('')
    try {
      const l = await transport.leerEstudiante(c, '')
      if (l.existe === false) {
        setError('No encontramos esa sesión. Revisa el código.')
        return
      }
      const { pid } = await transport.unir(c, n)
      const me = { pid, nombre: n }
      sessionStorage.setItem(KEY(c), JSON.stringify(me))
      setYo(me)
      navigate(`/unirse/${c}`, { replace: true })
    } catch (err) {
      setError(err.code === 'sala-llena' ? 'La sala está llena.' : 'No pudimos unirte. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const votar = useCallback(
    async (pregunta, opcionId) => {
      setElegida((m) => ({ ...m, [pregunta.id]: opcionId }))
      try {
        await transport.votar(cod, yo.pid, pregunta.id, opcionId)
        setError('')
      } catch (err) {
        setElegida((m) => {
          const { [pregunta.id]: _, ...resto } = m
          return resto
        })
        setError(err.code === 'votacion-cerrada' ? 'La votación ya se cerró.' : 'No se pudo enviar tu respuesta. Intenta de nuevo.')
      }
    },
    [transport, cod, yo],
  )

  void vistaRef

  const st = data?.state
  const sesionPerdida = data && data.existe === false
  // Si la sesión no reconoce al participante (p. ej. se reinició), vuelve a pedir el nombre.
  const sinRegistro = yo && data && data.state && !data.yo && !sesionPerdida

  let cuerpo
  if (!cod || !yo || sinRegistro) {
    cuerpo = (
      <form className="est__card" onSubmit={unirse}>
        <h1 className="est__title">Unirme a la simulación</h1>
        <label className="est__field">
          Código de la sesión
          <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={8} autoCapitalize="characters" autoComplete="off" inputMode="text" disabled={Boolean(cod)} />
        </label>
        <label className="est__field">
          Tu nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} autoComplete="given-name" placeholder="Ej. Ana Gómez" autoFocus={Boolean(cod)} />
        </label>
        {error && error !== 'conexion' && <p className="est__error" role="alert">{error}</p>}
        <button type="submit" className="est__btn" disabled={enviando || !codigo.trim() || !nombre.trim() || !transport}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    )
  } else if (sesionPerdida) {
    cuerpo = (
      <div className="est__card">
        <h1 className="est__title">No encontramos la sesión</h1>
        <p className="est__text">Puede que el docente haya cerrado la simulación o que el código no sea correcto.</p>
        <button type="button" className="est__btn" onClick={() => { sessionStorage.removeItem(KEY(cod)); setYo(null); navigate('/unirse', { replace: true }) }}>
          Probar con otro código
        </button>
      </div>
    )
  } else if (!st) {
    cuerpo = (
      <div className="est__card">
        <p className="est__text">Conectando…</p>
      </div>
    )
  } else if (st.estado === 'sala') {
    cuerpo = (
      <div className="est__card est__card--center">
        <p className="est__eyebrow">{st.empresa}</p>
        <h1 className="est__title">¡Hola, {yo.nombre}!</h1>
        <p className="est__text">Ya estás en la sala. Cuando el docente inicie, aparecerá la primera pregunta.</p>
        <p className="est__pulse">Esperando… · {data.participantes?.length ?? 1} en la sala</p>
      </div>
    )
  } else if (st.estado === 'votando' && st.pregunta) {
    const sel = elegida[st.pregunta.id] ?? data.miVoto?.[st.pregunta.id]
    cuerpo = (
      <div className="est__card" key={st.pregunta.id}>
        <p className="est__eyebrow">
          Pregunta {st.paso} de {st.total}
        </p>
        <h1 className="est__q">{st.pregunta.texto}</h1>
        <ul className="est__opts">
          {st.pregunta.opciones.map((o, i) => (
            <li key={o.id}>
              <button type="button" className={`est__opt${sel === o.id ? ' is-sel' : ''}`} onClick={() => votar(st.pregunta, o.id)}>
                <b>{LETRAS[i]}</b>
                <span>{o.texto}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="est__hint">{sel ? '✓ Respuesta enviada. Puedes cambiarla hasta que el docente cierre la votación.' : 'Elige una opción.'}</p>
        {error && error !== 'conexion' && <p className="est__error" role="alert">{error}</p>}
      </div>
    )
  } else if (st.estado === 'cerrada') {
    cuerpo = (
      <div className="est__card est__card--center">
        <h1 className="est__title">Votación cerrada</h1>
        <p className="est__text">El docente está contando los votos…</p>
        <p className="est__pulse">Un momento</p>
      </div>
    )
  } else if (st.estado === 'resultado' && st.resultado) {
    const r = st.resultado
    const mia = data.miVoto?.[st.pregunta?.id]
    const op = st.pregunta?.opciones.find((o) => o.id === r.opcionId)
    cuerpo = (
      <div className="est__card">
        <p className="est__eyebrow">Decisión de la clase</p>
        <h1 className="est__q">
          {r.opcionId}. {op?.texto}
        </h1>
        <ul className="est__bars">
          {st.pregunta.opciones.map((o, i) => (
            <li key={o.id} className={o.id === r.opcionId ? 'is-win' : ''}>
              <span>
                {LETRAS[i]} · {r.porcentajes[o.id]}%
              </span>
              <i style={{ '--w': `${r.porcentajes[o.id]}%` }} />
            </li>
          ))}
        </ul>
        <p className="est__text">
          {mia ? (mia === r.opcionId ? `Tu respuesta (${mia}) coincidió con la decisión.` : `Tu respuesta fue ${mia}; la clase eligió ${r.opcionId}.`) : 'No alcanzaste a responder esta pregunta.'}{' '}
          <small>Coincidir con la mayoría no es una calificación.</small>
        </p>
        <ul className="est__inds">
          {st.indicadores.map((i) => {
            const c = r.cambios.find((x) => x.indicadorId === i.id)
            const cambió = !!c && c.delta !== 0
            return (
              <li key={i.id} className={cambió ? 'is-changed' : 'is-still'}>
                <span>{i.nombre}</span>
                <b>{Math.round(i.valor)}</b>
                {c && c.delta !== 0 && <em className={c.delta > 0 ? 'up' : 'down'}>{c.delta > 0 ? `▲ +${c.delta}` : `▼ ${c.delta}`}</em>}
              </li>
            )
          })}
        </ul>
        <p className="est__pulse">Esperando la siguiente pregunta…</p>
      </div>
    )
  } else {
    cuerpo = (
      <div className="est__card est__card--center">
        <h1 className="est__title">¡Gracias por participar!</h1>
        <p className="est__text">La simulación terminó con {st.decisiones} decisiones colectivas. Mira la pantalla del salón para ver cómo quedó la empresa.</p>
      </div>
    )
  }

  return (
    <main className="est">
      <AuroraBackground variant="panel" />
      <header className="est__top">
        <UaoLogo height={22} />
        {st?.titulo && <span>{st.titulo}</span>}
      </header>
      {cuerpo}
      {error === 'conexion' && <p className="est__net" role="status">Sin conexión… reintentando</p>}
    </main>
  )
}
