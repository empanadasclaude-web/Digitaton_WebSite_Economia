import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LEVELS,
  TOPICS,
  TOPIC_STATUS,
  useGame,
} from '../context/GameContext.jsx';

function DropIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        d="M16 3c4.6 6 9 10.4 9 16a9 9 0 0 1-18 0c0-5.6 4.4-10 9-16z"
        fill="#0C0C0C"
      />
    </svg>
  );
}

const pad = (n) => String(n).padStart(2, '0');

export default function Home() {
  const { getTopicStatus, getTopicScore, completedCount, level } = useGame();
  const [hoveredId, setHoveredId] = useState(null);

  const statusLabel = (topic) => {
    const pts = getTopicScore(topic.id);
    if (getTopicStatus(topic.id) === TOPIC_STATUS.COMPLETED) {
      return `Completado · ${pts}/${topic.maxPoints} pts`;
    }
    return pts > 0 ? `En curso · ${pts} pts` : 'Pendiente';
  };

  // El tema que sigue queda arriba de la pila y resaltado por defecto.
  const nextTopic =
    TOPICS.find((t) => getTopicStatus(t.id) === TOPIC_STATUS.PENDING) ??
    TOPICS[0];
  const stack = [nextTopic, ...TOPICS.filter((t) => t.id !== nextTopic.id)];
  const activeId = hoveredId ?? nextTopic.id;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero__word">
          Lácteos
        </h1>

        <div className="hero__stack">
          {stack.map((topic, i) => {
            const index = TOPICS.indexOf(topic);
            const card = (
              <>
                <div className="polaroid__img">
                  <DropIcon />
                </div>
                <div className="polaroid__foot">
                  <span>Tema {index + 1}</span>
                  <span>{i === 0 ? 'Continuar' : statusLabel(topic)}</span>
                </div>
              </>
            );
            return i === 0 ? (
              <Link
                key={topic.id}
                to={topic.path}
                className={`polaroid polaroid--${i + 1}`}
                aria-label={`Continuar con ${topic.title}`}
              >
                {card}
              </Link>
            ) : (
              <div
                key={topic.id}
                className={`polaroid polaroid--${i + 1}`}
                aria-hidden="true"
              >
                {card}
              </div>
            );
          })}
        </div>
      </section>

      <div className="hero__captions">
        <p className="micro">
          Una empresa ficticia del Valle del Cauca y tres decisiones que
          enseñan economía.
        </p>
        <p className="micro">
          Cada tema une teoría, simulación y resultados. Tus puntos suben tu
          nivel.
        </p>
        <p className="micro micro--num">({pad(completedCount)}/{pad(TOPICS.length)})</p>
      </div>

      <nav aria-label="Temas">
        <ul className="topic-list">
          {TOPICS.map((topic, i) => (
            <li key={topic.id}>
              <Link
                to={topic.path}
                className={`topic-row${activeId === topic.id ? ' is-active' : ''}`}
                onMouseEnter={() => setHoveredId(topic.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(topic.id)}
                onBlur={() => setHoveredId(null)}
              >
                <span className="topic-row__side">({pad(i + 1)})</span>
                <span className="topic-row__title">{topic.title}</span>
                <span className="topic-row__side topic-row__side--end">
                  {statusLabel(topic)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="levels" aria-labelledby="levels-title">
        <div className="levels__head">
          <p className="micro micro--num" id="levels-title">
            Tu nivel
          </p>
          <p className="micro">
            Llegas a {LEVELS[1].name} con {LEVELS[1].minScore} puntos y a{' '}
            {LEVELS[2].name} con {LEVELS[2].minScore}.
          </p>
        </div>

        <p className="levels__list">
          {LEVELS.map((lvl, i) => (
            <Fragment key={lvl.id}>
              <span
                className={`levels__item${lvl.id === level.id ? ' is-current' : ''}`}
              >
                {lvl.name}
              </span>
              {i < LEVELS.length - 1 ? ' / ' : ''}
            </Fragment>
          ))}
        </p>
      </section>
    </>
  );
}