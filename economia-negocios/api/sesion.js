/**
 * Sesiones de simulación en tiempo real (función de Vercel).
 *
 * Guarda el estado de cada sesión en Redis (Upstash, desde el Marketplace de Vercel)
 * mediante su API REST, sin librerías. Variables de entorno (las crea la integración):
 *   UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN   (o KV_REST_API_URL / KV_REST_API_TOKEN)
 *
 * Claves por sesión (todas vencen a las 24 h):
 *   ses:{c}:tok  token secreto del docente      ses:{c}:state  estado público de la sesión
 *   ses:{c}:p    hash id → participante          ses:{c}:v      hash "pregunta:id" → opción
 * aeiou
 */
import { hayRedis, redis, variablesVisibles } from './_redis.js'
const TTL = 60 * 60 * 24
const MAX_PARTICIPANTES = 300

const key = (c, k) => `ses:${c}:${k}`
const okCodigo = (c) => typeof c === 'string' && /^[A-Z0-9]{4,8}$/.test(c)
const parse = (s) => {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const send = (code, body) => res.status(code).json(body)
  try {
    const q = req.query ?? {}
    if (req.method === 'GET' && q.ping) return send(200, { ok: true, redis: hayRedis, variables: variablesVisibles() })
    if (!hayRedis) return send(501, { error: 'sin-redis' })

    if (req.method === 'GET') {
      const c = String(q.codigo ?? '').toUpperCase()
      if (!okCodigo(c)) return send(400, { error: 'codigo' })
      const [state, tok, pr, vt] = await redis([
        ['GET', key(c, 'state')],
        ['GET', key(c, 'tok')],
        ['HGETALL', key(c, 'p')],
        ['HGETALL', key(c, 'v')],
      ])
      if (!state) return send(404, { error: 'no-existe' })
      const participantes = []
      for (let i = 0; i < (pr?.length ?? 0); i += 2) participantes.push({ id: pr[i], ...parse(pr[i + 1]) })
      const votos = {}
      for (let i = 0; i < (vt?.length ?? 0); i += 2) {
        const [pregunta, pid] = vt[i].split(':')
        ;(votos[pregunta] ??= {})[pid] = vt[i + 1]
      }
      const esDocente = q.token && q.token === tok
      if (esDocente) return send(200, { state: parse(state), participantes, votos })
      const pid = String(q.pid ?? '')
      const yo = participantes.find((p) => p.id === pid) ?? null
      const miVoto = {}
      for (const [pregunta, m] of Object.entries(votos)) if (m[pid]) miVoto[pregunta] = m[pid]
      return send(200, { state: parse(state), participantes: participantes.map(({ id, nombre }) => ({ id, nombre })), yo, miVoto })
    }

    if (req.method !== 'POST') return send(405, { error: 'metodo' })
    const b = typeof req.body === 'string' ? parse(req.body) ?? {} : req.body ?? {}
    const c = String(b.codigo ?? '').toUpperCase()
    if (!okCodigo(c)) return send(400, { error: 'codigo' })

    if (b.accion === 'crear') {
      if (!b.token || !b.state) return send(400, { error: 'datos' })
      const [nx] = await redis([['SET', key(c, 'tok'), String(b.token), 'NX', 'EX', TTL]])
      if (nx !== 'OK') return send(409, { error: 'codigo-en-uso' })
      await redis([['SET', key(c, 'state'), JSON.stringify(b.state), 'EX', TTL]])
      return send(200, { ok: true })
    }

    if (b.accion === 'publicar') {
      const [tok] = await redis([['GET', key(c, 'tok')]])
      if (!tok || tok !== b.token) return send(403, { error: 'token' })
      await redis([['SET', key(c, 'state'), JSON.stringify(b.state), 'EX', TTL]])
      return send(200, { ok: true })
    }

    if (b.accion === 'unir') {
      const nombre = String(b.nombre ?? '').trim().slice(0, 30)
      if (!nombre) return send(400, { error: 'nombre' })
      const [state, n] = await redis([['GET', key(c, 'state')], ['HLEN', key(c, 'p')]])
      if (!state) return send(404, { error: 'no-existe' })
      if (n >= MAX_PARTICIPANTES) return send(429, { error: 'sala-llena' })
      const pid = Math.random().toString(36).slice(2, 10)
      await redis([
        ['HSET', key(c, 'p'), pid, JSON.stringify({ nombre, en: Date.now() })],
        ['EXPIRE', key(c, 'p'), TTL],
      ])
      return send(200, { pid })
    }

    if (b.accion === 'votar') {
      const [state, existe] = await redis([['GET', key(c, 'state')], ['HEXISTS', key(c, 'p'), String(b.pid)]])
      const s = parse(state)
      if (!s) return send(404, { error: 'no-existe' })
      if (!existe) return send(403, { error: 'participante' })
      if (s.estado !== 'votando' || s.pregunta?.id !== b.preguntaId) return send(409, { error: 'votacion-cerrada' })
      if (!s.pregunta.opciones.some((o) => o.id === b.opcionId)) return send(400, { error: 'opcion' })
      await redis([
        ['HSET', key(c, 'v'), `${b.preguntaId}:${b.pid}`, String(b.opcionId)],
        ['EXPIRE', key(c, 'v'), TTL],
      ])
      return send(200, { ok: true })
    }

    return send(400, { error: 'accion' })
  } catch (e) {
    return send(500, { error: 'servidor', detalle: String(e?.message ?? e) })
  }
}
