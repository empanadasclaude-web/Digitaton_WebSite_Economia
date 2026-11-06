/**
 * Comunicación docente ↔ estudiantes.
 *
 * Dos implementaciones con la misma interfaz:
 *  - api:   /api/sesion (función de Vercel + Redis). Es el modo real: los estudiantes
 *           entran desde sus teléfonos y todos ven la misma sesión.
 *  - local: localStorage del navegador. Sirve para probar sin servidor (el docente y
 *           los "estudiantes" deben ser pestañas del mismo navegador).
 * `getTransport()` elige solo: si la API responde con Redis configurado usa `api`.
 *
 * La sincronización es por sondeo (polling) cada ~1 s: simple, sin conexiones
 * persistentes (que Vercel no admite en funciones) y suficiente para un salón.
 */
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const rid = () => Math.random().toString(36).slice(2, 10)

// ---------- API ----------
async function call(method, path, body) {
  const r = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const e = new Error(data.error || `http-${r.status}`)
    e.code = data.error || `http-${r.status}`
    e.status = r.status
    throw e
  }
  return data
}

const apiTransport = {
  modo: 'en-linea',
  crear: (codigo, token, state) => call('POST', '/api/sesion', { accion: 'crear', codigo, token, state }),
  publicar: (codigo, token, state) => call('POST', '/api/sesion', { accion: 'publicar', codigo, token, state }),
  leerDocente: (codigo, token) =>
    call('GET', `/api/sesion?codigo=${codigo}&token=${encodeURIComponent(token)}`),
  async leerEstudiante(codigo, pid) {
    try {
      return await call('GET', `/api/sesion?codigo=${codigo}&pid=${encodeURIComponent(pid ?? '')}`)
    } catch (e) {
      if (e.status === 404) return { existe: false }
      throw e
    }
  },
  unir: (codigo, nombre) => call('POST', '/api/sesion', { accion: 'unir', codigo, nombre }),
  votar: (codigo, pid, preguntaId, opcionId) =>
    call('POST', '/api/sesion', { accion: 'votar', codigo, pid, preguntaId, opcionId }),
}

// ---------- Local ----------
const K = (c) => `edn.sim.s.${c}`
const read = (c) => {
  try {
    return JSON.parse(localStorage.getItem(K(c)))
  } catch {
    return null
  }
}
const write = (c, doc) => localStorage.setItem(K(c), JSON.stringify(doc))
const fail = (code, status = 400) => Object.assign(new Error(code), { code, status })

const localTransport = {
  modo: 'local',
  async crear(codigo, token, state) {
    if (read(codigo)) throw fail('codigo-en-uso', 409)
    write(codigo, { token, state, participantes: {}, votos: {} })
    return { ok: true }
  },
  async publicar(codigo, token, state) {
    const d = read(codigo)
    if (!d || d.token !== token) throw fail('token', 403)
    write(codigo, { ...d, state })
    return { ok: true }
  },
  async leerDocente(codigo, token) {
    const d = read(codigo)
    if (!d) throw fail('no-existe', 404)
    if (d.token !== token) throw fail('token', 403)
    return {
      state: d.state,
      participantes: Object.entries(d.participantes).map(([id, p]) => ({ id, ...p })),
      votos: d.votos,
    }
  },
  async leerEstudiante(codigo, pid) {
    const d = read(codigo)
    if (!d) return { existe: false }
    const yo = d.participantes[pid] ? { id: pid, ...d.participantes[pid] } : null
    const miVoto = {}
    for (const [pregunta, m] of Object.entries(d.votos)) if (m[pid]) miVoto[pregunta] = m[pid]
    return {
      state: d.state,
      participantes: Object.entries(d.participantes).map(([id, p]) => ({ id, nombre: p.nombre })),
      yo,
      miVoto,
    }
  },
  async unir(codigo, nombre) {
    const d = read(codigo)
    if (!d) throw fail('no-existe', 404)
    const pid = rid()
    d.participantes[pid] = { nombre: String(nombre).trim().slice(0, 30), en: Date.now() }
    write(codigo, d)
    return { pid }
  },
  async votar(codigo, pid, preguntaId, opcionId) {
    const d = read(codigo)
    if (!d) throw fail('no-existe', 404)
    if (!d.participantes[pid]) throw fail('participante', 403)
    if (d.state.estado !== 'votando' || d.state.pregunta?.id !== preguntaId) throw fail('votacion-cerrada', 409)
    ;(d.votos[preguntaId] ??= {})[pid] = opcionId
    write(codigo, d)
    return { ok: true }
  },
}

let detected
/** Elige el transporte una sola vez. Con `forzar` ('local' | 'api') se salta la detección. */
export function getTransport(forzar) {
  if (forzar === 'local') return Promise.resolve(localTransport)
  if (forzar === 'api') return Promise.resolve(apiTransport)
  detected ??= (async () => {
    try {
      const ctl = new AbortController()
      const t = setTimeout(() => ctl.abort(), 2500)
      const r = await fetch('/api/sesion?ping=1', { signal: ctl.signal })
      clearTimeout(t)
      const j = await r.json()
      return j?.ok && j.redis ? apiTransport : localTransport
    } catch {
      return localTransport
    }
  })()
  return detected
}

export { wait }
