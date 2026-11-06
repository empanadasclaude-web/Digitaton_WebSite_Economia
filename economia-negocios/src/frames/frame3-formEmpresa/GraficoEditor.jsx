import { ChevronIcon } from '../../components/Icons'
import { TEMA_DE_GRAFICO } from '../../sim/graficos'

/**
 * Editor ligero de gráficas vivas. El docente solo elige el TIPO y llena 2-4 campos;
 * el resto (curvas, ejes, animaciones) lo dibuja la plataforma.
 *
 * Los valores viven como texto mientras se edita (ver formState: grafoDeForm los convierte).
 */
export const TIPOS_GRAFICO = [
  { id: 'mercado', nombre: 'Oferta y demanda', ayuda: 'Curvas de oferta y demanda que se desplazan' },
  { id: 'elasticidad', nombre: 'Elasticidad', ayuda: 'Curva de demanda con el ingreso total' },
  { id: 'macro', nombre: 'Indicador económico', ayuda: 'Serie en el tiempo (inflación, PIB, tasas…)' },
]

const DESPLAZAMIENTOS = [
  ['-15', 'Se reduce mucho'],
  ['-5', 'Se reduce un poco'],
  ['', 'No cambia'],
  ['5', 'Aumenta un poco'],
  ['15', 'Aumenta mucho'],
]

function Campo({ id, label, error, children, className = '' }) {
  return (
    <div className={`ge__f ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <small className="ef-field__err" role="alert">{error}</small>}
    </div>
  )
}

function Texto({ id, label, value, onChange, error, placeholder, type = 'text', className }) {
  return (
    <Campo id={id} label={label} error={error} className={className}>
      <input
        id={id}
        className="input"
        type="text"
        inputMode={type === 'number' ? 'decimal' : undefined}
        value={value ?? ''}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
    </Campo>
  )
}

function Desplazamiento({ id, label, value, onChange }) {
  const v = value ?? ''
  const conocido = DESPLAZAMIENTOS.some(([k]) => k === String(v))
  return (
    <Campo id={id} label={label}>
      <div className="select">
        <select id={id} value={String(v)} onChange={(e) => onChange(e.target.value)}>
          {!conocido && <option value={String(v)}>{`Personalizado (${v})`}</option>}
          {DESPLAZAMIENTOS.map(([k, t]) => (
            <option key={k} value={k}>{t}</option>
          ))}
        </select>
        <ChevronIcon />
      </div>
    </Campo>
  )
}

/** Tipo de gráfica y sus datos base (lo que se ve antes de decidir). */
export function GraficoBase({ idBase, value, onChange, errors, temas, temaPregunta }) {
  const g = value ?? null
  const set = (patch) => onChange({ ...(g ?? {}), ...patch })
  const err = (k) => errors.get(`${idBase}-g-${k}`)
  const temaDe = (tipo) => temas.find((t) => t.id === TEMA_DE_GRAFICO[tipo])
  const t = g?.tipo ? temaDe(g.tipo) : null
  const ordenPregunta = temas.find((x) => x.id === temaPregunta)?.orden
  const adelantada = t && ordenPregunta != null && t.orden > ordenPregunta

  return (
    <div className="ge">
      <div className="ge__row">
        <Campo id={`${idBase}-g-tipo`} label="Gráfica en vivo" className="ge__tipo">
          <div className="select">
            <select
              id={`${idBase}-g-tipo`}
              value={g?.tipo ?? ''}
              onChange={(e) => (e.target.value ? set({ tipo: e.target.value }) : onChange(null))}
            >
              <option value="">Sin gráfica</option>
              {TIPOS_GRAFICO.map((x) => (
                <option key={x.id} value={x.id}>{x.nombre}</option>
              ))}
            </select>
            <ChevronIcon />
          </div>
        </Campo>

        {g?.tipo === 'mercado' && (
          <Texto id={`${idBase}-g-producto`} label="Producto" value={g.producto} placeholder="Ej. Yogur" onChange={(v) => set({ producto: v })} />
        )}
        {g?.tipo === 'elasticidad' && (
          <>
            <Texto id={`${idBase}-g-producto`} label="Producto" value={g.producto} placeholder="Ej. Leche entera" onChange={(v) => set({ producto: v })} />
            <Texto id={`${idBase}-g-e`} label="Elasticidad (ε)" type="number" value={g.e} placeholder="Ej. 0,5" error={err('e')} onChange={(v) => set({ e: v })} />
          </>
        )}
      </div>

      {g?.tipo === 'macro' && (
        <div className="ge__row">
          <Texto id={`${idBase}-g-variable`} label="Variable" value={g.variable} placeholder="Ej. Inflación anual" error={err('variable')} onChange={(v) => set({ variable: v })} />
          <Texto id={`${idBase}-g-unidad`} label="Unidad" value={g.unidad} placeholder="Ej. %" onChange={(v) => set({ unidad: v })} />
          <Texto id={`${idBase}-g-serie`} label="Valores anteriores" value={g.serieTxt} placeholder="Ej. 3,2; 3,6; 4,1; 4,9" error={err('serie')} onChange={(v) => set({ serieTxt: v })} />
          <Texto id={`${idBase}-g-valor`} label="Valor actual" type="number" value={g.valor} placeholder="Ej. 5,8" error={err('valor')} onChange={(v) => set({ valor: v })} />
          <Texto id={`${idBase}-g-meta`} label="Meta (opcional)" type="number" value={g.meta} placeholder="Ej. 3" onChange={(v) => set({ meta: v })} />
        </div>
      )}

      {g?.tipo && (
        <p className={`ge__hint${adelantada ? ' ge__hint--warn' : ''}`}>
          {adelantada
            ? `Esta gráfica es del Tema ${t.orden} y la pregunta es del Tema ${ordenPregunta}: no se mostrará, porque ese tema aún no se ha visto.`
            : t
              ? `Se muestra cuando el curso está en el Tema ${t.orden} o ya vio su teoría.`
              : ''}
        </p>
      )}
    </div>
  )
}

/** Qué le pasa a la gráfica con una opción (o con una noticia). Solo campos del tipo elegido. */
export function GraficoCambio({ idBase, tipo, value, onChange, conNota = true, sinValor = false }) {
  const g = value ?? {}
  const set = (patch) => onChange({ ...g, ...patch })
  if (!tipo) return null
  return (
    <div className="ge__row ge__row--cambio">
      {tipo === 'mercado' && (
        <>
          <Desplazamiento id={`${idBase}-dDemanda`} label="La demanda…" value={g.dDemanda} onChange={(v) => set({ dDemanda: v })} />
          <Desplazamiento id={`${idBase}-dOferta`} label="La oferta…" value={g.dOferta} onChange={(v) => set({ dOferta: v })} />
        </>
      )}
      {tipo === 'elasticidad' && (
        <>
          <Texto id={`${idBase}-dPrecio`} label="Precio cambia (%)" type="number" value={g.dPrecio} placeholder="Ej. 10 o -10" onChange={(v) => set({ dPrecio: v })} />
          <Texto id={`${idBase}-dQ`} label="Demanda se desplaza (%)" type="number" value={g.dQ} placeholder="Ej. -10" onChange={(v) => set({ dQ: v })} />
        </>
      )}
      {tipo === 'macro' && !sinValor && (
        <Texto id={`${idBase}-valor`} label="Valor resultante (opcional)" type="number" value={g.valor} placeholder="Si cambia el valor" onChange={(v) => set({ valor: v })} />
      )}
      {conNota && (
        <Texto id={`${idBase}-nota`} label="Explicación (opcional)" className="ge__nota" value={g.nota} placeholder="Qué pasó en la gráfica y por qué" onChange={(v) => set({ nota: v })} />
      )}
    </div>
  )
}
