import { useCallback, useEffect, useState } from 'react'
import AuroraBackground from '../../components/AuroraBackground'
import GlassPanel from '../../components/GlassPanel'
import UaoLogo from '../../components/UaoLogo'
import AccountMenu from '../../components/AccountMenu'
import { DownloadIcon, LogoMark, PencilIcon, PlusIcon, TrashIcon } from '../../components/Icons'
import { takeFlash } from '../../components/flash'
import { useTransition } from '../../components/PageTransition'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../data/DataContext'
import CourseModal from './CourseModal'
import EliminarEmpresaDialog from '../../components/EliminarEmpresaDialog'
import ResultsModal from './ResultsModal'
import './PanelAdmin.css'

function Card({ title, subtitle, actions, delay, onOpen }) {
  return (
    <article className="card rise" style={{ '--d': delay }}>
      {onOpen ? (
        <button type="button" className="card__open" onClick={onOpen} aria-label={`Entrar a ${title}`}>
          <h3 className="card__title">{title}</h3>
          <p className="card__sub">{subtitle}</p>
        </button>
      ) : (
        <div>
          <h3 className="card__title">{title}</h3>
          <p className="card__sub">{subtitle}</p>
        </div>
      )}
      <div className="card__actions">
        {actions.map((a) => (
          <button key={a.label} type="button" className="card__action" onClick={a.onClick} aria-label={a['aria-label']}>
            <span>{a.label}</span>
            {a.badge > 0 && <span className="card__badge">{a.badge}</span>}
            {a.icon}
          </button>
        ))}
      </div>
    </article>
  )
}

function AddTile({ label, onClick, delay }) {
  return (
    <button type="button" className="tile rise" style={{ '--d': delay }} onClick={onClick} aria-label={label}>
      <span className="tile__plus">
        <PlusIcon />
      </span>
    </button>
  )
}

export default function PanelAdmin() {
  const { user } = useAuth()
  const go = useTransition()
  const { temas, cursos, empresas, createCurso, updateCurso, deleteCurso, deleteEmpresa } = useData()

  // { mode: 'create' } | { mode: 'edit', cursoId } | { mode: 'results', cursoId }
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [empresaDel, setEmpresaDel] = useState(null) // empresa pendiente de confirmar eliminación

  const showToast = useCallback((msg) => setToast({ msg, key: Date.now() }), [])

  // El aviso se oculta solo; se reinicia si llega uno nuevo.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // Mensaje pendiente de otro frame (p. ej. "Empresa creada").
  useEffect(() => {
    const flash = takeFlash()
    if (flash) showToast(flash)
  }, [showToast])

  const closeModal = useCallback(() => setModal(null), [])
  const modalCurso = modal?.cursoId ? cursos.find((c) => c.id === modal.cursoId) : null

  const handleSubmit = ({ nombre, empresaId }) => {
    if (modal.mode === 'edit') {
      updateCurso(modal.cursoId, { nombre })
      showToast('Curso actualizado')
    } else {
      createCurso({ nombre, empresaId })
      showToast('Curso creado')
    }
    setModal(null)
  }

  const handleDelete = () => {
    deleteCurso(modal.cursoId)
    setModal(null)
    showToast('Curso eliminado')
  }

  const handleDeleteEmpresa = () => {
    const res = deleteEmpresa(empresaDel.id)
    setEmpresaDel(null)
    showToast(res.ok ? 'Empresa eliminada' : 'No se pudo eliminar: hay cursos que la usan')
  }

  const empresaNombre = (id) => empresas.find((e) => e.id === id)?.nombre ?? 'Sin empresa'

  return (
    <main className="panel">
      <AuroraBackground variant="panel" />

      <aside className="sidebar rise" style={{ '--d': 0 }}>
        <GlassPanel as="nav" className="rail" aria-label="Navegación principal">
          <span className="rail__logo">
            <LogoMark />
          </span>
          <AccountMenu onNotice={showToast} />
        </GlassPanel>
      </aside>

      <UaoLogo height={26} className="panel__uao rise" />

      <section className="panel__main">
        <h1 className="panel__hello rise" style={{ '--d': 1 }}>
          Hola, {user.givenName}
        </h1>

        <GlassPanel flat className="board rise" style={{ '--d': 2 }}>
          <section aria-labelledby="mis-cursos">
            <h2 id="mis-cursos" className="board__title">Mis cursos</h2>
            <div className="grid">
              {cursos.map((c, i) => (
                <Card
                  key={c.id}
                  title={c.nombre}
                  subtitle={`Empresa: ${empresaNombre(c.empresaId)}`}
                  delay={3 + i}
                  onOpen={() =>
                    go(c.estado?.contextoVisto ? `/curso/${c.id}` : `/curso/${c.id}/contexto`, { label: c.nombre })
                  }
                  actions={[
                    {
                      label: 'Editar',
                      'aria-label': `Editar ${c.nombre}`,
                      icon: <PencilIcon size={20} />,
                      onClick: () => setModal({ mode: 'edit', cursoId: c.id }),
                    },
                    {
                      label: 'Resultados',
                      'aria-label': `Resultados de ${c.nombre}`,
                      icon: <DownloadIcon size={20} />,
                      badge: c.resultados?.length ?? 0,
                      onClick: () => setModal({ mode: 'results', cursoId: c.id }),
                    },
                  ]}
                />
              ))}
              <AddTile label="Crear curso" onClick={() => setModal({ mode: 'create' })} delay={3 + cursos.length} />
            </div>
          </section>

          <section aria-labelledby="mis-empresas">
            <h2 id="mis-empresas" className="board__title">Mis Empresas</h2>
            <div className="grid">
              {empresas.map((e, i) => (
                <Card
                  key={e.id}
                  title={e.nombre}
                  subtitle={e.sector}
                  delay={5 + i}
                  actions={[
                    {
                      label: 'Editar',
                      'aria-label': `Editar ${e.nombre}`,
                      icon: <PencilIcon size={20} />,
                      onClick: () => go(`/empresas/${e.id}`, { label: e.nombre }),
                    },
                    {
                      label: 'Eliminar',
                      'aria-label': `Eliminar ${e.nombre}`,
                      icon: <TrashIcon size={20} />,
                      onClick: () => setEmpresaDel(e),
                    },
                  ]}
                />
              ))}
              <AddTile
                label="Crear empresa"
                onClick={() => go('/empresas/nueva', { label: 'Nueva empresa' })}
                delay={5 + empresas.length}
              />
            </div>
          </section>
        </GlassPanel>
      </section>

      {(modal?.mode === 'create' || (modal?.mode === 'edit' && modalCurso)) && (
        <CourseModal
          mode={modal.mode}
          curso={modalCurso}
          cursos={cursos}
          empresas={empresas}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      )}

      {empresaDel && (
        <EliminarEmpresaDialog
          empresa={empresaDel}
          cursos={cursos}
          onConfirm={handleDeleteEmpresa}
          onCancel={() => setEmpresaDel(null)}
        />
      )}

      {modal?.mode === 'results' && modalCurso && (
        <ResultsModal curso={modalCurso} temas={temas} onClose={closeModal} />
      )}

      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <GlassPanel key={toast.key} className="glass--dense toast">
            {toast.msg}
          </GlassPanel>
        )}
      </div>
    </main>
  )
}
