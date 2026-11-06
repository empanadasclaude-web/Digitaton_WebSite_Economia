/**
 * Periódico del curso: convierte los datos guardados de una simulación en una portada con
 * titulares. Todo se calcula con reglas sobre los datos (sin IA), así que el mismo resultado
 * siempre produce el mismo periódico, también al abrirlo después desde Resultados.
 */
import { saludEmpresa } from './motor'

export const MASTHEAD = 'La Gaceta de los Negocios'

const num = (n, d = 0) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: d }).format(n)
const signo = (n) => (n > 0 ? `+${num(n)}` : n < 0 ? `−${num(Math.abs(n))}` : '0')
const NIVEL = { malo: 0, medio: 1, bueno: 2 }

/** Recorta una opción larga a su primera idea ("Subir el precio 10 %: la cantidad cae…" → "Subir el precio 10 %"). */
export function corto(texto = '', max = 64) {
  const t = texto.trim()
  const primera = t.split(/[:;—–]|\. /)[0].trim()
  const base = primera.length >= 18 ? primera : t
  return base.length > max ? `${base.slice(0, max - 1).trimEnd()}…` : base
}

const elegir = (lista, semilla) => lista[Math.abs(semilla) % lista.length]
const hash = (s = '') => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)

function titularPrincipal(emp, ini, fin, dProm, semilla) {
  const sube = NIVEL[fin] > NIVEL[ini]
  const baja = NIVEL[fin] < NIVEL[ini]
  if (sube && fin === 'bueno') return elegir([`${emp} despega`, `${emp} vive su mejor momento`, `${emp} brilla tras las decisiones del curso`], semilla)
  if (sube) return elegir([`${emp} se recupera`, `${emp} levanta cabeza`, `Respira ${emp}: las cifras mejoran`], semilla)
  if (baja && fin === 'malo') return elegir([`${emp} entra en crisis`, `Alarma en ${emp}: las cifras se desploman`, `${emp} tambalea tras las decisiones del curso`], semilla)
  if (baja) return elegir([`${emp} pierde fuerza`, `${emp} se enfría`, `Preocupación en ${emp}: las cifras caen`], semilla)
  if (dProm > 3) return elegir([`${emp} gana terreno`, `${emp} avanza con paso firme`], semilla)
  if (dProm < -3) return elegir([`${emp} cede terreno`, `${emp} retrocede en las cifras`], semilla)
  return elegir([`${emp} mantiene el rumbo`, `${emp}, sin sobresaltos`, `Calma en ${emp}: todo sigue como estaba`], semilla)
}

/** Arma la portada. `datos` es `resultado.datos` (ver Simulacion.finalizar). */
export function armarPeriodico(datos) {
  const inds = datos.indicadores
  const ini = datos.valoresIniciales
  const fin = datos.valoresFinales
  const preguntas = datos.preguntas ?? []
  const noticias = datos.noticias ?? []
  const nPart = datos.participantes?.length ?? 0
  const semilla = hash(datos.codigo ?? datos.empresa)

  const saludIni = saludEmpresa(inds, ini)
  const saludFin = saludEmpresa(inds, fin)
  const cambios = inds.map((i) => ({ ...i, desde: ini[i.id], hasta: fin[i.id], delta: fin[i.id] - ini[i.id] }))
  const dProm = cambios.reduce((a, c) => a + c.delta, 0) / (cambios.length || 1)
  const mejor = [...cambios].sort((a, b) => b.delta - a.delta)[0]
  const peor = [...cambios].sort((a, b) => a.delta - b.delta)[0]

  const titular = titularPrincipal(datos.empresa, saludIni, saludFin, dProm, semilla)

  const partes = []
  if (mejor && mejor.delta > 0) partes.push(`${mejor.nombre} fue lo que más creció (${signo(mejor.delta)} puntos, hasta ${num(mejor.hasta)})`)
  if (peor && peor.delta < 0) partes.push(`${peor.nombre} fue lo que más sufrió (${signo(peor.delta)} puntos, hasta ${num(peor.hasta)})`)
  const bajada = partes.length
    ? `Tras ${preguntas.length} decisiones colectivas del ${datos.curso}, ${partes.join(' y ')}.`
    : `Tras ${preguntas.length} decisiones colectivas del ${datos.curso}, los indicadores quedaron prácticamente donde empezaron.`

  // Análisis de cada decisión
  const analisis = preguntas.map((p, i) => {
    const d = p.decision
    const gana = p.opciones.find((o) => o.id === d.opcionId)
    const ordenadas = Object.entries(d.porcentajes).sort((a, b) => b[1] - a[1])
    const impacto = d.cambios.reduce((a, c) => a + Math.abs(c.aplicado), 0)
    return { i, p, d, gana, top: ordenadas[0]?.[1] ?? 0, segunda: ordenadas[1]?.[1] ?? 0, ordenadas, impacto }
  })

  const masDividida = [...analisis].filter((a) => a.d.votantes > 0).sort((a, b) => a.top - a.segunda - (b.top - b.segunda))[0]
  const masUnanime = [...analisis].filter((a) => a.d.votantes > 0).sort((a, b) => b.top - a.top)[0]
  const mayorImpacto = [...analisis].sort((a, b) => b.impacto - a.impacto)[0]

  const nombreOpcion = (a, id) => corto(a.p.opciones.find((o) => o.id === id)?.texto)

  const historias = {}
  if (masDividida) {
    const [a1, a2] = masDividida.ordenadas
    historias.dividida = {
      kicker: 'Curso dividido',
      titulo:
        masDividida.d.desempatada
          ? `Empate histórico en «${masDividida.p.concepto || `la pregunta ${masDividida.i + 1}`}»`
          : `Dos bandos en «${masDividida.p.concepto || `la pregunta ${masDividida.i + 1}`}»`,
      cuerpo: masDividida.d.desempatada
        ? `Las opciones «${nombreOpcion(masDividida, a1[0])}» y «${nombreOpcion(masDividida, a2[0])}» quedaron igualadas con ${num(a1[1], 0)} % cada una y el docente tuvo que desempatar.`
        : `${num(a1[1], 0)} % del curso apostó por «${nombreOpcion(masDividida, a1[0])}», mientras ${num(a2[1], 0)} % prefirió «${nombreOpcion(masDividida, a2[0])}».`,
    }
  }
  if (masUnanime && masUnanime !== masDividida && masUnanime.top >= 60) {
    historias.unanime = {
      kicker: masUnanime.top >= 95 ? 'Unanimidad' : 'Consenso',
      titulo: masUnanime.top >= 95 ? `Todo el curso coincide en «${masUnanime.p.concepto || `la pregunta ${masUnanime.i + 1}`}»` : `Mayoría clara en «${masUnanime.p.concepto || `la pregunta ${masUnanime.i + 1}`}»`,
      cuerpo: `${num(masUnanime.top, 0)} % eligió «${corto(masUnanime.gana?.texto)}».`,
    }
  }
  if (mayorImpacto && mayorImpacto.impacto > 0) {
    const grande = [...mayorImpacto.d.cambios].sort((a, b) => Math.abs(b.aplicado) - Math.abs(a.aplicado))[0]
    const ind = inds.find((i) => i.id === grande.indicadorId)
    historias.impacto = {
      kicker: 'La decisión con más peso',
      titulo: `«${corto(mayorImpacto.gana?.texto, 56)}» sacude las cifras`,
      cuerpo: `Fue la decisión que más movió los indicadores en total (${num(mayorImpacto.impacto)} puntos). ${ind?.nombre ?? 'Un indicador'} cambió ${signo(grande.aplicado)}.`,
    }
  }

  const ultimaHora = noticias.map((n) => ({
    titular: n.titular,
    detalle: n.detalle,
    cambios: n.cambios.filter((c) => c.aplicado !== 0).map((c) => ({ nombre: inds.find((i) => i.id === c.indicadorId)?.nombre ?? c.indicadorId, delta: c.aplicado })),
    despuesDePregunta: n.despuesDePregunta + 1,
  }))

  const totalVotos = analisis.reduce((a, x) => a + x.d.votantes, 0)
  const participacion = {
    participantes: nPart,
    promedio: analisis.length ? totalVotos / analisis.length : 0,
    pct: nPart && analisis.length ? Math.round((totalVotos / (nPart * analisis.length)) * 100) : 0,
  }

  const fecha = new Date(datos.fecha)
  return {
    masthead: MASTHEAD,
    empresa: datos.empresa,
    curso: datos.curso,
    tema: datos.tema,
    fechaTexto: fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^\p{L}/u, (c) => c.toUpperCase()),
    titular,
    bajada,
    salud: { ini: saludIni, fin: saludFin },
    cotizaciones: cambios,
    historias,
    ultimaHora,
    participacion,
    // Una línea por decisión, en orden: "Concepto: 66 % eligió «Subir el precio 10 %»".
    resumenDecisiones: analisis.map((a) => ({
      n: a.i + 1,
      concepto: a.p.concepto || `Pregunta ${a.i + 1}`,
      texto: `${num(a.d.porcentajes[a.d.opcionId] ?? 0, 0)} % eligió «${corto(a.gana?.texto, 58)}»${a.d.desempatada ? ' (empate resuelto por el docente)' : ''}`,
    })),
    linea: datos.linea ?? null,
  }
}
