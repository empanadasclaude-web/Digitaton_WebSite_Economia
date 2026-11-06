/** Logo de la UAO (blanco, con fondo transparente). */
export default function UaoLogo({ height = 26, className = '' }) {
  return (
    <img
      className={`uao-logo ${className}`}
      src="/uao-logo.png"
      alt="Universidad Autónoma de Occidente"
      height={height}
      width={Math.round(height * 3.05)}
      decoding="async"
      style={{ height, width: 'auto' }}
    />
  )
}
