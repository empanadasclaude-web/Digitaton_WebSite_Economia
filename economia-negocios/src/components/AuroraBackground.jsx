import './AuroraBackground.css'

/**
 * Fondo compartido por los frames: degradado cobalto → hielo con grano, bloques
 * difusos y cuadrados nítidos de color hielo. El vidrio necesita formas con
 * contraste detrás para que el blur y la refracción se noten.
 *
 * variant="default": los cuadrados rozan el panel central (login).
 * variant="panel": los cuadrados quedan en los bordes para no tapar texto.
 */
export default function AuroraBackground({ variant = 'default' }) {
  return (
    <div className={`aurora aurora--${variant}`} aria-hidden="true">
      <span className="aurora__blur aurora__blur--a" />
      <span className="aurora__blur aurora__blur--b" />
      <span className="aurora__blur aurora__blur--c" />
      <span className="aurora__sq aurora__sq--a" />
      <span className="aurora__sq aurora__sq--b" />
      <span className="aurora__grain" />
    </div>
  )
}
