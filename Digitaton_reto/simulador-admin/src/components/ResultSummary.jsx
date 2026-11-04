import { Fragment, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LEVELS,
  TOPICS,
  getLevelInfo,
  useGame,
} from '../context/GameContext.jsx';

const pad = (n) => String(n).padStart(2, '0');

function getVerdict(percent) {
  if (percent >= 80) {
    return {
      title: 'Dominio sólido',
      text: 'Tus decisiones fueron coherentes con la teoría y con los números del caso.',
    };
  }
  if (percent >= 50) {
    return {
      title: 'Buen avance',
      text: 'Acertaste en lo central. Repasa las decisiones que dejaron puntos por el camino.',
    };
  }
  return {
    title: 'Hay terreno por reforzar',
    text: 'Vuelve a la retroalimentación de cada caso y repite el tema para mejorar tu puntaje.',
  };
}

/**
 * Pantalla final de un tema.
 *
 * @param {string}   topicId   Id del tema.
 * @param {Array}    decisions [{ caseTitle, optionLabel, points, maxPoints }] (opcional).
 * @param {Function} onRetry   Se llama después de reiniciar el tema, para volver a jugarlo.
 *
 * Al montarse marca el tema como completado. "Repetir tema" reinicia los
 * puntos de ese tema y lo deja pendiente otra vez.
 */
export default function ResultSummary({ topicId, decisions = [], onRetry }) {
  const {
    score,
    level,
    levelInfo,
    completedCount,
    getTopicScore,
    completeTopic,
    resetTopic,
  } = useGame();

  useEffect(() => {
    completeTopic(topicId);
  }, [completeTopic, topicId]);

  const topicIndex = TOPICS.findIndex((t) => t.id === topicId);
  const topic = TOPICS[topicIndex];
  if (!topic) return null;

  const topicScore = getTopicScore(topicId);
  const percent = Math.round((topicScore / topic.maxPoints) * 100);
  const verdict = getVerdict(percent);

  // Nivel que tenía el estudiante antes de sumar los puntos de este tema.
  const levelBefore = getLevelInfo(score - topicScore).current;
  const leveledUp = levelBefore.id !== level.id;

  const nextTopic = TOPICS[topicIndex + 1] ?? null;
  const allDone = completedCount === TOPICS.length;

  const levelHint = levelInfo.next
    ? `Te faltan ${levelInfo.pointsToNext} puntos para ser ${levelInfo.next.name}.`
    : 'Alcanzaste el nivel máximo.';

  const handleRetry = () => {
    resetTopic(topicId);
    onRetry?.();
  };

  return (
    <section className="result" aria-labelledby="result-title">
      <div className="result__hero">
        <p className="result__score" aria-label={`${topicScore} de ${topic.maxPoints} puntos`}>
          {topicScore}
          <small>/{topic.maxPoints}</small>
        </p>
        <div>
          <p className="micro micro--num" id="result-title">
            Resultado del tema
          </p>
          <h2 className="result__verdict">{verdict.title}</h2>
          <p className="prose">{verdict.text}</p>
        </div>
      </div>

      {leveledUp && (
        <p className="result__levelup" role="status">
          Subiste de {levelBefore.name} a {level.name}.
        </p>
      )}

      <div className="result__stats">
        <div className="result__stat">
          <span className="micro">Puntaje total</span>
          <strong>{score}</strong>
        </div>
        <div className="result__stat">
          <span className="micro">Nivel</span>
          <strong>{level.name}</strong>
        </div>
        <div className="result__stat">
          <span className="micro">Temas completados</span>
          <strong>
            {completedCount}/{TOPICS.length}
          </strong>
        </div>
      </div>

      <div className="result__levels">
        <p className="levels__list">
          {LEVELS.map((lvl, i) => (
            <Fragment key={lvl.id}>
              <span className={`levels__item${lvl.id === level.id ? ' is-current' : ''}`}>
                {lvl.name}
              </span>
              {i < LEVELS.length - 1 ? ' / ' : ''}
            </Fragment>
          ))}
        </p>
        <div
          className="meter result__meter"
          role="progressbar"
          aria-label="Avance hacia el siguiente nivel"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(levelInfo.ratio * 100)}
          aria-valuetext={levelHint}
        >
          <div className="meter__fill" style={{ width: `${levelInfo.ratio * 100}%` }} />
        </div>
        <p className="micro">{levelHint}</p>
      </div>

      {decisions.length > 0 && (
        <ol className="result__recap" aria-label="Tus decisiones">
          {decisions.map((decision, i) => (
            <li className="result__row" key={decision.caseId ?? i}>
              <span className="micro micro--num">({pad(i + 1)})</span>
              <span>
                <strong>{decision.caseTitle}</strong>
                <span className="micro result__choice">{decision.optionLabel}</span>
              </span>
              <span className="result__pts">
                +{decision.points}/{decision.maxPoints}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="result__actions">
        {allDone ? (
          <Link to="/" className="btn btn--primary">
            Ver mi progreso en el inicio
          </Link>
        ) : nextTopic ? (
          <Link to={nextTopic.path} className="btn btn--primary">
            Siguiente tema: {nextTopic.title}
          </Link>
        ) : (
          <Link to="/" className="btn btn--primary">
            Volver al inicio
          </Link>
        )}
        <button type="button" className="btn" onClick={handleRetry}>
          Repetir tema
        </button>
        {!allDone && (
          <Link to="/" className="btn">
            Volver al inicio
          </Link>
        )}
        <p className="micro">Repetir reinicia los puntos de este tema.</p>
      </div>
    </section>
  );
}
