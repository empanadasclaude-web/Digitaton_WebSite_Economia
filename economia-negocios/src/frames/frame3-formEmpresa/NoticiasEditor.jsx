import { ChevronIcon, PlusIcon, TrashIcon } from '../../components/Icons'
import { GraficoBase, GraficoCambio } from './GraficoEditor'
import { newEvento } from './formState'

/**
 * Noticias de última hora: hechos inesperados que el docente lanza durante la simulación.
 * Cada una mueve indicadores y, opcionalmente, una gráfica. Se muestran solo si su tema ya se vio.
 */
export default function NoticiasEditor({ eventos, indicadores, temas, errors, onChange }) {
  const upd = (uid, patch) => onChange(eventos.map((e) => (e.uid === uid ? { ...e, ...patch } : e)))
  const err = (k) => errors.get(k)

  return (
    <>
      {eventos.map((ev, n) => {
        const b = `ev-${ev.uid}`
        return (
          <div key={ev.uid} className="ne">
            <div className="ne__top">
              <span className="ne__num">Noticia {n + 1}</span>
              <button type="button" className="icon-btn" onClick={() => onChange(eventos.filter((e) => e.uid !== ev.uid))} aria-label={`Eliminar noticia ${n + 1}`}>
                <TrashIcon size={18} />
              </button>
            </div>

            <div className="ne__grid">
              <div className="ef-field">
                <label htmlFor={`${b}-tema`}>Tema</label>
                <div className="select">
                  <select id={`${b}-tema`} value={ev.temaId} aria-invalid={Boolean(err(`${b}-tema`))} onChange={(e) => upd(ev.uid, { temaId: e.target.value })}>
                    <option value="">Selecciona un tema…</option>
                    {temas.map((t) => (
                      <option key={t.id} value={t.id}>Tema {t.orden} · {t.nombre}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
                {err(`${b}-tema`) && <small className="ef-field__err" role="alert">{err(`${b}-tema`)}</small>}
              </div>
              <div className="ef-field">
                <label htmlFor={`${b}-titular`}>Titular</label>
                <input id={`${b}-titular`} className="input" value={ev.titular} maxLength={90} placeholder="Ej. Sequía: el forraje se dispara" aria-invalid={Boolean(err(`${b}-titular`))} onChange={(e) => upd(ev.uid, { titular: e.target.value })} />
                {err(`${b}-titular`) && <small className="ef-field__err" role="alert">{err(`${b}-titular`)}</small>}
              </div>
            </div>

            <div className="ef-field">
              <label htmlFor={`${b}-detalle`}>Qué pasó <span className="ef-opt">(opcional)</span></label>
              <textarea id={`${b}-detalle`} className="textarea textarea--sm" value={ev.detalle} placeholder="Una o dos frases para contar la noticia" onChange={(e) => upd(ev.uid, { detalle: e.target.value })} />
            </div>

            {indicadores.length > 0 && (
              <>
                <p className="ef-label">Efecto en los indicadores</p>
                <div className="opt__effects ne__effects">
                  {indicadores.map((ind) => (
                    <label key={ind.id} className="opt__effect">
                      <span title={ind.nombre}>{ind.nombre || 'Indicador'}</span>
                      <input
                        id={`${b}-ef-${ind.id}`}
                        className="input"
                        type="number"
                        inputMode="decimal"
                        placeholder="± 0"
                        value={ev.efectos[ind.id] ?? ''}
                        aria-invalid={Boolean(err(`${b}-ef-${ind.id}`))}
                        onChange={(e) => upd(ev.uid, { efectos: { ...ev.efectos, [ind.id]: e.target.value } })}
                      />
                    </label>
                  ))}
                </div>
              </>
            )}

            <GraficoBase idBase={b} value={ev.grafico} errors={errors} temas={temas} temaPregunta={ev.temaId} onChange={(grafico) => upd(ev.uid, { grafico })} />
            {ev.grafico?.tipo && (
              <GraficoCambio sinValor idBase={`${b}-c`} tipo={ev.grafico.tipo} value={ev.grafico} onChange={(grafico) => upd(ev.uid, { grafico })} />
            )}
          </div>
        )
      })}

      {eventos.length === 0 && <p className="ef__empty">Sin noticias: el botón «Última hora» no aparecerá en la simulación.</p>}

      <button type="button" className="ef__add-q" onClick={() => onChange([...eventos, newEvento()])}>
        <PlusIcon size={26} />
        <span>Agregar noticia</span>
      </button>
    </>
  )
}
