import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';

const pad = (n) => String(n).padStart(2, '0');
const toParagraphs = (body) => (Array.isArray(body) ? body : body ? [body] : []);

/**
 * Mini diapositivas de teoría.
 *
 * @param {string}   topicId     Id del tema (ver TOPICS en GameContext).
 * @param {Array}    slides      [{ id?, kicker?, title, body, keyPoint?, visual? }]
 *                               body: string | string[]; visual: cualquier nodo React.
 * @param {Function} onFinish    Se llama al terminar la última diapositiva.
 * @param {string}   finishLabel Texto del botón de la última diapositiva.
 *
 * Con teacherMode activo, avanzar a la diapositiva i exige que el docente haya
 * liberado al menos i pasos, y terminar exige liberar tantos pasos como
 * diapositivas haya (ver canAdvance en GameContext).
 */
export default function TheorySection({
  topicId,
  slides = [],
  onFinish,
  finishLabel = 'Ir a la simulación',
}) {
  const { canAdvance, teacherMode } = useGame();
  const [index, setIndex] = useState(0);
  const headingRef = useRef(null);
  const previousIndex = useRef(0);

  const total = slides.length;
  const isLast = index === total - 1;
  const unlocked = canAdvance(topicId, index);

  const goNext = useCallback(() => {
    if (!canAdvance(topicId, index)) return;
    if (index < total - 1) setIndex(index + 1);
    else onFinish?.();
  }, [canAdvance, topicId, index, total, onFinish]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Al cambiar de diapositiva, el foco va al título (lectores de pantalla y teclado).
  useEffect(() => {
    if (previousIndex.current !== index) {
      previousIndex.current = index;
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [index]);

  // Flechas del teclado. La última diapositiva se cierra solo con el botón.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (event.key === 'ArrowRight' && index < total - 1) goNext();
      if (event.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, index, total]);

  if (total === 0) return null;

  const slide = slides[index];
  const isReachable = (i) => i === 0 || canAdvance(topicId, i - 1);

  return (
    <section className="theory" aria-label="Teoría">
      <div className="theory__meta">
        <p className="micro micro--num">
          ({pad(index + 1)}/{pad(total)})
        </p>
        <div className="theory__bar" aria-hidden="true">
          {slides.map((s, i) => (
            <span
              key={s.id ?? i}
              className={`theory__seg${i <= index ? ' is-done' : ''}${
                teacherMode && !isReachable(i) ? ' is-locked' : ''
              }`}
            />
          ))}
        </div>
      </div>

      <article className="theory__slide" key={slide.id ?? index}>
        <div className="theory__side">
          {slide.kicker && <p className="micro">{slide.kicker}</p>}
        </div>

        <div>
          <h2 className="theory__title" ref={headingRef} tabIndex={-1}>
            {slide.title}
          </h2>

          <div className="prose theory__body">
            {toParagraphs(slide.body).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          {slide.keyPoint && (
            <div className="theory__key">
              <span className="micro">Idea clave</span>
              <strong>{slide.keyPoint}</strong>
            </div>
          )}

          {slide.visual && <div className="theory__visual">{slide.visual}</div>}
        </div>
      </article>

      <div className="theory__nav">
        <button type="button" className="btn" onClick={goPrev} disabled={index === 0}>
          Anterior
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={goNext}
          disabled={!unlocked}
        >
          {isLast ? finishLabel : 'Siguiente'}
        </button>
        {!unlocked && (
          <p className="micro theory__lock" role="status">
            Esperando a que el docente libere{' '}
            {isLast ? 'la simulación' : 'la siguiente diapositiva'}.
          </p>
        )}
      </div>
    </section>
  );
}
