import { useEffect, useId } from 'react'
import GlassPanel from '../../components/GlassPanel'
import { CloseIcon, DownloadIcon, SheetIcon } from '../../components/Icons'

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Resultados de un curso: un archivo Excel por simulación terminada.
 * Cada resultado trae `url` (hoy un enlace de descarga; con el backend, el
 * endpoint que genera el .xlsx). Sin simulaciones, se muestra el estado vacío.
 */
export default function ResultsModal({ curso, temas, onClose }) {
  const uid = useId()
  const resultados = [...(curso.resultados ?? [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  const temaNombre = (id) => temas.find((t) => t.id === id)?.nombre ?? 'Simulación'

  useEffect(() => {
    const previous = document.activeElement
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const scrollLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = scrollLock
      previous?.focus?.()
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <GlassPanel
        className="glass--dense modal results"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
      >
        <div className="results__head">
          <div>
            <h2 id={`${uid}-title`} className="modal__title results__title">
              Resultados
            </h2>
            <p className="results__course">{curso.nombre}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar resultados" autoFocus>
            <CloseIcon size={20} />
          </button>
        </div>

        {resultados.length === 0 ? (
          <div className="results__empty">
            <span className="results__empty-icon">
              <SheetIcon size={30} />
            </span>
            <p className="results__empty-title">Aún no hay resultados</p>
            <p className="results__empty-text">
              Al terminar una simulación de este curso, el archivo Excel aparecerá aquí para que lo descargues.
            </p>
          </div>
        ) : (
          <ul className="results__list">
            {resultados.map((r) => (
              <li key={r.id} className="results__item">
                <span className="results__file-icon">
                  <SheetIcon size={24} />
                </span>
                <div className="results__info">
                  <p className="results__name">{r.nombre}</p>
                  <p className="results__meta">
                    {temaNombre(r.temaId)} · {formatDate(r.fecha)}
                    {r.participantes != null && ` · ${r.participantes} participantes`}
                  </p>
                </div>
                {r.url ? (
                  <a className="pill-btn pill-btn--sm" href={r.url} download={r.nombre}>
                    <DownloadIcon size={18} />
                    Descargar
                  </a>
                ) : (
                  <span className="pill-btn pill-btn--sm" aria-disabled="true">
                    No disponible
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  )
}
