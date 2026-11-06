import { ChevronIcon, PlusIcon, TrashIcon } from '../../components/Icons'
import { LETTERS, MAX_OPCIONES, MIN_OPCIONES, newOpcion } from './formState'

/**
 * Una pregunta de la simulación. Cada opción define cuánto suma o resta a cada
 * indicador de la empresa (vacío = 0). Además de lo que muestra el diseño, la
 * pregunta lleva su TEMA (obligatorio: cada pregunta pertenece a un tema) y el
 * concepto del material de clase en que se basa (opcional), para distinguir lo
 * académico de lo ficticio.
 */
export default function PreguntaCard({ index, pregunta, indicadores, temas, errors, onChange, onRemove }) {
  const b = `q-${pregunta.uid}`
  const err = (id) => errors.get(id)
  const set = (patch) => onChange({ ...pregunta, ...patch })

  const setOpcion = (i, patch) =>
    set({ opciones: pregunta.opciones.map((o, k) => (k === i ? { ...o, ...patch } : o)) })

  const setEfecto = (i, indId, value) =>
    setOpcion(i, { efectos: { ...pregunta.opciones[i].efectos, [indId]: value } })

  const addOpcion = () => set({ opciones: [...pregunta.opciones, newOpcion()] })
  const removeOpcion = (i) => set({ opciones: pregunta.opciones.filter((_, k) => k !== i) })

  return (
    <section className="q" aria-label={`Pregunta ${index + 1}`}>
      <span className="q__num" aria-hidden="true">{index + 1}</span>

      <div className="q__card">
        <div className="q__top">
          <div className="ef-field">
            <label htmlFor={`${b}-tema`}>Tema</label>
            <div className="select">
              <select
                id={`${b}-tema`}
                value={pregunta.temaId}
                aria-invalid={Boolean(err(`${b}-tema`))}
                onChange={(e) => set({ temaId: e.target.value })}
              >
                <option value="">Selecciona un tema…</option>
                {temas.map((t) => (
                  <option key={t.id} value={t.id}>
                    Tema {t.orden} · {t.nombre}
                  </option>
                ))}
              </select>
              <ChevronIcon />
            </div>
          </div>

          <div className="ef-field">
            <label htmlFor={`${b}-concepto`}>
              Concepto del material <span className="ef-opt">(opcional)</span>
            </label>
            <input
              id={`${b}-concepto`}
              className="input"
              value={pregunta.concepto}
              maxLength={120}
              placeholder="Ej. Elasticidad precio de la demanda"
              onChange={(e) => set({ concepto: e.target.value })}
            />
          </div>
        </div>

        <div className="ef-field">
          <label htmlFor={`${b}-texto`}>Pregunta</label>
          <input
            id={`${b}-texto`}
            className="input"
            value={pregunta.texto}
            placeholder="Insertar Pregunta"
            aria-invalid={Boolean(err(`${b}-texto`))}
            onChange={(e) => set({ texto: e.target.value })}
          />
        </div>

        <p className="ef-label">Opciones</p>

        {pregunta.opciones.map((op, i) => (
          <div key={i} className="opt">
            <div className="opt__head">
              <span className="opt__letter">{LETTERS[i]}</span>
              <input
                id={`${b}-op${i}`}
                className="input"
                value={op.texto}
                placeholder={`Opción ${LETTERS[i]}`}
                aria-label={`Opción ${LETTERS[i]} de la pregunta ${index + 1}`}
                aria-invalid={Boolean(err(`${b}-op${i}`))}
                onChange={(e) => setOpcion(i, { texto: e.target.value })}
              />
              {pregunta.opciones.length > MIN_OPCIONES && (
                <button
                  type="button"
                  className="icon-btn opt__remove"
                  onClick={() => removeOpcion(i)}
                  aria-label={`Quitar opción ${LETTERS[i]}`}
                >
                  <TrashIcon size={16} />
                </button>
              )}
            </div>

            {indicadores.length > 0 && (
              <div className="opt__effects">
                {indicadores.map((ind) => (
                  <label key={ind.id} className="opt__effect">
                    <span title={ind.nombre}>{ind.nombre || 'Indicador'}</span>
                    <input
                      id={`${b}-ef-${i}-${ind.id}`}
                      className="input"
                      type="number"
                      inputMode="decimal"
                      placeholder="± 0"
                      value={op.efectos[ind.id] ?? ''}
                      aria-invalid={Boolean(err(`${b}-ef-${i}-${ind.id}`))}
                      aria-label={`Efecto de la opción ${LETTERS[i]} en ${ind.nombre || 'el indicador'}`}
                      onChange={(e) => setEfecto(i, ind.id, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="q__foot">
          {pregunta.opciones.length < MAX_OPCIONES ? (
            <button type="button" className="link-btn q__add-opt" onClick={addOpcion}>
              <PlusIcon size={14} /> Agregar opción
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="icon-btn" onClick={onRemove} aria-label={`Eliminar pregunta ${index + 1}`}>
            <TrashIcon size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}
