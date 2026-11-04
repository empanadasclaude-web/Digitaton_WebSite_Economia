import { useEffect, useMemo, useRef, useState } from 'react';
import { TOPIC_STATUS, useGame } from '../context/GameContext.jsx';

const pad = (n) => String(n).padStart(2, '0');
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const toParagraphs = (text) => (Array.isArray(text) ? text : text ? [text] : []);

function getVerdict(points, bestPoints) {
  const ratio = bestPoints > 0 ? points / bestPoints : 1;
  if (ratio >= 1) return 'Excelente decisión';
  if (ratio >= 0.35) return 'Decisión aceptable';
  return 'Decisión por revisar';
}

/**
 * Un caso de decisión de Lácteos del Valle.
 *
 * @param {string}   topicId      Id del tema al que suma puntos.
 * @param {object}   caseData     {
 *   id, title, context (string | string[]), data?: [{ label, value }],
 *   question, lesson?,
 *   options: [{ id, label, detail?, points, feedback }]
 * }
 * @param {number}   caseNumber   Posición del caso (para el contador).
 * @param {number}   totalCases   Total de casos del tema.
 * @param {Function} onContinue   Recibe { caseId, caseTitle, optionId, optionLabel, points, maxPoints }.
 * @param {string}   continueLabel Texto del botón tras la retroalimentación.
 *
 * Usa `key={caseData.id}` desde el contenedor para reiniciar el estado entre casos.
 */
export default function SimulationCase({
  topicId,
  caseData,
  caseNumber = 1,
  totalCases = 1,
  onContinue,
  continueLabel = 'Siguiente caso',
}) {
  const { addPoints, getTopicStatus } = useGame();
  const [selectedId, setSelectedId] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const feedbackRef = useRef(null);

  const { id, title, context, data, question, options, lesson } = caseData;

  const bestPoints = useMemo(
    () => Math.max(...options.map((option) => option.points)),
    [options]
  );
  const chosen = options.find((option) => option.id === selectedId) ?? null;

  // Si el tema ya estaba completado, el contexto no suma puntos (ver reducer).
  const alreadyCompleted = getTopicStatus(topicId) === TOPIC_STATUS.COMPLETED;
  const earned = chosen ? (alreadyCompleted ? 0 : chosen.points) : 0;

  const handleConfirm = () => {
    if (!chosen || confirmed) return;
    setConfirmed(true);
    addPoints(topicId, chosen.points);
  };

  const handleContinue = () => {
    if (!chosen) return;
    onContinue?.({
      caseId: id,
      caseTitle: title,
      optionId: chosen.id,
      optionLabel: chosen.label,
      points: earned,
      maxPoints: bestPoints,
    });
  };

  // Tras confirmar, el foco pasa a la retroalimentación.
  useEffect(() => {
    if (confirmed) feedbackRef.current?.focus();
  }, [confirmed]);

  return (
    <section className="sim" aria-label={`Caso: ${title}`}>
      <div className="sim__head">
        <p className="micro micro--num">
          ({pad(caseNumber)}/{pad(totalCases)})
        </p>
        <p className="micro">Simulación</p>
      </div>

      <h2 className="sim__title">{title}</h2>

      <div className="sim__context">
        <div className="prose">
          {toParagraphs(context).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {data?.length > 0 && (
          <dl className="sim__facts">
            {data.map((fact) => (
              <div className="sim__fact" key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <fieldset className="sim__options">
        <legend className="sim__question">{question}</legend>

        {options.map((option, i) => {
          const isChosen = confirmed && option.id === selectedId;
          const isBest = confirmed && option.points === bestPoints;
          const isDim = confirmed && !isChosen && !isBest;
          const inputId = `${id}-${option.id}`;

          let tag = '';
          if (isChosen && isBest) tag = 'Tu decisión, la mejor';
          else if (isChosen) tag = 'Tu decisión';
          else if (isBest) tag = 'Mejor decisión';

          return (
            <div
              key={option.id}
              className={`option${confirmed ? ' is-locked' : ''}${
                isChosen ? ' is-chosen' : ''
              }${isBest ? ' is-best' : ''}${isDim ? ' is-dim' : ''}`}
            >
              <input
                className="sr-only"
                type="radio"
                id={inputId}
                name={`${id}-decision`}
                value={option.id}
                checked={selectedId === option.id}
                disabled={confirmed}
                onChange={() => setSelectedId(option.id)}
              />
              <label className="option__card" htmlFor={inputId}>
                <span className="option__letter">{LETTERS[i]}</span>
                <span className="option__label">{option.label}</span>
                <span className="option__tag">{tag}</span>
                {option.detail && (
                  <span className="option__detail">{option.detail}</span>
                )}
              </label>
            </div>
          );
        })}
      </fieldset>

      {confirmed && chosen && (
        <div className="sim__feedback">
          <p className="sim__points" aria-label={`${earned} puntos ganados`}>
            +{earned}
          </p>
          <div>
            <h3 ref={feedbackRef} tabIndex={-1}>
              {getVerdict(chosen.points, bestPoints)}
            </h3>
            <p>{chosen.feedback}</p>
            {lesson && (
              <p className="sim__lesson">
                <strong>Lo que enseña este caso. </strong>
                {lesson}
              </p>
            )}
            {alreadyCompleted && (
              <p className="micro sim__lesson">
                Este tema ya estaba completado, así que esta práctica no suma
                puntos.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="sim__actions">
        {!confirmed ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleConfirm}
            disabled={!chosen}
          >
            Confirmar decisión
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={handleContinue}>
            {continueLabel}
          </button>
        )}
        {!confirmed && !chosen && (
          <p className="micro">Elige una opción para confirmar.</p>
        )}
      </div>
    </section>
  );
}
