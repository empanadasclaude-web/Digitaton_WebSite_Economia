import { useMemo } from 'react'
import { qrMatrix } from './qr'

/** Código QR como SVG (un solo <path>), con zona de silencio y fondo blanco. */
export default function QrCode({ text, label = 'Código QR para unirse a la simulación' }) {
  const { path, n } = useMemo(() => {
    const m = qrMatrix(text)
    let d = ''
    m.forEach((row, y) => {
      let x = 0
      while (x < row.length) {
        if (!row[x]) {
          x++
          continue
        }
        let w = 1
        while (row[x + w]) w++
        d += `M${x + 4} ${y + 4}h${w}v1h-${w}z`
        x += w
      }
    })
    return { path: d, n: m.length + 8 }
  }, [text])
  return (
    <svg className="qr" viewBox={`0 0 ${n} ${n}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      <path d={path} fill="#1a0509" />
    </svg>
  )
}
