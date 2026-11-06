import { useTheme } from '../context/ThemeContext'
import './ThemeSwitch.css'

/** Suiche de paleta: apagado = actual (cobalto), encendido = paleta UAO. `floating` lo fija en la esquina. */
export default function ThemeSwitch({ floating = false, className = '' }) {
  const { theme, toggle } = useTheme()
  const on = theme === 'uao'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Paleta de colores UAO"
      title={on ? 'Volver a la paleta actual' : 'Usar la paleta de la UAO'}
      className={`tswitch${floating ? ' tswitch--float' : ''}${on ? ' is-on' : ''} ${className}`}
      onClick={toggle}
    >
      <span className="tswitch__track">
        <span className="tswitch__knob" />
      </span>
      <span className="tswitch__label">Paleta UAO</span>
    </button>
  )
}
