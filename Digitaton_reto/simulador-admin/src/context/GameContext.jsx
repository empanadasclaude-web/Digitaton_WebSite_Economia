import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';

/* -------------------------------------------------------------------------- */
/*  Constantes del juego                                                      */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'lacteos-del-valle:progreso:v1';

export const TOPIC_STATUS = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
});

/** Valor especial de "liberar todo" para el Modo Docente. */
export const RELEASE_ALL = 999;

/**
 * Catálogo de temas. Home, Navbar y los contenedores de tema leen de aquí,
 * así rutas, títulos y puntaje máximo viven en un solo lugar.
 */
export const TOPICS = Object.freeze([
  {
    id: 'market',
    path: '/tema-1',
    title: 'Análisis del mercado',
    summary: 'Demanda, oferta y competencia en el mercado lácteo del Valle.',
    maxPoints: 100,
  },
  {
    id: 'pricing',
    path: '/tema-2',
    title: 'Decisiones tarifarias',
    summary: 'Cómo fijar precios sin perder margen ni clientes.',
    maxPoints: 100,
  },
  {
    id: 'macro',
    path: '/tema-3',
    title: 'Indicadores macroeconómicos',
    summary: 'Inflación, tasas y tipo de cambio frente a la operación.',
    maxPoints: 100,
  },
]);

const TOPIC_BY_ID = Object.freeze(
  Object.fromEntries(TOPICS.map((topic) => [topic.id, topic]))
);

export const MAX_SCORE = TOPICS.reduce((sum, topic) => sum + topic.maxPoints, 0);

export const LEVELS = Object.freeze([
  { id: 'aprendiz', name: 'Aprendiz', minScore: 0 },
  { id: 'analista', name: 'Analista', minScore: 100 },
  { id: 'estratega', name: 'Estratega', minScore: 220 },
]);

/** Devuelve nivel actual, siguiente nivel y avance hacia él para un puntaje. */
export function getLevelInfo(score) {
  let index = 0;
  LEVELS.forEach((level, i) => {
    if (score >= level.minScore) index = i;
  });

  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;

  if (!next) {
    return { current, next: null, pointsToNext: 0, ratio: 1 };
  }

  const span = next.minScore - current.minScore;
  return {
    current,
    next,
    pointsToNext: next.minScore - score,
    ratio: Math.min(1, Math.max(0, (score - current.minScore) / span)),
  };
}

/* -------------------------------------------------------------------------- */
/*  Estado persistente (puntos + progreso)                                    */
/* -------------------------------------------------------------------------- */

function createInitialState() {
  return {
    topicScores: Object.fromEntries(TOPICS.map((t) => [t.id, 0])),
    progress: Object.fromEntries(
      TOPICS.map((t) => [t.id, TOPIC_STATUS.PENDING])
    ),
  };
}

/** Lee y valida lo guardado; si algo no cuadra, arranca desde cero. */
function loadState() {
  const fresh = createInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw);

    TOPICS.forEach(({ id, maxPoints }) => {
      const pts = Number(saved?.topicScores?.[id]);
      if (Number.isFinite(pts)) {
        fresh.topicScores[id] = Math.min(maxPoints, Math.max(0, Math.round(pts)));
      }
      if (saved?.progress?.[id] === TOPIC_STATUS.COMPLETED) {
        fresh.progress[id] = TOPIC_STATUS.COMPLETED;
      }
    });
    return fresh;
  } catch {
    return fresh;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_POINTS': {
      const topic = TOPIC_BY_ID[action.topicId];
      // Un tema completado no suma más puntos: evita "farmear" repitiendo casos.
      if (!topic || state.progress[topic.id] === TOPIC_STATUS.COMPLETED) {
        return state;
      }
      const gained = Math.max(0, Math.round(Number(action.points) || 0));
      if (gained === 0) return state;

      const next = Math.min(
        topic.maxPoints,
        state.topicScores[topic.id] + gained
      );
      return {
        ...state,
        topicScores: { ...state.topicScores, [topic.id]: next },
      };
    }

    case 'COMPLETE_TOPIC': {
      if (!TOPIC_BY_ID[action.topicId]) return state;
      if (state.progress[action.topicId] === TOPIC_STATUS.COMPLETED) {
        return state;
      }
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.topicId]: TOPIC_STATUS.COMPLETED,
        },
      };
    }

    case 'RESET_TOPIC': {
      if (!TOPIC_BY_ID[action.topicId]) return state;
      return {
        topicScores: { ...state.topicScores, [action.topicId]: 0 },
        progress: {
          ...state.progress,
          [action.topicId]: TOPIC_STATUS.PENDING,
        },
      };
    }

    case 'RESET_GAME':
      return createInitialState();

    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/*  Contexto y Provider                                                       */
/* -------------------------------------------------------------------------- */

const GameContext = createContext(null);

/**
 * @param {string} [teacherPin] Si se define, activar el Modo Docente pide ese PIN.
 */
export function GameProvider({ children, teacherPin = '' }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // El Modo Docente y las liberaciones son de sesión: no se guardan en disco.
  const [teacherMode, setTeacherModeState] = useState(false);
  const [releasedSlides, setReleasedSlides] = useState(() =>
    Object.fromEntries(TOPICS.map((t) => [t.id, 0]))
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Almacenamiento no disponible (modo privado, cuota): se ignora. */
    }
  }, [state]);

  /* ---- Puntaje, nivel y progreso ---------------------------------------- */

  const score = useMemo(
    () => Object.values(state.topicScores).reduce((sum, pts) => sum + pts, 0),
    [state.topicScores]
  );

  const levelInfo = useMemo(() => getLevelInfo(score), [score]);

  const completedCount = useMemo(
    () =>
      Object.values(state.progress).filter(
        (status) => status === TOPIC_STATUS.COMPLETED
      ).length,
    [state.progress]
  );

  const addPoints = useCallback(
    (topicId, points) => dispatch({ type: 'ADD_POINTS', topicId, points }),
    []
  );
  const completeTopic = useCallback(
    (topicId) => dispatch({ type: 'COMPLETE_TOPIC', topicId }),
    []
  );
  const resetTopic = useCallback(
    (topicId) => dispatch({ type: 'RESET_TOPIC', topicId }),
    []
  );
  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
    setReleasedSlides(Object.fromEntries(TOPICS.map((t) => [t.id, 0])));
  }, []);

  const getTopicStatus = useCallback(
    (topicId) => state.progress[topicId] ?? TOPIC_STATUS.PENDING,
    [state.progress]
  );
  const getTopicScore = useCallback(
    (topicId) => state.topicScores[topicId] ?? 0,
    [state.topicScores]
  );

  /* ---- Modo Docente ------------------------------------------------------ */

  /** Devuelve true si el cambio se aplicó (false si el PIN es incorrecto). */
  const setTeacherMode = useCallback(
    (enabled, pin = '') => {
      if (enabled && teacherPin && pin !== teacherPin) return false;
      setTeacherModeState(Boolean(enabled));
      return true;
    },
    [teacherPin]
  );

  /** Libera la siguiente diapositiva de un tema (índice base 0). */
  const releaseNext = useCallback((topicId) => {
    if (!TOPIC_BY_ID[topicId]) return;
    setReleasedSlides((prev) => ({
      ...prev,
      [topicId]: Math.min(RELEASE_ALL, prev[topicId] + 1),
    }));
  }, []);

  const releaseAll = useCallback((topicId) => {
    if (!TOPIC_BY_ID[topicId]) return;
    setReleasedSlides((prev) => ({ ...prev, [topicId]: RELEASE_ALL }));
  }, []);

  /**
   * ¿Puede el estudiante pasar de `currentIndex` a la siguiente diapositiva?
   * Sin Modo Docente el avance es libre.
   */
  const canAdvance = useCallback(
    (topicId, currentIndex) =>
      !teacherMode || currentIndex + 1 <= (releasedSlides[topicId] ?? 0),
    [teacherMode, releasedSlides]
  );

  /* ---- Valor del contexto ------------------------------------------------ */

  const value = useMemo(
    () => ({
      // datos
      topics: TOPICS,
      score,
      maxScore: MAX_SCORE,
      level: levelInfo.current,
      levelInfo,
      completedCount,
      topicScores: state.topicScores,
      progress: state.progress,
      // acciones de juego
      addPoints,
      completeTopic,
      resetTopic,
      resetGame,
      getTopicStatus,
      getTopicScore,
      // modo docente
      teacherMode,
      requiresTeacherPin: Boolean(teacherPin),
      setTeacherMode,
      releasedSlides,
      releaseNext,
      releaseAll,
      canAdvance,
    }),
    [
      score,
      levelInfo,
      completedCount,
      state.topicScores,
      state.progress,
      addPoints,
      completeTopic,
      resetTopic,
      resetGame,
      getTopicStatus,
      getTopicScore,
      teacherMode,
      teacherPin,
      setTeacherMode,
      releasedSlides,
      releaseNext,
      releaseAll,
      canAdvance,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame debe usarse dentro de <GameProvider>.');
  }
  return ctx;
}
