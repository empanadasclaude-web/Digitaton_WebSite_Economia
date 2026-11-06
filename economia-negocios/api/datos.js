/**
 * Persistencia de cursos y empresas (función de Vercel + Redis de Upstash).
 *
 * Solo pueden leer y escribir los docentes autorizados:
 *  1. El navegador inicia sesión con Google y manda ese token UNA vez (POST accion=entrar).
 *  2. Aquí se verifica con Google que el correo es real y está en la lista autorizada, y se
 *     devuelve un token propio firmado (HMAC) válido 12 h, que se usa en las demás llamadas.
 *
 * Variables de entorno:
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   (las crea la integración; o KV_REST_API_*)
 *   ALLOWED_EMAILS     (opcional) correos separados por coma; por defecto los de la plataforma
 *   ALLOWED_DOMAINS    (opcional) dominios completos autorizados, por coma; por defecto uao.edu.co
 *   REVIEW_CODE        (opcional) código de acceso para evaluadores sin cuenta autorizada; sin él, ese acceso no existe
 *   SESSION_SECRET     (opcional) secreto para firmar el token; por defecto se deriva del token de Redis
 *
 * Claves en Redis: edn:idx (índice + revisión), edn:e:{id} (cada empresa), edn:c:{id} (cada curso).
 * Cada curso/empresa va en su propia clave para no pasar el límite de tamaño por petición.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

import { hayRedis, redis, SECRETO_BASE, variablesVisibles } from './_redis.js'

const SECRET = process.env.SESSION_SECRET || SECRETO_BASE
const PERMITIDOS = (process.env.ALLOWED_EMAILS || 'cichavez@uao.edu.co,empanadasclaude@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)
const DOMINIOS = (process.env.ALLOWED_DOMAINS ?? 'uao.edu.co')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)
const REVIEW_CODE = process.env.REVIEW_CODE || ''
const REVIEW_EMAIL = 'evaluador@revision.local'
const permitido = (email) =>
  PERMITIDOS.includes(email) || DOMINIOS.includes(String(email).split('@')[1]) || (Boolean(REVIEW_CODE) && email === REVIEW_EMAIL)
const igual = (a, b) => {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}
const SESION_MS = 12 * 60 * 60 * 1000
const MAX_ITEM = 900_000 // bytes por empresa/curso (límite de petición de Upstash: 1 MB)

const b64 = (s) => Buffer.from(s).toString('base64url')
const firma = (payload) => createHmac('sha256', SECRET).update(payload).digest('base64url')

function emitirToken(email) {
  const payload = b64(JSON.stringify({ email, exp: Date.now() + SESION_MS }))
  return { token: `${payload}.${firma(payload)}`, exp: Date.now() + SESION_MS }
}

function leerToken(req) {
  const h = String(req.headers.authorization ?? '')
  const t = h.startsWith('Bearer ') ? h.slice(7) : ''
  const [payload, sig] = t.split('.')
  if (!payload || !sig) return null
  const esperada = firma(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(esperada)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return d.exp > Date.now() && permitido(d.email) ? d : null
  } catch {
    return null
  }
}

const okId = (id) => typeof id === 'string' && /^[\w-]{1,80}$/.test(id)
const parse = (s) => {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function validar(db) {
  if (!db || !Array.isArray(db.empresas) || !Array.isArray(db.cursos)) return 'formato'
  if (db.empresas.length > 200 || db.cursos.length > 500) return 'demasiados'
  if (!db.empresas.every((e) => e && okId(e.id)) || !db.cursos.every((c) => c && okId(c.id))) return 'ids'
  return null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const send = (code, body) => res.status(code).json(body)
  try {
    if (req.method === 'GET' && req.query?.ping) return send(200, { ok: true, redis: hayRedis, variables: variablesVisibles() })
    if (!hayRedis) return send(501, { error: 'sin-redis' })

    // Paso 1: cambiar el token de Google por el token propio.
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? parse(req.body) : req.body
      if (body?.accion === 'entrar-codigo') {
        if (!REVIEW_CODE || typeof body.codigo !== 'string' || !igual(body.codigo.trim(), REVIEW_CODE)) return send(403, { error: 'codigo' })
        return send(200, { ...emitirToken(REVIEW_EMAIL), email: REVIEW_EMAIL })
      }
      if (body?.accion !== 'entrar' || typeof body.access_token !== 'string') return send(400, { error: 'peticion' })
      const g = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${body.access_token}` },
      })
      if (!g.ok) return send(401, { error: 'google' })
      const perfil = await g.json()
      const email = String(perfil.email ?? '').toLowerCase()
      if (perfil.email_verified === false || !permitido(email) || email === REVIEW_EMAIL) return send(403, { error: 'no-autorizado' })
      return send(200, { ...emitirToken(email), email })
    }

    const sesion = leerToken(req)
    if (!sesion) return send(401, { error: 'sesion' })

    if (req.method === 'GET') {
      const [raw] = await redis([['GET', 'edn:idx']])
      const idx = parse(raw)
      if (!idx) return send(200, { db: null, rev: 0 })
      const claves = [...idx.empresas.map((id) => ['GET', `edn:e:${id}`]), ...idx.cursos.map((id) => ['GET', `edn:c:${id}`])]
      const valores = claves.length ? await redis(claves) : []
      const items = valores.map(parse)
      const empresas = items.slice(0, idx.empresas.length).filter(Boolean)
      const cursos = items.slice(idx.empresas.length).filter(Boolean)
      return send(200, { db: { empresas, cursos }, rev: idx.rev })
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? parse(req.body) : req.body
      const error = validar(body?.db)
      if (error) return send(400, { error })
      const { db } = body
      const [raw] = await redis([['GET', 'edn:idx']])
      const idx = parse(raw)
      const revActual = idx?.rev ?? 0
      // Otro dispositivo guardó después de la última lectura de este: se devuelve lo del servidor.
      if (Number(body.baseRev ?? 0) !== revActual) {
        return send(409, { error: 'conflicto', rev: revActual })
      }
      const escrituras = []
      for (const [prefijo, lista] of [['e', db.empresas], ['c', db.cursos]]) {
        for (const item of lista) {
          const s = JSON.stringify(item)
          if (Buffer.byteLength(s) > MAX_ITEM) return send(413, { error: 'grande', id: item.id })
          escrituras.push(['SET', `edn:${prefijo}:${item.id}`, s])
        }
      }
      // Borra lo que ya no existe.
      if (idx) {
        const ahora = new Set([...db.empresas.map((e) => `e:${e.id}`), ...db.cursos.map((c) => `c:${c.id}`)])
        for (const id of idx.empresas) if (!ahora.has(`e:${id}`)) escrituras.push(['DEL', `edn:e:${id}`])
        for (const id of idx.cursos) if (!ahora.has(`c:${id}`)) escrituras.push(['DEL', `edn:c:${id}`])
      }
      // Lotes de ~800 KB para respetar el límite por petición.
      let lote = []
      let peso = 0
      for (const cmd of escrituras) {
        const p = JSON.stringify(cmd).length
        if (peso + p > 800_000 && lote.length) {
          await redis(lote)
          lote = []
          peso = 0
        }
        lote.push(cmd)
        peso += p
      }
      if (lote.length) await redis(lote)
      const rev = Date.now()
      await redis([['SET', 'edn:idx', JSON.stringify({ rev, empresas: db.empresas.map((e) => e.id), cursos: db.cursos.map((c) => c.id), por: sesion.email })]])
      return send(200, { ok: true, rev })
    }

    return send(405, { error: 'metodo' })
  } catch (e) {
    return send(500, { error: 'servidor', detalle: String(e?.message ?? e) })
  }
}
