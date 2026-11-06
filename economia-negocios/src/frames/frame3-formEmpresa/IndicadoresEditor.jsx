import { useState } from 'react'
import { PlusIcon, TrashIcon } from '../../components/Icons'

const CUSTOM = '__custom__'

/**
 * "Configuraciones de Indicadores": lista de indicadores de la empresa con su
 * valor inicial y sus límites (mínimo y máximo), más el selector + botón "+" para
 * agregar uno del catálogo o uno personalizado.
 */
export default function IndicadoresEditor({ indicadores, catalogo, errors, onChange }) {
  const [pick, setPick] = useState('')
  const available = catalogo.filter((c) => !indicadores.some((i) => i.id === c.id))

  const update = (id, patch) => onChange(indicadores.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const remove = (id) => onChange(indicadores.filter((i) => i.id !== id))

  const add = (value) => {
    if (!value) return
    setPick('')
    if (value === CUSTOM) {
      let n = 1
      while (indicadores.some((i) => i.id === `personalizado-${n}`)) n++
      onChange([
        ...indicadores,
        { id: `personalizado-${n}`, nombre: '', valorInicial: '50', min: '0', max: '100' },
      ])
      return
    }
    const item = catalogo.find((c) => c.id === value)
    onChange([
      ...indicadores,
      { id: item.id, nombre: item.nombre, valorInicial: String(item.valorInicial), min: String(item.min), max: String(item.max) },
    ])
  }

  const err = (id) => errors.get(id)

  return (
    <div className="ind">
      {indicadores.length > 0 && (
        <div className="ind__row ind__row--head" aria-hidden="true">
          <span>Indicador</span>
          <span>Valor inicial</span>
          <span>Mínimo</span>
          <span>Máximo</span>
          <span />
        </div>
      )}

      <ul className="ind__list">
        {indicadores.map((ind, n) => {
          const b = `ind-${ind.id}`
          return (
            <li key={ind.id} className="ind__row">
              <div className="ind__cell ind__cell--name">
                <label className="ind__mini" htmlFor={`${b}-nombre`}>Indicador {n + 1}</label>
                <input
                  id={`${b}-nombre`}
                  className="input"
                  value={ind.nombre}
                  placeholder={`Indicador ${n + 1}`}
                  maxLength={40}
                  aria-invalid={Boolean(err(`${b}-nombre`))}
                  onChange={(e) => update(ind.id, { nombre: e.target.value })}
                />
              </div>
              {[
                ['inicial', 'Valor inicial', 'valorInicial'],
                ['min', 'Mínimo', 'min'],
                ['max', 'Máximo', 'max'],
              ].map(([suffix, label, key]) => (
                <div key={suffix} className="ind__cell">
                  <label className="ind__mini" htmlFor={`${b}-${suffix}`}>{label}</label>
                  <input
                    id={`${b}-${suffix}`}
                    className="input ind__num"
                    type="number"
                    inputMode="decimal"
                    value={ind[key]}
                    aria-label={`${label} de ${ind.nombre || `indicador ${n + 1}`}`}
                    aria-invalid={Boolean(err(`${b}-${suffix}`))}
                    onChange={(e) => update(ind.id, { [key]: e.target.value })}
                  />
                </div>
              ))}
              <button
                type="button"
                className="icon-btn ind__remove"
                onClick={() => remove(ind.id)}
                aria-label={`Quitar ${ind.nombre || `indicador ${n + 1}`}`}
              >
                <TrashIcon size={18} />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="ind__add">
        <button
          type="button"
          className="ind__add-plus"
          onClick={() => add(pick)}
          disabled={!pick}
          aria-label="Agregar el indicador elegido"
          title={pick ? 'Agregar indicador' : 'Elige primero un indicador'}
        >
          <PlusIcon size={18} />
        </button>
        <div className="select">
          <select
            id="ef-ind-add"
            aria-label="Agregar indicador"
            aria-invalid={Boolean(err('ef-ind-add'))}
            value={pick}
            onChange={(e) => setPick(e.target.value)}
          >
            <option value="">Elige un indicador…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
            <option value={CUSTOM}>Indicador personalizado…</option>
          </select>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
      {err('ef-ind-add') && <p className="ef-field__err" role="alert">{err('ef-ind-add')}</p>}
    </div>
  )
}
