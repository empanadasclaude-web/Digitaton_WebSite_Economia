/**
 * Acceso a Redis para las funciones de la carpeta api (el prefijo "_" evita que Vercel
 * lo publique como función). Acepta las dos formas en que Vercel conecta Redis:
 *  - Upstash (API REST):  UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN  (o KV_REST_API_*)
 *  - Redis clásico (node-redis): REDIS_URL  (la integración "Redis" de Vercel)
 * `redis([[comando, ...args], ...])` devuelve la lista de resultados, igual en ambos modos.
 */
// Vercel permite ponerle un prefijo personalizado a las variables (p. ej. STORAGE_KV_REST_API_URL),
// por eso se busca por el final del nombre además de los nombres exactos.
const env = (...nombres) => {
  for (const n of nombres) if (process.env[n]) return process.env[n]
  for (const k of Object.keys(process.env)) if (nombres.some((n) => k.endsWith(`_${n}`)) && process.env[k]) return process.env[k]
  return undefined
}
const URL_REST = env('UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL')
const TOKEN_REST = env('UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN')
const URL_TCP = env('REDIS_URL')

/** Solo los NOMBRES de variables relacionadas (nunca los valores): ayuda a diagnosticar. */
export const variablesVisibles = () => Object.keys(process.env).filter((k) => /REDIS|KV_|UPSTASH/i.test(k)).sort()

export const hayRedis = Boolean((URL_REST && TOKEN_REST) || URL_TCP)
export const modoRedis = URL_REST && TOKEN_REST ? 'rest' : URL_TCP ? 'tcp' : null
export const SECRETO_BASE = TOKEN_REST || URL_TCP || ''

let clienteTcp = null // se reutiliza entre invocaciones mientras la función siga "caliente"

async function conectarTcp() {
  if (clienteTcp?.isReady) return clienteTcp
  const { createClient } = await import('redis')
  clienteTcp = createClient({ url: URL_TCP, socket: { connectTimeout: 8000 } })
  clienteTcp.on('error', () => {})
  await clienteTcp.connect()
  return clienteTcp
}

export async function redis(commands) {
  if (modoRedis === 'rest') {
    const r = await fetch(`${URL_REST}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN_REST}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    })
    if (!r.ok) throw new Error(`Redis ${r.status}`)
    return (await r.json()).map((x) => x.result)
  }
  const c = await conectarTcp()
  return Promise.all(commands.map((cmd) => c.sendCommand(cmd.map(String))))
}
