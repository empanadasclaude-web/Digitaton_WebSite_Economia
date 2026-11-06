/**
 * Cliente de la persistencia en servidor (api/datos.js).
 * Todas las funciones devuelven { ok, status, ... } y nunca lanzan: si el servidor no existe
 * (desarrollo local) o no hay red, la plataforma sigue funcionando con localStorage.
 */
const URL_DATOS = '/api/datos'

async function llamar(opts = {}, query = '') {
  try {
    const r = await fetch(URL_DATOS + query, opts)
    let body = null
    try {
      body = await r.json()
    } catch {
      /* respuesta sin JSON (p. ej. 404 de Vite en desarrollo) */
    }
    return { ok: r.ok, status: r.status, ...(body ?? {}) }
  } catch {
    return { ok: false, status: 0, error: 'red' }
  }
}

const cabeceras = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

/** Cambia el token de Google por el token del servidor. Devuelve { token, exp } o null. */
export async function entrarServidor(accessToken) {
  const r = await llamar({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'entrar', access_token: accessToken }) })
  return r.ok && r.token ? { token: r.token, exp: r.exp } : null
}

export const leerServidor = (token) => llamar({ headers: cabeceras(token) })

export const guardarServidor = (token, db, baseRev) =>
  llamar({ method: 'PUT', headers: cabeceras(token), body: JSON.stringify({ db, baseRev }) })
