import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RELEASE_ALL, TOPICS, useGame } from '../context/GameContext.jsx';

function DropMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        d="M16 3c4.6 6 9 10.4 9 16a9 9 0 0 1-18 0c0-5.6 4.4-10 9-16z"
        fill="#0C0C0C"
      />
      <path
        d="M11 20.5a5.2 5.2 0 0 0 4.4 4.9"
        fill="none"
        stroke="#F8F7F2"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <circle cx="8" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M11.5 12H21m-3 0v3m-3-3v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Navbar() {
  const {
    score,
    level,
    levelInfo,
    teacherMode,
    requiresTeacherPin,
    setTeacherMode,
    releasedSlides,
    releaseNext,
    releaseAll,
    resetGame,
  } = useGame();
  const { pathname } = useLocation();

  /* Animación breve del puntaje cuando cambia (respuesta a una acción). */
  const previousScore = useRef(score);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (score === previousScore.current) return undefined;
    previousScore.current = score;
    setBump(true);
    const timer = setTimeout(() => setBump(false), 500);
    return () => clearTimeout(timer);
  }, [score]);

  /* Tema que se está viendo (para los controles del docente). */
  const currentTopic = TOPICS.find((t) => pathname.startsWith(t.path));
  const released = currentTopic ? releasedSlides[currentTopic.id] : 0;

  const handleTeacherToggle = () => {
    if (teacherMode) {
      setTeacherMode(false);
      return;
    }
    let pin = '';
    if (requiresTeacherPin) {
      const answer = window.prompt('PIN docente:');
      if (answer === null) return;
      pin = answer;
    }
    if (!setTeacherMode(true, pin)) {
      window.alert('PIN incorrecto.');
    }
  };

  const handleReset = () => {
    if (window.confirm('¿Reiniciar puntaje y progreso de todos los temas?')) {
      resetGame();
    }
  };

  const levelHint = levelInfo.next
    ? `Te faltan ${levelInfo.pointsToNext} puntos para ser ${levelInfo.next.name}`
    : 'Alcanzaste el nivel máximo';

  return (
    <header className="nav">
      <div className="nav__inner">
        <Link to="/" className="brand" aria-label="Lácteos del Valle, ir al inicio">
          <DropMark />
          <span className="brand__text">Lácteos del Valle</span>
        </Link>

        <div className="stats">
          <div className="stat">
            <span className="stat__label">Puntaje</span>
            <span
              className={`stat__value stat__value--score${bump ? ' is-bump' : ''}`}
              aria-live="polite"
            >
              ({score})
            </span>
          </div>

          <div className="stat stat--level" title={levelHint}>
            <span className="stat__label">Nivel</span>
            <span className="stat__value">{level.name}</span>
            <div
              className="meter"
              role="progressbar"
              aria-label="Avance hacia el siguiente nivel"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(levelInfo.ratio * 100)}
              aria-valuetext={levelHint}
            >
              <div
                className="meter__fill"
                style={{ width: `${levelInfo.ratio * 100}%` }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={teacherMode}
          aria-label="Modo docente"
          title="Modo docente"
          className={`teacher-toggle${teacherMode ? ' is-on' : ''}`}
          onClick={handleTeacherToggle}
        >
          <KeyIcon />
        </button>
      </div>

      {teacherMode && (
        <div className="teacher-bar" role="region" aria-label="Controles del docente">
          <div className="teacher-bar__inner">
            <strong>Modo docente activo</strong>

            {currentTopic ? (
              <>
                <span className="teacher-bar__status">
                  {currentTopic.title}:{' '}
                  {released >= RELEASE_ALL
                    ? 'todas las diapositivas liberadas'
                    : `los estudiantes llegan hasta la diapositiva ${released + 1}`}
                </span>
                <button
                  type="button"
                  className="teacher-bar__btn"
                  onClick={() => releaseNext(currentTopic.id)}
                  disabled={released >= RELEASE_ALL}
                >
                  Liberar siguiente
                </button>
                <button
                  type="button"
                  className="teacher-bar__btn"
                  onClick={() => releaseAll(currentTopic.id)}
                  disabled={released >= RELEASE_ALL}
                >
                  Liberar todo el tema
                </button>
              </>
            ) : (
              <span className="teacher-bar__status">
                Entra a un tema para liberar diapositivas.
              </span>
            )}

            <button
              type="button"
              className="teacher-bar__btn teacher-bar__btn--quiet"
              onClick={handleReset}
            >
              Reiniciar progreso
            </button>
          </div>
        </div>
      )}
    </header>
  );
}