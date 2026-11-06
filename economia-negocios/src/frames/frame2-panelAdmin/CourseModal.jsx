import { useEffect, useId, useRef, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import GlassPanel from '../../components/GlassPanel'
import { ChevronIcon } from '../../components/Icons'

/**
 * Modal "Creación de Curso" (también sirve para editar y eliminar).
 * En edición la empresa queda bloqueada: el curso ya guarda su propio estado
 * (indicadores, progreso) a partir de ella y cambiarla lo invalidaría.
 */
export default function CourseModal({ mode, curso, cursos, empresas, onClose, onSubmit, onDelete }) {
  const editing = mode === 'edit'
  const uid = useId()
  const nameRef = useRef(null)
  const [nombre, setNombre] = useState(curso?.nombre ?? '')
  const [empresaId, setEmpresaId] = useState(curso?.empresaId ?? empresas[0]?.id ?? '')
  const [error, setError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Foco inicial, cierre con Escape y devolución del foco al cerrar.
  useEffect(() => {
    const previous = document.activeElement
    nameRef.current?.focus()
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

  const submit = (e) => {
    e.preventDefault()
    const clean = nombre.trim()
    if (!clean) return setError('Escribe un nombre para el curso.')
    if (cursos.some((c) => c.id !== curso?.id && c.nombre.trim().toLowerCase() === clean.toLowerCase())) {
      return setError('Ya tienes un curso con ese nombre.')
    }
    if (!editing && !empresaId) return setError('Selecciona la empresa del caso.')
    onSubmit({ nombre: clean, empresaId })
  }

  const empresaNombre = empresas.find((e) => e.id === empresaId)?.nombre
  const nResultados = curso?.resultados?.length ?? 0

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <GlassPanel
        as="form"
        className="glass--dense modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        onSubmit={submit}
        noValidate
      >
        <h2 id={`${uid}-title`} className="modal__title">
          {editing ? 'Editar curso' : 'Creación de Curso'}
        </h2>

        <div className="field">
          <label htmlFor={`${uid}-nombre`}>Nombre curso</label>
          <input
            id={`${uid}-nombre`}
            ref={nameRef}
            type="text"
            value={nombre}
            maxLength={60}
            placeholder="Insertar nombre del curso"
            onChange={(e) => {
              setNombre(e.target.value)
              setError('')
            }}
            aria-invalid={Boolean(error) && !nombre.trim()}
          />
        </div>

        <div className="field">
          <label htmlFor={`${uid}-empresa`}>Caso Empresa</label>
          {editing ? (
            <div className="field__static" id={`${uid}-empresa`}>
              {empresaNombre ?? 'Sin empresa'}
              <small>La empresa no se puede cambiar una vez creado el curso.</small>
            </div>
          ) : empresas.length ? (
            <div className="select">
              <select
                id={`${uid}-empresa`}
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
              >
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
              <ChevronIcon />
            </div>
          ) : (
            <div className="field__static">Primero crea una empresa.</div>
          )}
        </div>

        <p className="modal__error" role="alert">
          {error}
        </p>

        <div className="modal__actions">
          <button type="button" className="link-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="pill-btn" disabled={!editing && !empresas.length}>
            {editing ? 'Guardar cambios' : 'Crear Curso'}
          </button>
        </div>

        {editing && (
          <div className="modal__danger-zone">
            <button
              type="button"
              className="link-btn link-btn--danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Eliminar curso
            </button>
          </div>
        )}
      </GlassPanel>

      {confirmingDelete && (
        <ConfirmDialog
          danger
          title={`¿Eliminar "${curso.nombre}"?`}
          message={
            `Se borrarán el progreso, los indicadores${nResultados ? ` y ${nResultados === 1 ? 'el archivo' : `los ${nResultados} archivos`} de resultados` : ''} de este curso. ` +
            `La empresa ${empresaNombre ?? ''} no se elimina. Esta acción no se puede deshacer.`
          }
          confirmLabel="Sí, eliminar curso"
          onConfirm={onDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
