import { useEffect, useId, useRef } from 'react'
import GlassPanel from './GlassPanel'

/**
 * Diálogo de confirmación (eliminar, descartar cambios…).
 * El foco arranca en "Cancelar" para que Enter nunca confirme sin querer, y
 * Escape cancela sin cerrar el modal que haya debajo.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const uid = useId()
  const cancelRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    cancelRef.current?.focus()
    // Fase de captura + stopPropagation: el Escape no llega al modal de abajo.
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      previous?.focus?.()
    }
  }, [onCancel])

  return (
    <div
      className="modal-backdrop modal-backdrop--top"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <GlassPanel
        className="glass--dense modal confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-text`}
      >
        <h2 id={`${uid}-title`} className="modal__title">
          {title}
        </h2>
        <p id={`${uid}-text`} className="confirm__text">
          {message}
        </p>
        <div className="confirm__actions">
          <button type="button" ref={cancelRef} className="link-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`pill-btn${danger ? ' pill-btn--danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </GlassPanel>
    </div>
  )
}
