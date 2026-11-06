import ConfirmDialog from './ConfirmDialog'

/**
 * Confirmación para eliminar una empresa (la usan el panel y el editor de empresa).
 * Si algún curso todavía usa la empresa, no se puede eliminar: el diálogo solo informa
 * cuáles son, para no dejar cursos apuntando a una empresa que ya no existe.
 */
export default function EliminarEmpresaDialog({ empresa, cursos, onConfirm, onCancel }) {
  const enUso = cursos.filter((c) => c.empresaId === empresa.id)

  if (enUso.length) {
    const nombres = enUso.map((c) => `"${c.nombre}"`).join(', ')
    return (
      <ConfirmDialog
        title={`No se puede eliminar "${empresa.nombre}"`}
        message={
          `${enUso.length === 1 ? 'El curso' : 'Los cursos'} ${nombres} ${enUso.length === 1 ? 'usa' : 'usan'} esta empresa. ` +
          'Elimina primero esos cursos (o créalos con otra empresa) y luego podrás eliminarla.'
        }
        confirmLabel="Entendido"
        cancelLabel="Cerrar"
        onConfirm={onCancel}
        onCancel={onCancel}
      />
    )
  }

  return (
    <ConfirmDialog
      danger
      title={`¿Eliminar "${empresa.nombre}"?`}
      message="Se borrarán su contexto, sus indicadores y sus preguntas de simulación. Esta acción no se puede deshacer."
      confirmLabel="Sí, eliminar empresa"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
