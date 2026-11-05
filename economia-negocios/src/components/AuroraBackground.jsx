import './AuroraBackground.css'

/**
 * Fondo compartido por los frames. El vidrio necesita algo con forma y color
 * detrás para que el blur y la refracción se noten: por eso hay formas
 * nítidas (esfera, anillo, cuadrado) además de luces difusas.
 */
export default function AuroraBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      <span className="aurora__glow aurora__glow--a" />
      <span className="aurora__glow aurora__glow--b" />
      <span className="aurora__glow aurora__glow--c" />

      <span className="aurora__shape aurora__sphere" />
      <span className="aurora__shape aurora__ring" />
      <span className="aurora__shape aurora__tile" />

      <span className="aurora__grain" />
    </div>
  )
}
