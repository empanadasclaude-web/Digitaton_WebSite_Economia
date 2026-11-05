import { useRef } from 'react'
import './GlassPanel.css'

/**
 * Panel de vidrio reutilizable. Sigue el puntero con un reflejo especular
 * suave, como la luz recorriendo el borde del vidrio.
 */
export default function GlassPanel({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null)

  const handlePointerMove = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  return (
    <Tag
      ref={ref}
      className={`glass ${className}`.trim()}
      onPointerMove={handlePointerMove}
      {...rest}
    >
      {children}
    </Tag>
  )
}
