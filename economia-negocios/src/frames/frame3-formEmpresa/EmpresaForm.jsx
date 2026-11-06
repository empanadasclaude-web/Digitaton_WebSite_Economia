import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import AuroraBackground from '../../components/AuroraBackground'
import ConfirmDialog from '../../components/ConfirmDialog'
import EliminarEmpresaDialog from '../../components/EliminarEmpresaDialog'
import GlassPanel from '../../components/GlassPanel'
import { CloseIcon, PlusIcon } from '../../components/Icons'
import { setFlash } from '../../components/flash'
import { useTransition } from '../../components/PageTransition'
import { nextEmpresaId, useData } from '../../data/DataContext'
import IndicadoresEditor from './IndicadoresEditor'
import LogoUpload from './LogoUpload'
import PreguntaCard from './PreguntaCard'
import { emptyForm, fromEmpresa, newPregunta, toEmpresa, validate } from './formState'
import './EmpresaForm.css'

function Field({ id, label, optional, error, hint, className = '', children }) {
  return (
    <div className={`ef-field ${className}`}>
      <label htmlFor={id}>
        {label} {optional && <span className="ef-opt">(opcional)</span>}
      </label>
      {children}
      {hint && <small className="ef-field__hint">{hint}</small>}
      {error && (
        <small className="ef-field__err" role="alert">
          {error}
        </small>
      )}
    </div>
  )
}

/**
 * Frame 3 · Creación / edición de empresa.
 * Rutas: /empresas/nueva y /empresas/:id
 */
export default function EmpresaForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const go = useTransition()
  const { empresas, cursos, temas, catalogoIndicadores, saveEmpresa, deleteEmpresa } = useData()

  const existing = editing ? empresas.find((e) => e.id === id) : null
  const [newId] = useState(() => nextEmpresaId(empresas))
  const empresaId = editing ? id : newId

  const [form, setForm] = useState(() => (existing ? fromEmpresa(existing) : emptyForm(catalogoIndicadores)))
  const initialJson = useRef(null)
  if (initialJson.current === null) initialJson.current = JSON.stringify(form)
  const dirty = JSON.stringify(form) !== initialJson.current

  const [errors, setErrors] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [focusUid, setFocusUid] = useState(null)
  const saved = useRef(false)

  const errorMap = useMemo(() => new Map(errors.map((e) => [e.id, e.msg])), [errors])

  // Tras el primer intento de guardar, los errores se actualizan mientras se corrige.
  useEffect(() => {
    if (submitted) setErrors(validate(form))
  }, [form, submitted])

  // Avisa si se intenta cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => {
      if (saved.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Enfoca la pregunta recién agregada.
  useEffect(() => {
    if (!focusUid) return
    document.getElementById(`q-${focusUid}-tema`)?.focus()
    setFocusUid(null)
  }, [focusUid])

  const closeConfirm = useCallback(() => setConfirmClose(false), [])

  if (editing && !existing) return <Navigate to="/" replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  // Al quitar un indicador también se borran sus efectos en las preguntas.
  const setIndicadores = (indicadores) =>
    setForm((f) => {
      const keep = new Set(indicadores.map((i) => i.id))
      return {
        ...f,
        indicadores,
        preguntas: f.preguntas.map((p) => ({
          ...p,
          opciones: p.opciones.map((o) => ({
            ...o,
            efectos: Object.fromEntries(Object.entries(o.efectos).filter(([k]) => keep.has(k))),
          })),
        })),
      }
    })

  const updatePregunta = (uid, next) =>
    setForm((f) => ({ ...f, preguntas: f.preguntas.map((p) => (p.uid === uid ? next : p)) }))
  const removePregunta = (uid) => setForm((f) => ({ ...f, preguntas: f.preguntas.filter((p) => p.uid !== uid) }))
  const addPregunta = () => {
    const p = newPregunta()
    setForm((f) => ({ ...f, preguntas: [...f.preguntas, p] }))
    setFocusUid(p.uid)
  }

  const leave = () => go('/', { label: 'Panel' })
  const requestClose = () => (dirty ? setConfirmClose(true) : leave())

  const onSubmit = (e) => {
    e.preventDefault()
    const errs = validate(form)
    setSubmitted(true)
    setErrors(errs)
    if (errs.length) {
      const el = document.getElementById(errs[0].id)
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el?.focus({ preventScroll: true })
      return
    }
    const empresa = toEmpresa(form, empresaId)
    saveEmpresa(empresa)
    saved.current = true
    setFlash(editing ? 'Empresa actualizada' : 'Empresa creada')
    go('/', { label: empresa.nombre })
  }

  const err = (key) => errorMap.get(key)

  return (
    <main className="ef">
      <AuroraBackground variant="panel" />

      <form className="ef__wrap" onSubmit={onSubmit} noValidate>
        <header className="ef__head rise" style={{ '--d': 0 }}>
          <button type="button" className="icon-btn ef__close" onClick={requestClose} aria-label="Cerrar y volver al panel">
            <CloseIcon size={22} />
          </button>
          <div>
            <h1 className="ef__title">{editing ? 'Edición de Empresa' : 'Creación de Empresa'}</h1>
            <p className="ef__id">ID Empresa : {String(empresaId).replace(/\D/g, '') || empresaId}</p>
          </div>
        </header>

        {editing && (
          <p className="ef__note rise" style={{ '--d': 1 }}>
            Cada curso conserva sus indicadores actuales. Los cambios en preguntas y efectos se aplican a las próximas simulaciones.
          </p>
        )}

        <GlassPanel flat className="ef__panel rise" style={{ '--d': 1 }}>
          {/* ---------- Datos generales ---------- */}
          <section aria-labelledby="sec-general" className="ef__section">
            <h2 id="sec-general" className="ef__h2">Datos generales</h2>
            <div className="ef__grid3">
              <Field id="ef-nombre" label="Nombre de Empresa" error={err('ef-nombre')}>
                <input
                  id="ef-nombre"
                  className="input"
                  value={form.nombre}
                  maxLength={60}
                  placeholder="Ingresar nombre de la empresa"
                  aria-invalid={Boolean(err('ef-nombre'))}
                  onChange={set('nombre')}
                />
              </Field>
              <Field id="ef-sector" label="Sector" optional>
                <input
                  id="ef-sector"
                  className="input"
                  value={form.sector}
                  maxLength={60}
                  placeholder="Ej. Alimentos y lácteos"
                  onChange={set('sector')}
                />
              </Field>
              <Field id="ef-actividad" label="Actividad" optional>
                <input
                  id="ef-actividad"
                  className="input"
                  value={form.actividad}
                  maxLength={120}
                  placeholder="A qué se dedica la empresa"
                  onChange={set('actividad')}
                />
              </Field>
            </div>

            <div className="ef__ctx">
              <Field
                id="ef-contexto"
                label="Contexto de la empresa"
                className="ef__ctx-text"
                error={err('ef-contexto')}
              >
                <textarea
                  id="ef-contexto"
                  className="textarea"
                  value={form.contexto}
                  placeholder="Ingresar texto de contexto de la empresa"
                  aria-invalid={Boolean(err('ef-contexto'))}
                  onChange={set('contexto')}
                />
              </Field>
              <LogoUpload value={form.logo} onChange={(logo) => setForm((f) => ({ ...f, logo }))} />
            </div>
          </section>

          {/* ---------- Narrativa (alimenta el scrollytelling de contextualización) ---------- */}
          <section aria-labelledby="sec-narrativa" className="ef__section">
            <h2 id="sec-narrativa" className="ef__h2">Narrativa de la contextualización</h2>
            <p className="ef__help">
              Estos textos alimentan la página de contexto que ven los estudiantes al entrar al curso. Todo lo que
              escribas aquí es ficticio.
            </p>
            <div className="ef__grid2">
              {[
                ['historia', 'Historia', 'Cómo nació y cómo ha crecido la empresa'],
                ['productos', 'Productos o servicios', 'Qué ofrece al mercado'],
                ['publico', 'Público objetivo', 'A quién le vende'],
                ['situacion', 'Situación actual', 'En qué momento está hoy'],
              ].map(([key, label, placeholder]) => (
                <Field key={key} id={`ef-${key}`} label={label} optional>
                  <textarea
                    id={`ef-${key}`}
                    className="textarea textarea--sm"
                    value={form[key]}
                    placeholder={placeholder}
                    onChange={set(key)}
                  />
                </Field>
              ))}
              <Field id="ef-retos" label="Retos" optional className="ef__span2">
                <textarea
                  id="ef-retos"
                  className="textarea textarea--sm"
                  value={form.retos}
                  placeholder="Los problemas que los estudiantes ayudarán a resolver"
                  onChange={set('retos')}
                />
              </Field>
            </div>
          </section>

          {/* ---------- Indicadores ---------- */}
          <section aria-labelledby="sec-ind" className="ef__section">
            <h2 id="sec-ind" className="ef__h2">Configuraciones de Indicadores</h2>
            <p className="ef__help">
              Define el valor con el que arranca cada indicador y sus límites. Las decisiones suman o restan puntos,
              y el resultado nunca sale de ese rango.
            </p>
            <IndicadoresEditor
              indicadores={form.indicadores}
              catalogo={catalogoIndicadores}
              errors={errorMap}
              onChange={setIndicadores}
            />
          </section>

          {/* ---------- Preguntas ---------- */}
          <section aria-labelledby="sec-preg" className="ef__section">
            <div className="ef__h2-row">
              <h2 id="sec-preg" className="ef__h2">Configuraciones de Preguntas simulación</h2>
              <p className="ef__count"># de preguntas: {form.preguntas.length}</p>
            </div>
            <p className="ef__help">
              Cada opción cambia los indicadores en la cantidad que indiques (usa negativos para restar; vacío es 0).
            </p>

            {form.preguntas.map((p, i) => (
              <PreguntaCard
                key={p.uid}
                index={i}
                pregunta={p}
                indicadores={form.indicadores}
                temas={temas}
                errors={errorMap}
                onChange={(next) => updatePregunta(p.uid, next)}
                onRemove={() => removePregunta(p.uid)}
              />
            ))}

            {form.preguntas.length === 0 && (
              <p className="ef__empty">Aún no hay preguntas: la simulación de esta empresa no podrá iniciarse.</p>
            )}

            <button type="button" className="ef__add-q" onClick={addPregunta}>
              <PlusIcon size={26} />
              <span>Agregar pregunta</span>
            </button>
          </section>
        </GlassPanel>

        <GlassPanel flat className="glass--dense ef__bar">
          <p className="ef__bar-msg" role="alert">
            {errors.length > 0 && (
              <>
                <strong>Revisa {errors.length} {errors.length === 1 ? 'campo' : 'campos'}:</strong> {errors[0].msg}
              </>
            )}
          </p>
          <div className="ef__bar-actions">
            {editing && (
              <button type="button" className="link-btn link-btn--danger ef__delete" onClick={() => setConfirmDelete(true)}>
                Eliminar empresa
              </button>
            )}
            <button type="button" className="link-btn" onClick={requestClose}>
              Cancelar
            </button>
            <button type="submit" className="pill-btn">
              {editing ? 'Guardar cambios' : 'Crear Empresa'}
            </button>
          </div>
        </GlassPanel>
      </form>

      {confirmDelete && existing && (
        <EliminarEmpresaDialog
          empresa={existing}
          cursos={cursos}
          onConfirm={() => {
            saved.current = true // ya no hay nada que descartar
            setFlash('Empresa eliminada')
            deleteEmpresa(existing.id)
            setConfirmDelete(false)
            go('/', { label: 'Panel' })
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {confirmClose && (
        <ConfirmDialog
          danger
          title="¿Descartar los cambios?"
          message="Hay información sin guardar en este formulario. Si sales ahora, se perderá."
          confirmLabel="Sí, descartar"
          cancelLabel="Seguir editando"
          onConfirm={() => {
            setConfirmClose(false)
            saved.current = true
            leave()
          }}
          onCancel={closeConfirm}
        />
      )}
    </main>
  )
}
