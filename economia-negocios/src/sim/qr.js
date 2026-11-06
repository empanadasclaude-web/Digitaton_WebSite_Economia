/**
 * Generador de códigos QR (sin dependencias). Modo byte, corrección de errores M,
 * versiones 1–10 (hasta ~210 caracteres): de sobra para un enlace de sesión.
 * Devuelve la matriz de módulos: matriz[y][x] === true es un módulo oscuro.
 */
const ECC_PER_BLOCK_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]
const BLOCKS_M = [-1, 1, 1, 2, 2, 2, 4, 4, 4, 5, 5]

const rawModules = (v) => {
  let r = (16 * v + 128) * v + 64
  if (v >= 2) {
    const a = Math.floor(v / 7) + 2
    r -= (25 * a - 10) * a - 55
    if (v >= 7) r -= 36
  }
  return r
}
const dataCapacity = (v) => Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK_M[v] * BLOCKS_M[v]

// --- Reed–Solomon sobre GF(256) ---
const EXP = new Array(512)
const LOG = new Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
})()
const gmul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

function rsGenerator(deg) {
  let poly = [1]
  for (let i = 0; i < deg; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gmul(poly[j], EXP[i])
    }
    poly = next
  }
  return poly // coeficientes de mayor a menor grado, con el 1 inicial
}
function rsRemainder(data, deg) {
  const gen = rsGenerator(deg)
  const res = new Array(deg).fill(0)
  for (const b of data) {
    const factor = b ^ res.shift()
    res.push(0)
    for (let i = 0; i < deg; i++) res[i] ^= gmul(gen[i + 1], factor)
  }
  return res
}

function utf8(text) {
  return Array.from(new TextEncoder().encode(text))
}

function buildCodewords(bytes, ver) {
  const cap = dataCapacity(ver)
  const bits = []
  const push = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  push(0b0100, 4)
  push(bytes.length, ver >= 10 ? 16 : 8)
  bytes.forEach((b) => push(b, 8))
  push(0, Math.min(4, cap * 8 - bits.length))
  while (bits.length % 8) bits.push(0)
  for (let pad = 0xec; bits.length < cap * 8; pad ^= 0xec ^ 0x11) push(pad, 8)
  const data = []
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2))

  const nb = BLOCKS_M[ver]
  const eccLen = ECC_PER_BLOCK_M[ver]
  const raw = Math.floor(rawModules(ver) / 8)
  const nShort = nb - (raw % nb)
  const shortLen = Math.floor(raw / nb)
  const blocks = []
  for (let i = 0, k = 0; i < nb; i++) {
    const len = shortLen - eccLen + (i < nShort ? 0 : 1)
    const d = data.slice(k, k + len)
    k += len
    blocks.push({ d, e: rsRemainder(d, eccLen) })
  }
  const out = []
  for (let i = 0; i < blocks[nb - 1].d.length; i++) blocks.forEach((b) => i < b.d.length && out.push(b.d[i]))
  for (let i = 0; i < eccLen; i++) blocks.forEach((b) => out.push(b.e[i]))
  return out
}

const alignPositions = (v) => {
  if (v === 1) return []
  const n = Math.floor(v / 7) + 2
  const step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2
  const res = [6]
  for (let pos = v * 4 + 10; res.length < n; pos -= step) res.splice(1, 0, pos)
  return res
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
]

function penalty(m) {
  const n = m.length
  let p = 0
  const runs = (get) => {
    for (let a = 0; a < n; a++) {
      let run = 1
      for (let b = 1; b < n; b++) {
        if (get(a, b) === get(a, b - 1)) {
          run++
          if (run === 5) p += 3
          else if (run > 5) p++
        } else run = 1
      }
    }
  }
  runs((a, b) => m[a][b])
  runs((a, b) => m[b][a])
  for (let y = 0; y < n - 1; y++)
    for (let x = 0; x < n - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3
  const pat = [true, false, true, true, true, false, true, false, false, false, false]
  const find = (get) => {
    for (let a = 0; a < n; a++)
      for (let b = 0; b + 11 <= n; b++) {
        const f = pat.every((v, i) => get(a, b + i) === v)
        const r = pat.every((v, i) => get(a, b + 10 - i) === v)
        if (f || r) p += 40
      }
  }
  find((a, b) => m[a][b])
  find((a, b) => m[b][a])
  const dark = m.flat().filter(Boolean).length
  p += Math.floor(Math.abs((dark * 20) - n * n * 10) / (n * n)) * 10
  return p
}

export function qrMatrix(text) {
  const bytes = utf8(text)
  let ver = 1
  while (ver <= 10 && dataCapacity(ver) < bytes.length + (ver >= 10 ? 3 : 2)) ver++
  if (ver > 10) throw new Error('Texto demasiado largo para el QR')
  const size = ver * 4 + 17
  const cw = buildCodewords(bytes, ver)

  const mod = Array.from({ length: size }, () => new Array(size).fill(false))
  const fn = Array.from({ length: size }, () => new Array(size).fill(false))
  const set = (x, y, v) => {
    if (x >= 0 && y >= 0 && x < size && y < size) {
      mod[y][x] = v
      fn[y][x] = true
    }
  }
  // Timing
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0)
    set(i, 6, i % 2 === 0)
  }
  // Finder + separadores
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy))
        set(cx + dx, cy + dy, d !== 2 && d !== 4)
      }
  }
  // Alineación
  const ap = alignPositions(ver)
  ap.forEach((ax, i) =>
    ap.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) return
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }),
  )
  // Versión
  if (ver >= 7) {
    let rem = ver
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const bits = (ver << 12) | rem
    for (let i = 0; i < 18; i++) {
      const b = ((bits >>> i) & 1) === 1
      const a = size - 11 + (i % 3)
      const c = Math.floor(i / 3)
      set(a, c, b)
      set(c, a, b)
    }
  }
  const formatCells = () => {
    const cells = []
    for (let i = 0; i <= 5; i++) cells.push([8, i])
    cells.push([8, 7], [8, 8], [7, 8])
    for (let i = 9; i < 15; i++) cells.push([14 - i, 8])
    const second = []
    for (let i = 0; i < 8; i++) second.push([size - 1 - i, 8])
    for (let i = 8; i < 15; i++) second.push([8, size - 15 + i])
    return [cells, second]
  }
  const drawFormat = (mask) => {
    const data = (0 << 3) | mask // nivel M = 00
    let rem = data
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const bits = ((data << 10) | rem) ^ 0x5412
    formatCells().forEach((cells) => cells.forEach(([x, y], i) => set(x, y, ((bits >>> i) & 1) === 1)))
    set(8, size - 8, true)
  }
  drawFormat(0) // reserva las celdas

  // Datos en zigzag
  const data = mod.map((r) => r.slice())
  let i = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++)
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert
        if (!fn[y][x]) {
          data[y][x] = i < cw.length * 8 ? ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1 : false
          i++
        }
      }
  }

  let best = null
  let bestP = Infinity
  for (let m = 0; m < 8; m++) {
    const cand = data.map((row, y) => row.map((v, x) => (fn[y][x] ? mod[y][x] : v !== MASKS[m](x, y))))
    // aplica formato de esa máscara
    const prev = mod.map((r) => r.slice())
    const saveMod = mod
    drawFormat(m)
    formatCells().forEach((cells) => cells.forEach(([x, y]) => (cand[y][x] = mod[y][x])))
    cand[size - 8][8] = true
    void prev
    void saveMod
    const p = penalty(cand)
    if (p < bestP) {
      bestP = p
      best = cand
    }
  }
  return best
}
