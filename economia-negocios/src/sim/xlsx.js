/**
 * Generador de archivos Excel (.xlsx) sin dependencias: un .xlsx es un ZIP de XML.
 * `hojas` = [{ nombre, filas: [[celda, …], …], anchos?: [n, …] }]. La primera fila de
 * cada hoja se escribe en negrita. Las celdas pueden ser texto, número o null.
 */
const enc = new TextEncoder()

// ---- ZIP sin compresión ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zip(files) {
  const chunks = []
  const central = []
  let offset = 0
  const u16 = (v) => [v & 255, (v >>> 8) & 255]
  const u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]
  for (const { name, data } of files) {
    const nameB = enc.encode(name)
    const crc = crc32(data)
    const local = Uint8Array.from([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameB.length), ...u16(0),
    ])
    chunks.push(local, nameB, data)
    central.push(
      Uint8Array.from([
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
        ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameB.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
      ]),
      nameB,
    )
    offset += local.length + nameB.length + data.length
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0)
  const end = Uint8Array.from([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(cdSize), ...u32(offset), ...u16(0),
  ])
  const all = [...chunks, ...central, end]
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0))
  let p = 0
  for (const c of all) {
    out.set(c, p)
    p += c.length
  }
  return out
}

// ---- XML ----
const esc = (s) =>
  String(s)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const colName = (i) => {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

function hojaXml({ filas, anchos }) {
  const cols = anchos ? `<cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''
  const rows = filas
    .map((fila, r) => {
      const cells = fila
        .map((v, c) => {
          if (v === null || v === undefined || v === '') return ''
          const ref = `${colName(c)}${r + 1}`
          const s = r === 0 ? ' s="1"' : ''
          return typeof v === 'number' && Number.isFinite(v)
            ? `<c r="${ref}"${s}><v>${v}</v></c>`
            : `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`
        })
        .join('')
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${rows}</sheetData></worksheet>`
}

const nombreHoja = (n, i) => esc(String(n).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || `Hoja${i + 1}`)

export function crearXlsx(hojas) {
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  const files = [
    {
      name: '[Content_Types].xml',
      data: enc.encode(
        `${X}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas
          .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
          .join('')}</Types>`,
      ),
    },
    {
      name: '_rels/.rels',
      data: enc.encode(
        `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: enc.encode(
        `${X}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas
          .map((h, i) => `<sheet name="${nombreHoja(h.nombre, i)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
          .join('')}</sheets></workbook>`,
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: enc.encode(
        `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas
          .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
          .join('')}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      ),
    },
    {
      name: 'xl/styles.xml',
      data: enc.encode(
        `${X}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
      ),
    },
    ...hojas.map((h, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(hojaXml(h)) })),
  ]
  return zip(files)
}

export function descargarXlsx(bytes, nombre) {
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// ---------- Libros de la plataforma ----------
const fechaLarga = (iso) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

/** Un libro por simulación terminada. `d` es `resultado.datos` (ver Simulacion.jsx). */
export function libroSimulacion(d) {
  const indNombre = (id) => d.indicadores.find((i) => i.id === id)?.nombre ?? id
  const resumen = [
    ['Dato', 'Valor'],
    ['Curso', d.curso],
    ['Empresa (ficticia)', d.empresa],
    ['Tema', d.tema],
    ['Código de la simulación', d.codigo],
    ['Fecha', fechaLarga(d.fecha)],
    ['Participantes', d.participantes.length],
    ['Preguntas', d.preguntas.length],
    [],
    ['Nota', 'La participación no es una calificación: coincidir con la opción más votada no significa responder correctamente.'],
    ['Nota', 'La empresa, las situaciones y los efectos son ficticios; los conceptos provienen del material académico de la asignatura.'],
  ]
  const votaciones = [
    ['N.º', 'Pregunta', 'Concepto académico', 'Votantes', ...d.preguntas[0]?.opciones.flatMap((o) => [`Opción ${o.id}: ${o.texto}`, `% ${o.id}`]) ?? [], 'Decisión colectiva', 'Hubo empate', 'Desempate por el docente', 'Efectos aplicados'],
  ]
  d.preguntas.forEach((p, i) => {
    const dec = p.decision
    votaciones.push([
      i + 1,
      p.texto,
      p.concepto,
      dec.votantes,
      ...p.opciones.flatMap((o) => [dec.conteos[o.id] ?? 0, dec.porcentajes[o.id] ?? 0]),
      `${dec.opcionId}. ${p.opciones.find((o) => o.id === dec.opcionId)?.texto ?? ''}`,
      dec.empate ? 'Sí' : 'No',
      dec.desempatada ? 'Sí' : 'No',
      dec.cambios.map((c) => `${indNombre(c.indicadorId)} ${c.delta > 0 ? '+' : ''}${c.delta}`).join('; '),
    ])
  })
  const respuestas = [['Participante', 'N.º pregunta', 'Pregunta', 'Opción elegida', 'Coincide con la decisión colectiva']]
  d.participantes.forEach((pt) =>
    d.preguntas.forEach((p, i) => {
      const op = d.respuestas.find((r) => r.participanteId === pt.id && r.preguntaId === p.id)?.opcionId
      respuestas.push([pt.nombre, i + 1, p.texto, op ?? 'Sin respuesta', op ? (op === p.decision.opcionId ? 'Sí' : 'No') : ''])
    }),
  )
  const evol = [['Paso', 'Decisión', ...d.indicadores.map((i) => i.nombre)]]
  evol.push(['Inicio', 'Valores de partida', ...d.indicadores.map((i) => d.valoresIniciales[i.id])])
  d.preguntas.forEach((p, i) =>
    evol.push([i + 1, `${p.decision.opcionId}. ${p.opciones.find((o) => o.id === p.decision.opcionId)?.texto ?? ''}`, ...d.indicadores.map((ind) => p.decision.despues[ind.id])]),
  )
  return crearXlsx([
    { nombre: 'Resumen', filas: resumen, anchos: [28, 90] },
    { nombre: 'Votaciones', filas: votaciones, anchos: [6, 60, 40, 10, ...Array(12).fill(18), 40, 12, 22, 60] },
    { nombre: 'Respuestas', filas: respuestas, anchos: [24, 12, 70, 16, 30] },
    { nombre: 'Indicadores', filas: evol, anchos: [10, 60, ...d.indicadores.map(() => 18)] },
  ])
}

/** Consolidado del curso: todas las simulaciones terminadas. */
export function libroConsolidado(curso, resultados) {
  const sims = [['Fecha', 'Tema', 'Código', 'Participantes', 'Preguntas']]
  const dec = [['Fecha', 'Tema', 'N.º', 'Pregunta', 'Decisión colectiva', 'Votantes', 'Empate', 'Desempate por el docente']]
  const ind = [['Fecha', 'Tema', 'Indicador', 'Valor inicial', 'Valor final']]
  ;[...resultados]
    .filter((r) => r.datos)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .forEach(({ datos: d }) => {
      const f = fechaLarga(d.fecha)
      sims.push([f, d.tema, d.codigo, d.participantes.length, d.preguntas.length])
      d.preguntas.forEach((p, i) =>
        dec.push([f, d.tema, i + 1, p.texto, `${p.decision.opcionId}. ${p.opciones.find((o) => o.id === p.decision.opcionId)?.texto ?? ''}`, p.decision.votantes, p.decision.empate ? 'Sí' : 'No', p.decision.desempatada ? 'Sí' : 'No']),
      )
      d.indicadores.forEach((i) => ind.push([f, d.tema, i.nombre, d.valoresIniciales[i.id], d.valoresFinales[i.id]]))
    })
  return crearXlsx([
    { nombre: `Simulaciones ${curso.nombre}`, filas: sims, anchos: [22, 40, 12, 14, 12] },
    { nombre: 'Decisiones', filas: dec, anchos: [22, 40, 6, 70, 60, 10, 10, 22] },
    { nombre: 'Indicadores', filas: ind, anchos: [22, 40, 28, 14, 14] },
  ])
}
