/**
 * Gráficos vivos y noticias de última hora: reglas puras.
 *
 * Cada pregunta puede traer `grafico` (datos del gráfico) y cada opción su propio `grafico`
 * (qué le pasa al gráfico si la clase elige esa opción). Cada noticia trae su `grafico` completo.
 * Solo se muestran gráficos de temas que el curso ya puede conocer: el tema de la simulación
 * y los anteriores cuya teoría ya se vio. Nunca uno de un tema posterior.
 */
export const TEMA_DE_GRAFICO = { mercado: 'tema-1', elasticidad: 'tema-2', macro: 'tema-3' }

/** ¿Este curso puede ver un gráfico de ese tipo en la simulación del tema `temaActual`? */
export function graficoPermitido(tipo, temaActual, temas, curso) {
  const temaId = TEMA_DE_GRAFICO[tipo]
  const orden = (id) => temas.find((t) => t.id === id)?.orden ?? Infinity
  if (!temaId) return false
  if (orden(temaId) > orden(temaActual)) return false // un tema que todavía no toca
  if (temaId === temaActual) return true
  const p = curso?.estado?.progresoTemas?.[temaId]
  return typeof p === 'object' ? Boolean(p?.teoria) : p === 'completado' // los anteriores deben tener la teoría vista
}

/** Especificación del gráfico de una pregunta para la opción elegida (o null si no hay o no se permite). */
export function especificacion(pregunta, opcion, temaActual, temas, curso) {
  const base = pregunta?.grafico
  if (!base?.tipo) return null
  if (!graficoPermitido(base.tipo, temaActual, temas, curso)) return null
  return { ...base, ...(opcion?.grafico ?? {}) }
}

/** Gráfico de una noticia, con la misma regla de temas vistos. */
export function especificacionNoticia(noticia, temaActual, temas, curso) {
  const g = noticia?.grafico
  if (!g?.tipo || !graficoPermitido(g.tipo, temaActual, temas, curso)) return null
  return g
}

/** Noticias que se pueden lanzar: del tema actual o de temas anteriores ya vistos, y aún no usadas. */
export function noticiasDisponibles(empresa, curso, temaActual, temas, usadas = []) {
  const orden = (id) => temas.find((t) => t.id === id)?.orden ?? Infinity
  return (empresa?.eventos ?? []).filter((ev) => {
    if (usadas.includes(ev.id) || !ev.titular) return false
    if (orden(ev.temaId) > orden(temaActual)) return false
    if (ev.temaId === temaActual) return true
    const p = curso?.estado?.progresoTemas?.[ev.temaId]
    return typeof p === 'object' ? Boolean(p?.teoria) : p === 'completado'
  })
}

/**
 * Cronología de la sesión: inicio, cada decisión y cada noticia, en el orden en que ocurrieron.
 * Cada paso trae los valores de los indicadores justo después de ocurrir.
 */
export function lineaTiempo(ses) {
  const pasos = [{ tipo: 'inicio', valores: ses.valoresIniciales }]
  const noticias = ses.noticias ?? []
  ses.decisiones.forEach((d, i) => {
    pasos.push({ tipo: 'decision', indice: i, valores: d.despues })
    noticias.filter((n) => n.despuesDePregunta === i).forEach((n) => pasos.push({ tipo: 'noticia', id: n.id, titular: n.titular, valores: n.despues }))
  })
  return pasos
}
