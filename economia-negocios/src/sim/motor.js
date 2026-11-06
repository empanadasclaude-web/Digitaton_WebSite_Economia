/**
 * Reglas de la simulación (funciones puras, sin React ni red).
 *
 * Una votación se cierra contando los votos; la opción más votada es la decisión
 * colectiva. Si hay empate (o nadie votó) el docente elige entre las opciones
 * empatadas. Los efectos de cada opción son DATOS de la pregunta:
 * [{ indicadorId, delta }]; aquí solo se aplican, nunca se programan por opción.
 */

/** Código de sesión corto sin caracteres confusos (sin 0/O, 1/I/L). */
export function generarCodigo(n = 5) {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(n))
  return Array.from(bytes, (b) => abc[b % abc.length]).join('')
}

export const generarToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('')

/** Preguntas del tema, en el orden en que se guardaron en la empresa. */
export const preguntasDelTema = (empresa, temaId) => (empresa?.preguntas ?? []).filter((p) => p.temaId === temaId)

/** Indicadores de partida de la sesión: el estado actual del curso (las decisiones se acumulan). */
export function indicadoresIniciales(empresa, curso) {
  return Object.fromEntries(
    empresa.indicadores.map((i) => {
      const actual = curso?.estado?.indicadores?.find((x) => x.id === i.id)
      return [i.id, actual?.valor ?? i.valorInicial]
    }),
  )
}

/** Cuenta votos por opción. `votos` = { [participanteId]: opcionId }. */
export function contarVotos(pregunta, votos) {
  const conteos = Object.fromEntries(pregunta.opciones.map((o) => [o.id, 0]))
  let total = 0
  Object.values(votos ?? {}).forEach((op) => {
    if (op in conteos) {
      conteos[op]++
      total++
    }
  })
  const porcentajes = Object.fromEntries(
    Object.entries(conteos).map(([k, v]) => [k, total ? Math.round((v / total) * 1000) / 10 : 0]),
  )
  const max = Math.max(...Object.values(conteos))
  const lideres = Object.keys(conteos).filter((k) => conteos[k] === max)
  return {
    conteos,
    porcentajes,
    total,
    lideres,
    empate: lideres.length > 1, // incluye el caso sin votos
    ganadora: lideres.length === 1 ? lideres[0] : null,
  }
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** Aplica los efectos de una opción respetando mínimo y máximo de cada indicador. */
export function aplicarEfectos(empresa, valores, opcion) {
  const despues = { ...valores }
  const cambios = []
  for (const ef of opcion.efectos ?? []) {
    const ind = empresa.indicadores.find((i) => i.id === ef.indicadorId)
    if (!ind) continue
    const antes = despues[ind.id]
    despues[ind.id] = clamp(antes + ef.delta, ind.min, ind.max)
    cambios.push({ indicadorId: ind.id, delta: ef.delta, aplicado: despues[ind.id] - antes })
  }
  return { despues, cambios }
}

/** Color semántico de un indicador según qué tan cerca está de su máximo. */
export function nivel(ind, valor) {
  const r = (valor - ind.min) / (ind.max - ind.min || 1)
  return r < 0.35 ? 'bajo' : r < 0.6 ? 'medio' : 'alto'
}

/**
 * Salud general de la empresa: 'bueno' | 'medio' | 'malo'. Mezcla el promedio de los
 * indicadores (65 %) con el más débil (35 %), para que un indicador en crisis se note
 * aunque los demás estén bien. Con todos los indicadores a mitad de rango da 'medio'.
 */
export function saludEmpresa(indicadores = [], valores = {}) {
  if (!indicadores.length) return 'medio'
  const rs = indicadores.map((i) => {
    const v = valores?.[i.id] ?? i.valorInicial
    return Math.min(1, Math.max(0, (v - i.min) / (i.max - i.min || 1)))
  })
  const prom = rs.reduce((a, b) => a + b, 0) / rs.length
  const score = 0.65 * prom + 0.35 * Math.min(...rs)
  return score < 0.42 ? 'malo' : score >= 0.58 ? 'bueno' : 'medio'
}

export const ETIQUETA_SALUD = { bueno: 'Empresa en buen estado', medio: 'Empresa en estado regular', malo: 'Empresa en crisis' }

/** Datos que ven los estudiantes de una pregunta: nunca incluyen los efectos. */
export const preguntaPublica = (p) =>
  p && {
    id: p.id,
    texto: p.texto,
    concepto: p.conceptoAcademico,
    opciones: p.opciones.map((o) => ({ id: o.id, texto: o.texto })),
  }

/**
 * Cierra la votación de la pregunta actual y registra la decisión.
 * `eleccion` es la opción elegida por el docente cuando hubo empate.
 */
export function decidir({ empresa, pregunta, votos, valores, eleccion }) {
  const c = contarVotos(pregunta, votos)
  const opcionId = c.ganadora ?? eleccion
  if (!opcionId) return null
  const opcion = pregunta.opciones.find((o) => o.id === opcionId)
  const { despues, cambios } = aplicarEfectos(empresa, valores, opcion)
  return {
    preguntaId: pregunta.id,
    opcionId,
    conteos: c.conteos,
    porcentajes: c.porcentajes,
    votantes: c.total,
    empate: c.empate,
    desempatada: c.empate, // en empate la decisión la tomó el docente
    cambios,
    antes: valores,
    despues,
  }
}

/** Estado que ven los estudiantes (se publica en cada cambio de fase). */
export function estadoPublico(ses, empresa, titulo) {
  const p = ses.preguntas[ses.idx]
  const dec = ses.decisiones[ses.idx]
  const visible = ['votando', 'cerrada', 'desempate', 'resultado'].includes(ses.fase)
  return {
    codigo: ses.codigo,
    estado: ses.fase === 'desempate' ? 'cerrada' : ses.fase,
    titulo,
    empresa: empresa.nombre,
    paso: ses.idx + 1,
    total: ses.preguntas.length,
    pregunta: visible ? preguntaPublica(p) : null,
    resultado:
      ses.fase === 'resultado' && dec
        ? {
            opcionId: dec.opcionId,
            conteos: dec.conteos,
            porcentajes: dec.porcentajes,
            votantes: dec.votantes,
            empate: dec.empate,
            cambios: dec.cambios.map((c) => ({ indicadorId: c.indicadorId, delta: c.aplicado })),
          }
        : null,
    indicadores: empresa.indicadores.map((i) => ({ id: i.id, nombre: i.nombre, min: i.min, max: i.max, valor: ses.valores[i.id] })),
    decisiones: ses.decisiones.length,
  }
}
