/**
 * Lógica del formulario de empresa, separada de la interfaz.
 *
 * Los campos numéricos viven como texto mientras se edita (así se puede borrar
 * el campo o escribir "-") y se convierten a número al guardar.
 * Los efectos de cada opción se guardan como DATOS: [{ indicadorId, delta }],
 * nunca como código, tal como pide el contexto del proyecto.
 */

export const LETTERS = ['A', 'B', 'C', 'D']
export const MAX_OPCIONES = LETTERS.length
export const MIN_OPCIONES = 2
export const MAX_LOGO = { width: 512, height: 512, bytes: 1_000_000 }

let counter = 0
const uid = () => `${Date.now().toString(36)}${(counter++).toString(36)}`

export const newOpcion = () => ({ texto: '', efectos: {} })

export const newEvento = () => ({ uid: uid(), id: null, temaId: '', titular: '', detalle: '', efectos: {}, grafico: null })

/* ---------- Gráficas vivas: texto mientras se edita, datos al guardar ---------- */
const NUM_KEYS = ['e', 'dDemanda', 'dOferta', 'dQ', 'dPrecio', 'precio', 'valor', 'meta', 'decimales']
const TXT_KEYS = ['producto', 'variable', 'unidad', 'nota']
const nums = (txt) =>
  String(txt ?? '')
    .split(/;|\s+/)
    .map((x) => x.trim().replace(/,$/, '').replace(',', '.'))
    .filter(Boolean)
    .map(Number)

/** Datos guardados → estado de edición (números como texto, serie como una línea). */
export function grafoAForm(g) {
  if (!g) return null
  const f = { ...g }
  NUM_KEYS.forEach((k) => {
    if (f[k] !== undefined && f[k] !== null) f[k] = String(f[k])
  })
  if (Array.isArray(g.serie)) f.serieTxt = g.serie.join('; ')
  delete f.serie
  return f
}

/** Estado de edición → datos. Devuelve null si no queda nada (o, para una gráfica base, si no hay tipo). */
export function grafoDeForm(g, { base = false } = {}) {
  if (!g || (base && !g.tipo)) return null
  const o = { ...g }
  NUM_KEYS.forEach((k) => {
    if (o[k] === undefined) return
    const n = num(o[k])
    if (n === null) delete o[k]
    else o[k] = n
  })
  TXT_KEYS.forEach((k) => {
    if (typeof o[k] === 'string') {
      o[k] = o[k].trim()
      if (!o[k]) delete o[k]
    }
  })
  if (o.serieTxt !== undefined) {
    const serie = nums(o.serieTxt).filter(Number.isFinite)
    if (serie.length) o.serie = serie
    delete o.serieTxt
  }
  if (o.tipo === 'macro' && o.decimales === undefined) o.decimales = 1
  return Object.keys(o).length ? o : null
}

const efectosAForm = (lista) => Object.fromEntries((lista ?? []).map((ef) => [ef.indicadorId, String(ef.delta)]))
const efectosDeForm = (obj, validIds) =>
  Object.entries(obj ?? {})
    .filter(([indicadorId, v]) => validIds.has(indicadorId) && num(v) !== null && num(v) !== 0)
    .map(([indicadorId, v]) => ({ indicadorId, delta: num(v) }))

export const newPregunta = () => ({
  uid: uid(),
  temaId: '',
  concepto: '',
  texto: '',
  opciones: [newOpcion(), newOpcion(), newOpcion()],
})

/** Formulario vacío: arranca con tres indicadores del catálogo y una pregunta. */
export function emptyForm(catalogo) {
  return {
    nombre: '',
    sector: '',
    actividad: '',
    contexto: '',
    historia: '',
    productos: '',
    publico: '',
    situacion: '',
    retos: '',
    logo: null,
    indicadores: catalogo.slice(0, 3).map(fromIndicador),
    preguntas: [newPregunta()],
    eventos: [], // noticias de última hora (opcionales)
  }
}

const fromIndicador = (i) => ({
  id: i.id,
  nombre: i.nombre,
  valorInicial: String(i.valorInicial),
  min: String(i.min),
  max: String(i.max),
})

/** Empresa guardada → estado del formulario (para editar). */
export function fromEmpresa(e) {
  return {
    nombre: e.nombre ?? '',
    sector: e.sector ?? '',
    actividad: e.actividad ?? '',
    contexto: e.contexto ?? '',
    historia: e.historia ?? '',
    productos: e.productos ?? '',
    publico: e.publico ?? '',
    situacion: e.situacion ?? '',
    retos: e.retos ?? '',
    logo: e.logo ?? null,
    indicadores: (e.indicadores ?? []).map(fromIndicador),
    eventos: (e.eventos ?? []).map((v) => ({
      uid: uid(),
      id: v.id ?? null,
      temaId: v.temaId ?? '',
      titular: v.titular ?? '',
      detalle: v.detalle ?? '',
      efectos: efectosAForm(v.efectos),
      grafico: grafoAForm(v.grafico),
    })),
    preguntas: (e.preguntas ?? []).map((p) => ({
      uid: uid(),
      grafico: grafoAForm(p.grafico),
      temaId: p.temaId ?? '',
      concepto: p.conceptoAcademico ?? '',
      texto: p.texto ?? '',
      opciones: p.opciones.map((o) => ({
        texto: o.texto,
        grafico: grafoAForm(o.grafico),
        efectos: efectosAForm(o.efectos),
      })),
    })),
  }
}

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(typeof v === 'string' ? v.trim().replace(',', '.') : v)
  return Number.isFinite(n) ? n : null
}

const hasEffects = (o) => Object.values(o.efectos).some((v) => String(v).trim() !== '')

/** Una pregunta sin tocar (recién agregada) se descarta al guardar en vez de dar error. */
export const isBlankPregunta = (p) =>
  !p.texto.trim() && !p.concepto.trim() && !p.temaId && p.opciones.every((o) => !o.texto.trim() && !hasEffects(o))

/** Una noticia sin tocar se descarta al guardar. */
export const isBlankEvento = (v) =>
  !v.titular.trim() && !v.detalle.trim() && !v.temaId && !v.grafico?.tipo && !Object.values(v.efectos).some((x) => String(x).trim() !== '')

/** Estado del formulario → empresa lista para guardar (JSON). */
export function toEmpresa(form, id) {
  const indicadores = form.indicadores.map((i) => ({
    id: i.id,
    nombre: i.nombre.trim(),
    valorInicial: num(i.valorInicial),
    min: num(i.min),
    max: num(i.max),
  }))
  const validIds = new Set(indicadores.map((i) => i.id))

  const preguntas = form.preguntas
    .filter((p) => !isBlankPregunta(p))
    .map((p, n) => ({
      id: `${id}-p${n + 1}`,
      temaId: p.temaId,
      conceptoAcademico: p.concepto.trim(),
      ...(grafoDeForm(p.grafico, { base: true }) ? { grafico: grafoDeForm(p.grafico, { base: true }) } : {}),
      texto: p.texto.trim(),
      opciones: p.opciones.map((o, i) => ({
        id: LETTERS[i],
        texto: o.texto.trim(),
        ...(p.grafico?.tipo && grafoDeForm(o.grafico) ? { grafico: grafoDeForm(o.grafico) } : {}),
        efectos: efectosDeForm(o.efectos, validIds),
      })),
    }))

  const usados = new Set()
  const eventos = (form.eventos ?? [])
    .filter((v) => !isBlankEvento(v))
    .map((v, n) => {
      let evId = v.id && !usados.has(v.id) ? v.id : `${id}-ev${n + 1}`
      while (usados.has(evId)) evId += 'x'
      usados.add(evId)
      const g = grafoDeForm(v.grafico, { base: true })
      return {
        id: evId,
        temaId: v.temaId,
        titular: v.titular.trim(),
        detalle: v.detalle.trim(),
        efectos: efectosDeForm(v.efectos, validIds),
        ...(g ? { grafico: g } : {}),
      }
    })

  return {
    id,
    nombre: form.nombre.trim(),
    ficticia: true, // la información de la empresa es inventada, no material académico
    sector: form.sector.trim(),
    actividad: form.actividad.trim(),
    contexto: form.contexto.trim(),
    historia: form.historia.trim(),
    productos: form.productos.trim(),
    publico: form.publico.trim(),
    situacion: form.situacion.trim(),
    retos: form.retos.trim(),
    logo: form.logo,
    indicadores,
    preguntas,
    ...(eventos.length ? { eventos } : {}),
  }
}

/**
 * Devuelve la lista de errores { id, msg } en el orden en que aparecen en la
 * pantalla; `id` es el id del elemento para poder enfocarlo.
 */
export function validate(form) {
  const errs = []
  const add = (id, msg) => errs.push({ id, msg })

  if (!form.nombre.trim()) add('ef-nombre', 'Escribe el nombre de la empresa.')
  if (!form.contexto.trim()) add('ef-contexto', 'Escribe el contexto de la empresa.')

  if (!form.indicadores.length) add('ef-ind-add', 'Agrega al menos un indicador.')
  const seen = new Set()
  form.indicadores.forEach((ind) => {
    const b = `ind-${ind.id}`
    const name = ind.nombre.trim().toLowerCase()
    if (!name) add(`${b}-nombre`, 'Falta el nombre del indicador.')
    else if (seen.has(name)) add(`${b}-nombre`, `El indicador "${ind.nombre.trim()}" está repetido.`)
    seen.add(name)

    const ini = num(ind.valorInicial)
    const min = num(ind.min)
    const max = num(ind.max)
    if (min === null) add(`${b}-min`, `${ind.nombre || 'Indicador'}: mínimo no válido.`)
    if (max === null) add(`${b}-max`, `${ind.nombre || 'Indicador'}: máximo no válido.`)
    if (min !== null && max !== null && min >= max) {
      add(`${b}-max`, `${ind.nombre || 'Indicador'}: el máximo debe ser mayor que el mínimo.`)
    }
    if (ini === null) add(`${b}-inicial`, `${ind.nombre || 'Indicador'}: valor inicial no válido.`)
    else if (min !== null && max !== null && min < max && (ini < min || ini > max)) {
      add(`${b}-inicial`, `${ind.nombre || 'Indicador'}: el valor inicial debe estar entre el mínimo y el máximo.`)
    }
  })

  const validarGrafico = (g, b, label) => {
    if (!g?.tipo) return
    if (g.tipo === 'elasticidad' && !(num(g.e) > 0)) add(`${b}-g-e`, `${label}: escribe la elasticidad (un número mayor que 0).`)
    if (g.tipo === 'macro') {
      if (!String(g.variable ?? '').trim()) add(`${b}-g-variable`, `${label}: escribe el nombre de la variable.`)
      const serie = nums(g.serieTxt)
      if (serie.length < 2 || !serie.every(Number.isFinite)) add(`${b}-g-serie`, `${label}: escribe al menos 2 valores anteriores, separados por «;».`)
      if (num(g.valor) === null) add(`${b}-g-valor`, `${label}: escribe el valor actual.`)
    }
  }

  form.preguntas.forEach((p, n) => {
    if (isBlankPregunta(p)) return
    const b = `q-${p.uid}`
    const label = `Pregunta ${n + 1}`
    if (!p.temaId) add(`${b}-tema`, `${label}: elige el tema.`)
    if (!p.texto.trim()) add(`${b}-texto`, `${label}: escribe la pregunta.`)
    validarGrafico(p.grafico, b, `${label} (gráfica)`)
    p.opciones.forEach((o, i) => {
      if (!o.texto.trim()) add(`${b}-op${i}`, `${label}: falta el texto de la opción ${LETTERS[i]}.`)
      form.indicadores.forEach((ind) => {
        const v = o.efectos[ind.id]
        if (v !== undefined && String(v).trim() !== '' && num(v) === null) {
          add(`${b}-ef-${i}-${ind.id}`, `${label}, opción ${LETTERS[i]}: el efecto en ${ind.nombre || 'un indicador'} no es un número.`)
        }
      })
    })
  })

  ;(form.eventos ?? []).forEach((v, n) => {
    if (isBlankEvento(v)) return
    const b = `ev-${v.uid}`
    const label = `Noticia ${n + 1}`
    if (!v.temaId) add(`${b}-tema`, `${label}: elige el tema.`)
    if (!v.titular.trim()) add(`${b}-titular`, `${label}: escribe el titular.`)
    validarGrafico(v.grafico, b, `${label} (gráfica)`)
  })

  return errs
}
