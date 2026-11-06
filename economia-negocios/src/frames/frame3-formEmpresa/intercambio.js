/**
 * Exportar / importar una empresa en JSON.
 *
 * Pensado para que el docente le pase el archivo a una IA, ella genere una empresa completa
 * siguiendo las instrucciones del propio archivo, y luego se importe aquí para revisarla y
 * ajustarla a mano antes de guardar. Importar NO guarda: solo llena el formulario.
 */
import { LETTERS, MAX_OPCIONES, fromEmpresa, toEmpresa } from './formState'

export const FORMATO = 'economia-negocios/empresa'

const INSTRUCCIONES = [
  'Este archivo describe UNA empresa ficticia para el simulador «Economía de los Negocios». Devuelve el mismo JSON con el bloque "empresa" completo y deja intactos "formato" y "version".',
  'Todo lo de la empresa es inventado (nombre, historia, cifras). Los temas y conceptos del material de clase son reales: usa solo los temas de "referencia.temas" (campo "id").',
  'empresa.indicadores: 3 a 5 indicadores. Cada uno: id (sin espacios, ej. "ventas"), nombre, valorInicial, min y max (normalmente 50, 0 y 100).',
  'empresa.preguntas: decisiones de negocio con 2 a 4 opciones. Cada pregunta lleva temaId (de referencia.temas), conceptoAcademico (el concepto del material en que se basa) y texto (el planteamiento, con una situación concreta de la empresa).',
  'Cada opción lleva id ("A", "B", "C", "D"), texto y efectos: lista de { "indicadorId": <id de empresa.indicadores>, "delta": <número, puede ser negativo> }. Los deltas típicos van de -10 a +10. Las opciones deben tener ventajas y costos reales: evita que una sea claramente la mejor.',
  'Gráfica opcional por pregunta ("grafico"): { "tipo": "mercado" | "elasticidad" | "macro", ... } y por opción un "grafico" con lo que cambia. Mira "ejemplo" para ver los campos de cada tipo. mercado pertenece al tema 1, elasticidad al tema 2 y macro al tema 3: una pregunta solo muestra gráficas de su tema o de temas anteriores.',
  'empresa.eventos (opcional): noticias de última hora que el docente puede lanzar. Cada una: id, temaId, titular, detalle, efectos (igual que en las opciones) y, si quieres, "grafico" completo.',
  'Los campos de texto de la narrativa (historia, productos, publico, situacion, retos) alimentan la presentación que ven los estudiantes: 2 a 4 frases cada uno.',
  'Responde solo con JSON válido, sin comentarios ni texto adicional.',
]

const EJEMPLO = {
  nombre: 'Café Aurora',
  sector: 'Alimentos y bebidas',
  actividad: 'Cadena de cafeterías de especialidad',
  contexto: 'Café Aurora tiene 12 sedes en Cali y compra su grano a cooperativas del Cauca.',
  historia: 'Nació en 2015 como un local pequeño y hoy emplea a 90 personas.',
  productos: 'Café de origen, bebidas frías y panadería.',
  publico: 'Jóvenes profesionales y estudiantes universitarios.',
  situacion: 'Las ventas crecen, pero los costos del grano suben.',
  retos: 'Proteger el margen sin perder clientes.',
  indicadores: [
    { id: 'ventas', nombre: 'Ventas', valorInicial: 50, min: 0, max: 100 },
    { id: 'rentabilidad', nombre: 'Rentabilidad', valorInicial: 50, min: 0, max: 100 },
    { id: 'satisfaccion', nombre: 'Satisfacción de clientes', valorInicial: 50, min: 0, max: 100 },
  ],
  preguntas: [
    {
      temaId: 'tema-1',
      conceptoAcademico: 'Desplazamientos de la oferta',
      texto: 'El precio internacional del grano sube 20 %. ¿Qué decide Café Aurora?',
      grafico: { tipo: 'mercado', producto: 'Café' },
      opciones: [
        { id: 'A', texto: 'Trasladar el aumento al precio', efectos: [{ indicadorId: 'rentabilidad', delta: 6 }, { indicadorId: 'ventas', delta: -6 }], grafico: { dOferta: -15, nota: 'La oferta se desplaza a la izquierda: sube el precio y baja la cantidad.' } },
        { id: 'B', texto: 'Absorber el costo y mantener precios', efectos: [{ indicadorId: 'rentabilidad', delta: -8 }, { indicadorId: 'satisfaccion', delta: 4 }], grafico: { dOferta: -15, precio: 50, brecha: true, nota: 'Con el precio fijo hay escasez.' } },
      ],
    },
    {
      temaId: 'tema-2',
      conceptoAcademico: 'Elasticidad precio de la demanda',
      texto: 'El café filtrado casi no pierde clientes cuando sube de precio. ¿Qué haces?',
      grafico: { tipo: 'elasticidad', producto: 'Café filtrado', e: 0.5 },
      opciones: [
        { id: 'A', texto: 'Subir el precio 10 %', efectos: [{ indicadorId: 'rentabilidad', delta: 7 }], grafico: { dPrecio: 10, nota: 'Demanda inelástica: el ingreso total aumenta.' } },
        { id: 'B', texto: 'Dejar el precio igual', efectos: [], grafico: { nota: 'Sin cambios en el ingreso.' } },
      ],
    },
    {
      temaId: 'tema-3',
      conceptoAcademico: 'Inflación',
      texto: 'La inflación sigue por encima de la meta. ¿Cómo ajustas tu carta?',
      grafico: { tipo: 'macro', variable: 'Inflación anual', unidad: '%', serie: [3.2, 3.6, 4.1, 4.9], valor: 5.8, meta: 3, decimales: 1 },
      opciones: [
        { id: 'A', texto: 'Ajustar precios cada trimestre', efectos: [{ indicadorId: 'rentabilidad', delta: 5 }, { indicadorId: 'ventas', delta: -3 }], grafico: { nota: 'La inflación se traslada gradualmente a tus precios.' } },
        { id: 'B', texto: 'Congelar precios todo el año', efectos: [{ indicadorId: 'rentabilidad', delta: -7 }, { indicadorId: 'satisfaccion', delta: 3 }] },
      ],
    },
  ],
  eventos: [
    {
      id: 'ev-1',
      temaId: 'tema-1',
      titular: 'Heladas en la zona cafetera',
      detalle: 'La cosecha cae y el grano escasea en todo el país.',
      efectos: [{ indicadorId: 'rentabilidad', delta: -5 }],
      grafico: { tipo: 'mercado', producto: 'Café', dOferta: -15, nota: 'La oferta se desplaza a la izquierda y sube el precio de equilibrio.' },
    },
  ],
}

const aNum = (v, def) => {
  const n = Number(typeof v === 'string' ? v.replace(',', '.') : v)
  return Number.isFinite(n) ? n : def
}
const txt = (v, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : v == null ? '' : String(v).slice(0, max))
const slug = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const referencia = (temas, catalogo) => ({
  temas: temas.map((t) => ({ id: t.id, orden: t.orden, nombre: t.nombre })),
  indicadoresSugeridos: catalogo.map((c) => ({ id: c.id, nombre: c.nombre, valorInicial: c.valorInicial, min: c.min, max: c.max })),
  tiposDeGrafico: {
    mercado: 'Oferta y demanda (tema 1). Base: producto. Cambios: dDemanda, dOferta (desplazamiento en puntos, ej. -15, 5), precio (fija un precio), brecha (true muestra escasez/excedente), nota.',
    elasticidad: 'Elasticidad precio de la demanda (tema 2). Base: producto, e (>0). Cambios: dPrecio (% de cambio de precio), dQ (% de desplazamiento de la demanda), nota.',
    macro: 'Indicador económico en el tiempo (tema 3). Base: variable, unidad, serie (valores anteriores), valor (valor actual), meta (opcional), decimales. Cambios: valor, nota.',
  },
})

/** Arma el archivo descargable. `plantilla` = true usa el ejemplo en lugar de la empresa del formulario. */
export function armarArchivo(form, temas, catalogo, { plantilla = false } = {}) {
  const { id, ficticia, logo, ...resto } = toEmpresa(form, 'emp-exportada') // el logo y el id no viajan
  void id
  void ficticia
  void logo
  const vacia = { nombre: '', sector: '', actividad: '', contexto: '', historia: '', productos: '', publico: '', situacion: '', retos: '', indicadores: EJEMPLO.indicadores, preguntas: [], eventos: [] }
  return {
    formato: FORMATO,
    version: 1,
    instrucciones: INSTRUCCIONES,
    referencia: referencia(temas, catalogo),
    empresa: plantilla ? vacia : resto,
    ejemplo: EJEMPLO,
  }
}

export function descargarJson(obj, nombre) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Texto del archivo → { form, avisos } con el formulario listo, o lanza Error con un mensaje legible.
 * Es tolerante: corrige lo que puede y lo que descarta lo cuenta en `avisos`.
 */
export function importarArchivo(texto, temas, logoActual = null) {
  let data
  try {
    data = JSON.parse(texto)
  } catch {
    throw new Error('El archivo no es un JSON válido. Revisa que la IA haya respondido solo con JSON.')
  }
  const e = data?.empresa && typeof data.empresa === 'object' ? data.empresa : data
  if (!e || typeof e !== 'object' || Array.isArray(e) || !Array.isArray(e.preguntas ?? [])) {
    throw new Error('No encontré una empresa en el archivo. Debe tener un bloque "empresa" con sus preguntas.')
  }
  const avisos = []

  // Indicadores
  const usados = new Set()
  const indicadores = (Array.isArray(e.indicadores) ? e.indicadores : []).slice(0, 8).map((i, n) => {
    const nombre = txt(i?.nombre, 60) || `Indicador ${n + 1}`
    let id = slug(i?.id) || slug(nombre) || `indicador-${n + 1}`
    while (usados.has(id)) id += '-2'
    usados.add(id)
    let min = aNum(i?.min, 0)
    let max = aNum(i?.max, 100)
    if (min >= max) {
      avisos.push(`Indicador «${nombre}»: el mínimo no era menor que el máximo; se usó 0 a 100.`)
      min = 0
      max = 100
    }
    const ini = Math.min(max, Math.max(min, aNum(i?.valorInicial, (min + max) / 2)))
    return { id, nombre, valorInicial: ini, min, max }
  })
  if (!indicadores.length) avisos.push('El archivo no trae indicadores: agrégalos antes de guardar.')
  const porId = new Map(indicadores.map((i) => [i.id, i.id]))
  const porNombre = new Map(indicadores.map((i) => [slug(i.nombre), i.id]))
  let efectosPerdidos = 0
  const efectos = (v) => {
    const lista = Array.isArray(v) ? v : v && typeof v === 'object' ? Object.entries(v).map(([indicadorId, delta]) => ({ indicadorId, delta })) : []
    return lista
      .map((x) => {
        const ref = slug(x?.indicadorId ?? x?.indicador)
        const id = porId.get(ref) ?? porNombre.get(ref)
        const delta = aNum(x?.delta, null)
        if (!id || delta === null) {
          efectosPerdidos++
          return null
        }
        return { indicadorId: id, delta }
      })
      .filter(Boolean)
  }

  // Temas: acepta id ("tema-2"), orden numérico (2) o el nombre
  const temaDe = (v) => {
    if (v == null || v === '') return ''
    const s = String(v)
    const t = temas.find((x) => x.id === s) ?? temas.find((x) => String(x.orden) === s) ?? temas.find((x) => slug(x.nombre) === slug(s))
    return t?.id ?? ''
  }
  let temasSinResolver = 0
  const tema = (v) => {
    const t = temaDe(v)
    if (!t) temasSinResolver++
    return t
  }

  const preguntas = (Array.isArray(e.preguntas) ? e.preguntas : []).slice(0, 60).map((p, n) => {
    const ops = (Array.isArray(p?.opciones) ? p.opciones : []).slice(0, MAX_OPCIONES)
    if ((p?.opciones?.length ?? 0) > MAX_OPCIONES) avisos.push(`Pregunta ${n + 1}: tenía más de ${MAX_OPCIONES} opciones; se conservaron las primeras ${MAX_OPCIONES}.`)
    if (ops.length < 2) avisos.push(`Pregunta ${n + 1}: necesita al menos 2 opciones.`)
    return {
      id: `p${n + 1}`,
      temaId: tema(p?.temaId ?? p?.tema),
      conceptoAcademico: txt(p?.conceptoAcademico ?? p?.concepto, 120),
      texto: txt(p?.texto ?? p?.pregunta, 600),
      ...(p?.grafico && typeof p.grafico === 'object' ? { grafico: p.grafico } : {}),
      opciones: ops.map((o, i) => ({
        id: LETTERS[i],
        texto: txt(o?.texto, 300),
        efectos: efectos(o?.efectos),
        ...(o?.grafico && typeof o.grafico === 'object' ? { grafico: o.grafico } : {}),
      })),
    }
  })

  const eventos = (Array.isArray(e.eventos) ? e.eventos : []).slice(0, 30).map((v, n) => ({
    id: slug(v?.id) || `ev-${n + 1}`,
    temaId: tema(v?.temaId ?? v?.tema),
    titular: txt(v?.titular, 90),
    detalle: txt(v?.detalle, 400),
    efectos: efectos(v?.efectos),
    ...(v?.grafico && typeof v.grafico === 'object' ? { grafico: v.grafico } : {}),
  }))

  if (efectosPerdidos) avisos.push(`${efectosPerdidos} efecto(s) apuntaban a un indicador que no existe y se descartaron.`)
  if (temasSinResolver) avisos.push(`${temasSinResolver} pregunta(s) o noticia(s) tienen un tema que no reconocí: elígelo a mano.`)

  const empresa = {
    nombre: txt(e.nombre, 60),
    sector: txt(e.sector, 60),
    actividad: txt(e.actividad, 120),
    contexto: txt(e.contexto),
    historia: txt(e.historia),
    productos: txt(e.productos),
    publico: txt(e.publico),
    situacion: txt(e.situacion),
    retos: txt(e.retos),
    logo: logoActual,
    indicadores,
    preguntas,
    eventos,
  }
  return { form: fromEmpresa(empresa), avisos, resumen: { preguntas: preguntas.length, noticias: eventos.length, indicadores: indicadores.length } }
}
