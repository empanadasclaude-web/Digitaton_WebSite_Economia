const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

export function PencilIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.4-9.4z" />
    </svg>
  )
}

export function PlusIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function ChevronIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/** Marca provisional de la plataforma: dos cuadrados, eco de las referencias. */
export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="14" height="14" rx="4.5" fill="#fff" />
      <rect x="16" y="16" width="14" height="14" rx="4.5" fill="#fff" fillOpacity="0.55" />
    </svg>
  )
}

export function TrashIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  )
}

export function CloseIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={1.8}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  )
}

export function DownloadIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 4v11m0 0-4-4m4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  )
}

/** Hoja de cálculo: representa los archivos Excel de resultados. */
export function SheetIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5M9 13h6M9 17h6M9 13v4M15 13v4" />
    </svg>
  )
}

/** Rayo: noticia de última hora. */
export function BoltIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3z" />
    </svg>
  )
}

/** Periódico: la gaceta del curso. */
export function NewspaperIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M5 5h11v14H6a1 1 0 0 1-1-1V5z" />
      <path d="M16 9h3v9a1 1 0 0 1-1 1h-2M8 9h5M8 12.5h5M8 16h3" />
    </svg>
  )
}

/** Gráfica: curvas de la simulación. */
export function ChartIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4 4v16h16" />
      <path d="m7 15 4-5 3 3 5-7" />
    </svg>
  )
}

/** Rayo para dibujar dentro de un <svg> (por ejemplo, en el eje de una gráfica). Centrado en (x, y). */
export function BoltGlyph({ x, y, size = 12 }) {
  const k = size / 24
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${k})`} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3z" />
    </g>
  )
}
