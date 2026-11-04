import { Component, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { GameProvider } from './context/GameContext.jsx';
import Navbar from './components/Navbar.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Topic1Market = lazy(() => import('./pages/Topic1Market.jsx'));
const Topic2Pricing = lazy(() => import('./pages/Topic2Pricing.jsx'));
const Topic3Macro = lazy(() => import('./pages/Topic3Macro.jsx'));

/**
 * PIN opcional para activar el Modo Docente. Déjalo vacío para que el switch
 * funcione sin clave, o pon un valor (p. ej. '4821') para exigirla.
 */
const TEACHER_PIN = '';

/* -------------------------------------------------------------------------- */
/*  Estilos globales (tokens, layout, Navbar, Home y temas)                          */
/*  Viven aquí para no requerir archivos extra fuera del árbol acordado.      */
/* -------------------------------------------------------------------------- */

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&display=swap');

:root {
  --papel: #F8F7F2;
  --tinta: #0C0C0C;
  --gris: #A3A29C;
  --gris-claro: #E9E8E1;
  --blanco: #FFFFFF;
  --linea: rgba(12, 12, 12, 0.14);
  --font-ui: 'Inter Tight', 'Helvetica Neue', Arial, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  display: block;
  background: var(--papel);
  color: var(--tinta);
  font-family: var(--font-ui);
  font-size: 1rem;
  line-height: 1.5;
  letter-spacing: -0.01em;
}

#root { min-height: 100vh; max-width: none; margin: 0; padding: 0; text-align: left; }

h1, h2, h3 { margin: 0 0 0.5em; line-height: 1.02; letter-spacing: -0.04em; font-weight: 600; }
p { margin: 0; }
a { color: inherit; }

:focus-visible { outline: 3px solid var(--tinta); outline-offset: 3px; }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

.skip-link {
  position: absolute; left: 1rem; top: -4rem; z-index: 100;
  background: var(--tinta); color: var(--papel);
  padding: 0.5rem 0.9rem; font-weight: 600;
}
.skip-link:focus { top: 0.75rem; }

/* Texto diminuto, como los pies de la referencia */
.micro { font-size: 0.72rem; line-height: 1.35; max-width: 30ch; }
.micro.micro--num { font-size: 0.95rem; font-weight: 700; max-width: none; }

/* ---- Layout ---- */

.app-shell { min-height: 100vh; display: flex; flex-direction: column; }

.app-main {
  flex: 1; width: 100%;
  max-width: 1200px; margin: 0 auto;
  padding: 0 1.5rem 5rem;
}
.app-main:focus { outline: none; }

.app-footer {
  border-top: 1px solid var(--linea);
  padding: 1rem 1.5rem;
  font-size: 0.72rem;
}

.state-message { padding: 5rem 0; }
.state-message h1 { font-size: clamp(2.2rem, 7vw, 4.5rem); margin-bottom: 0.4em; }
.state-message p { margin-bottom: 1.5rem; max-width: 46ch; }

/* ---- Botones y superficies ---- */

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  font: inherit; font-weight: 600;
  padding: 0.7rem 1.3rem;
  border-radius: 999px;
  border: 2px solid var(--tinta);
  background: transparent; color: var(--tinta);
  cursor: pointer; text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}
.btn:hover:not(:disabled) { background: var(--tinta); color: var(--papel); }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn.btn--primary { background: var(--tinta); color: var(--papel); }
.btn.btn--primary:hover:not(:disabled) { background: transparent; color: var(--tinta); }

.surface { background: var(--blanco); border: 1px solid var(--linea); padding: 1.5rem; }

.prose { font-size: 1.15rem; line-height: 1.6; max-width: 62ch; letter-spacing: -0.015em; }

/* ---- Navbar ---- */

.nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(248, 247, 242, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--linea);
}

.nav__inner {
  max-width: 1200px; margin: 0 auto;
  padding: 0.7rem 1.5rem;
  display: flex; align-items: center; gap: 1.5rem;
}

.brand {
  display: flex; align-items: center; gap: 0.5rem;
  margin-right: auto;
  text-decoration: none;
  font-weight: 700; font-size: 1.05rem; letter-spacing: -0.04em;
}
.brand svg { width: 22px; height: 22px; flex: none; }

.stats { display: flex; align-items: center; gap: 1.75rem; }

.stat { display: flex; flex-direction: column; line-height: 1.15; }
.stat__label { font-size: 0.68rem; opacity: 0.65; }
.stat__value { font-weight: 700; font-size: 1.05rem; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.stat__value--score { display: inline-block; transform-origin: left center; }
.stat__value--score.is-bump { animation: score-bump 0.5s ease; }
.stat--level { min-width: 120px; }

.meter { height: 3px; margin-top: 0.3rem; background: var(--gris-claro); overflow: hidden; }
.meter__fill { height: 100%; background: var(--tinta); transition: width 0.5s ease; }

@keyframes score-bump { 40% { transform: scale(1.25); } }

.teacher-toggle {
  flex: none; width: 26px; height: 26px; padding: 0;
  display: grid; place-items: center;
  border-radius: 50%; border: 1px solid transparent;
  background: transparent; color: var(--tinta);
  opacity: 0.18; cursor: pointer;
  transition: opacity 0.2s ease, background-color 0.2s ease;
}
.teacher-toggle:hover, .teacher-toggle:focus-visible { opacity: 0.8; }
.teacher-toggle.is-on { opacity: 1; background: var(--tinta); color: var(--papel); }

.teacher-bar { background: var(--tinta); color: var(--papel); }
.teacher-bar__inner {
  max-width: 1200px; margin: 0 auto;
  padding: 0.55rem 1.5rem;
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem;
  font-size: 0.82rem;
}
.teacher-bar__status { margin-right: auto; opacity: 0.85; }
.teacher-bar__btn {
  font: inherit; font-weight: 600; font-size: 0.78rem;
  padding: 0.3rem 0.85rem; border-radius: 999px;
  border: 1.5px solid var(--papel);
  background: var(--papel); color: var(--tinta);
  cursor: pointer;
}
.teacher-bar__btn:disabled { opacity: 0.35; cursor: not-allowed; }
.teacher-bar__btn.teacher-bar__btn--quiet { background: transparent; color: var(--papel); }
.teacher-bar :focus-visible { outline-color: var(--papel); }

/* ---- Home: hero ---- */

.hero { position: relative; padding-top: 2.5rem; }

.hero__word {
  margin: 0;
  font-size: min(22vw, 16.5rem);
  font-weight: 800;
  line-height: 0.8;
  letter-spacing: -0.065em;
  white-space: nowrap;
  overflow: hidden;
  padding-bottom: 0.12em;
}

.hero__stack {
  position: absolute; z-index: 2;
  top: 0.5rem; left: 50%;
  width: clamp(150px, 17vw, 205px);
  transform: translateX(-50%);
}

.polaroid {
  position: absolute; top: 0; left: 0; width: 100%;
  display: block;
  background: var(--blanco); color: var(--tinta);
  padding: 0.4rem 0.4rem 0.3rem;
  text-decoration: none;
  box-shadow: 0 6px 22px rgba(12, 12, 12, 0.18);
  transition: transform 0.35s ease;
}
.polaroid:first-child { position: relative; }
.polaroid__img {
  aspect-ratio: 1 / 1.05;
  background: var(--gris-claro);
  display: grid; place-items: center;
}
.polaroid__img svg { width: 42%; }
.polaroid__foot {
  display: flex; justify-content: space-between; gap: 0.5rem;
  padding-top: 0.35rem;
  font-size: 0.6rem; font-weight: 500; line-height: 1.25;
}
.polaroid--1 { z-index: 3; transform: rotate(-1deg); }
.polaroid--2 { z-index: 2; transform: rotate(5deg) translate(10%, 2%); }
.polaroid--3 { z-index: 1; transform: rotate(-6deg) translate(-10%, 1%); }
.hero__stack:hover .polaroid--2 { transform: rotate(9deg) translate(28%, 2%); }
.hero__stack:hover .polaroid--3 { transform: rotate(-10deg) translate(-28%, 1%); }

.hero__captions {
  display: grid; grid-template-columns: 1fr 1fr auto;
  gap: 1.5rem; align-items: start;
  padding: 2.5rem 0 1rem;
}

/* ---- Home: lista de temas ---- */

.topic-list { margin: 1rem 0 0; padding: 0; list-style: none; }

.topic-row {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 1rem;
  padding: 0.45rem 1rem;
  text-decoration: none;
  color: var(--tinta);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.topic-row__title {
  font-size: clamp(1.9rem, 5.8vw, 4.1rem);
  font-weight: 600; letter-spacing: -0.045em; line-height: 1.12;
  text-align: center;
}
.topic-row__side { font-size: 0.72rem; }
.topic-row__side--end { text-align: right; }
.topic-row.is-active { background: var(--tinta); color: var(--papel); }
.topic-row:focus-visible { outline-offset: -3px; }
.topic-row.is-active:focus-visible { outline-color: var(--papel); }

/* ---- Home: niveles ---- */

.levels {
  display: grid; grid-template-columns: 1fr 1.7fr;
  gap: 1.5rem 2rem;
  padding: 6rem 0 1rem;
  align-items: start;
}
.levels__head { display: flex; flex-direction: column; gap: 0.9rem; }
.levels__list {
  margin: 0;
  font-size: clamp(2.2rem, 5vw, 3.8rem);
  font-weight: 600; letter-spacing: -0.045em; line-height: 1.05;
  color: var(--gris);
}
.levels__item.is-current { color: var(--tinta); }

/* ---- Páginas de tema ---- */

.page-head { padding: 3rem 0 1rem; }
.page-head h1 { font-size: clamp(2.4rem, 8vw, 6rem); letter-spacing: -0.055em; font-weight: 700; margin: 0.4rem 0 1rem; }

@media (max-width: 720px) {
  .nav__inner { gap: 0.9rem; padding: 0.55rem 1rem; }
  .brand { font-size: 0.95rem; }
  .stats { gap: 1rem; }
  .stat--level { min-width: 88px; }
  .app-main { padding: 0 1rem 3.5rem; }
  .hero__captions { grid-template-columns: 1fr auto; }
  .hero__captions .micro:nth-child(2) { grid-column: 1 / -1; grid-row: 2; }
  .topic-row { grid-template-columns: 1fr; text-align: center; padding: 0.7rem 0.5rem; gap: 0.2rem; }
  .topic-row__side, .topic-row__side--end { text-align: center; }
  .levels { grid-template-columns: 1fr; padding-top: 4rem; }
}

@media (max-width: 420px) {
  .brand__text { display: none; }
}

/* ---- Fases del tema ---- */

.page-head.page-head--compact { padding: 2rem 0 0.5rem; }
.page-head.page-head--compact h1 { font-size: clamp(1.5rem, 3.4vw, 2.3rem); letter-spacing: -0.045em; margin: 0.3rem 0 1rem; }

.phases {
  display: flex; flex-wrap: wrap; gap: 0.35rem;
  margin: 0 0 2.5rem; padding: 0; list-style: none;
  font-size: clamp(1.1rem, 2.4vw, 1.5rem);
  font-weight: 600; letter-spacing: -0.035em;
  color: var(--gris);
}
.phases__item.is-current { color: var(--tinta); }
.phases__item + .phases__item::before { content: '/'; margin-right: 0.35rem; color: var(--gris); }

@keyframes slide-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

/* ---- Teoría ---- */

.theory { display: grid; gap: 2rem; }

.theory__meta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.theory__bar { display: flex; gap: 4px; flex: 1; max-width: 280px; }
.theory__seg { flex: 1; height: 3px; background: var(--gris-claro); }
.theory__seg.is-done { background: var(--tinta); }
.theory__seg.is-locked { background: repeating-linear-gradient(90deg, var(--gris) 0 3px, transparent 3px 6px); }

.theory__slide {
  display: grid; grid-template-columns: 1fr 2.4fr; gap: 1.5rem 2.5rem;
  min-height: 22rem;
  animation: slide-in 0.35s ease;
}
.theory__side { display: flex; flex-direction: column; gap: 0.6rem; }

.theory__title {
  margin: 0 0 1.5rem;
  font-size: clamp(2.2rem, 5.6vw, 4.4rem);
  font-weight: 700; letter-spacing: -0.055em; line-height: 1;
}
.theory__title:focus { outline: none; }
.theory__body p + p { margin-top: 1rem; }

.theory__key {
  display: grid; gap: 0.3rem;
  margin-top: 1.75rem; padding: 1.1rem 1.25rem;
  background: var(--tinta); color: var(--papel);
  max-width: 62ch;
}
.theory__key strong { font-size: 1.3rem; font-weight: 600; letter-spacing: -0.03em; line-height: 1.2; }
.theory__visual { margin-top: 1.75rem; max-width: 420px; }
.theory__visual svg { width: 100%; height: auto; display: block; }

.theory__nav { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
.theory__lock { max-width: 36ch; }

/* ---- Simulación ---- */

.sim { display: grid; gap: 2rem; }
.sim__head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }

.sim__title {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.6rem);
  font-weight: 700; letter-spacing: -0.055em; line-height: 1.02;
}

.sim__context { display: grid; grid-template-columns: 1.6fr 1fr; gap: 2rem; align-items: start; }
.sim__context .prose p + p { margin-top: 1rem; }

.sim__facts { margin: 0; border-top: 1px solid var(--linea); }
.sim__fact {
  display: flex; align-items: baseline; justify-content: space-between; gap: 1rem;
  padding: 0.6rem 0; border-bottom: 1px solid var(--linea);
}
.sim__fact dt { font-size: 0.78rem; }
.sim__fact dd { margin: 0; font-size: 1.15rem; font-weight: 700; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; text-align: right; }

.sim__options { display: grid; gap: 0.6rem; min-width: 0; margin: 0; padding: 0; border: 0; }
.sim__question {
  padding: 0; margin-bottom: 1rem;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 600; letter-spacing: -0.04em; line-height: 1.15;
}

.option__card {
  display: grid; grid-template-columns: auto 1fr auto; gap: 0.25rem 1rem; align-items: baseline;
  padding: 1rem 1.1rem;
  border: 1.5px solid var(--linea); background: var(--blanco);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.option__card:hover { border-color: var(--tinta); }
.option__letter { font-size: 0.95rem; font-weight: 700; }
.option__label { font-size: 1.2rem; font-weight: 600; letter-spacing: -0.03em; line-height: 1.25; }
.option__tag { font-size: 0.7rem; font-weight: 600; text-align: right; }
.option__detail { grid-column: 2; font-size: 0.8rem; opacity: 0.75; }

.option input:checked + .option__card { border-color: var(--tinta); box-shadow: inset 0 0 0 1.5px var(--tinta); }
.option input:focus-visible + .option__card { outline: 3px solid var(--tinta); outline-offset: 3px; }
.option.is-locked .option__card { cursor: default; }
.option.is-locked .option__card:hover { border-color: var(--linea); }
.option.is-chosen .option__card { background: var(--tinta); color: var(--papel); border-color: var(--tinta); }
.option.is-best:not(.is-chosen) .option__card { border: 1.5px dashed var(--tinta); }
.option.is-dim .option__card { opacity: 0.5; }

.sim__feedback {
  display: grid; grid-template-columns: auto 1fr; gap: 1rem 2.5rem; align-items: start;
  padding: 1.75rem;
  background: var(--tinta); color: var(--papel);
  animation: slide-in 0.35s ease;
}
.sim__feedback :focus-visible { outline-color: var(--papel); }
.sim__points { margin: 0; font-size: clamp(3rem, 9vw, 6rem); font-weight: 800; letter-spacing: -0.06em; line-height: 0.85; }
.sim__feedback h3 { margin: 0 0 0.5rem; font-size: 1.5rem; }
.sim__feedback h3:focus { outline: none; }
.sim__lesson { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(248, 247, 242, 0.25); font-size: 0.92rem; }

.sim__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; }

/* ---- Resultados ---- */

.result { display: grid; gap: 2.5rem; }

.result__hero { display: grid; grid-template-columns: auto 1fr; gap: 1.5rem 3rem; align-items: end; }
.result__score { margin: 0; font-size: min(22vw, 12rem); font-weight: 800; letter-spacing: -0.07em; line-height: 0.8; }
.result__score small { margin-left: 0.1em; font-size: 0.28em; font-weight: 600; letter-spacing: -0.03em; color: var(--gris); }
.result__verdict { margin: 0.4rem 0 0.8rem; font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 700; letter-spacing: -0.05em; }

.result__levelup { margin: 0; padding: 0.9rem 1.1rem; background: var(--tinta); color: var(--papel); font-weight: 600; }

.result__stats { display: flex; flex-wrap: wrap; gap: 1rem 3rem; }
.result__stat { display: grid; gap: 0.15rem; }
.result__stat strong { font-size: 1.6rem; font-weight: 700; letter-spacing: -0.04em; line-height: 1.1; }

.result__levels { display: grid; gap: 0.75rem; max-width: 640px; }
.result__levels .levels__list { font-size: clamp(1.8rem, 4vw, 3rem); }

.result__recap { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--linea); }
.result__row {
  display: grid; grid-template-columns: 3.5rem 1fr auto; gap: 1rem; align-items: baseline;
  padding: 0.85rem 0; border-bottom: 1px solid var(--linea);
}
.result__choice { display: block; max-width: 60ch; margin-top: 0.2rem; }
.result__pts { font-weight: 700; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }

.result__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }

@media (max-width: 720px) {
  .phases { margin-bottom: 1.75rem; }
  .theory__slide { grid-template-columns: 1fr; min-height: 0; }
  .sim__context { grid-template-columns: 1fr; }
  .sim__feedback { grid-template-columns: 1fr; padding: 1.25rem; }
  .option__card { grid-template-columns: auto 1fr; }
  .option__tag { grid-column: 2; text-align: left; }
  .result__hero { grid-template-columns: 1fr; }
  .result__row { grid-template-columns: 2.5rem 1fr; }
  .result__pts { grid-column: 2; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

/* -------------------------------------------------------------------------- */
/*  Utilidades de layout                                                      */
/* -------------------------------------------------------------------------- */

/** Al cambiar de ruta: sube al inicio y mueve el foco al contenido principal. */
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('contenido')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="state-message">
      <h1>No encontramos esta página</h1>
      <p>La dirección no existe o cambió de lugar.</p>
      <Link to="/" className="btn btn--primary">
        Volver al inicio
      </Link>
    </div>
  );
}

function Loading() {
  return (
    <div className="state-message" role="status">
      Cargando…
    </div>
  );
}

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Punto de enganche para un servicio de monitoreo (Sentry, etc.).
    console.error('Error en la interfaz:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="state-message" role="alert">
        <h1>Algo salió mal</h1>
        <p>Tu puntaje y progreso están guardados. Recarga la página para continuar.</p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => window.location.reload()}
        >
          Recargar
        </button>
      </div>
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  App                                                                       */
/* -------------------------------------------------------------------------- */

export default function App() {
  return (
    <GameProvider teacherPin={TEACHER_PIN}>
      <BrowserRouter>
        <style>{GLOBAL_CSS}</style>
        <RouteEffects />

        <div className="app-shell">
          <a href="#contenido" className="skip-link">
            Saltar al contenido
          </a>

          <Navbar />

          <main id="contenido" className="app-main" tabIndex={-1}>
            <ErrorBoundary>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/tema-1" element={<Topic1Market />} />
                  <Route path="/tema-2" element={<Topic2Pricing />} />
                  <Route path="/tema-3" element={<Topic3Macro />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>

          <footer className="app-footer">
            Lácteos del Valle es una empresa ficticia creada con fines educativos.
          </footer>
        </div>
      </BrowserRouter>
    </GameProvider>
  );
}