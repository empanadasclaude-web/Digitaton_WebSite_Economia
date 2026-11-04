import { useEffect, useState, useMemo } from 'react';
import { TOPICS, TOPIC_STATUS, useGame } from '../context/GameContext.jsx';
import SimulationCase from '../components/SimulationCase.jsx';
import ResultSummary from '../components/ResultSummary.jsx';

const TOPIC_ID = 'market';
const topic = TOPICS.find((t) => t.id === TOPIC_ID);

/* -------------------------------------------------------------------------- */
/*  Datos del Tema                                                            */
/* -------------------------------------------------------------------------- */

function EquilibriumChart() {
  return (
    <svg
      viewBox="0 0 320 210"
      role="img"
      aria-label="Gráfico de oferta y demanda: la curva de demanda baja, la de oferta sube y se cruzan en el precio de equilibrio."
    >
      <path d="M40 16V176H296" fill="none" stroke="#0C0C0C" strokeWidth="1.5" />
      <path d="M52 34L284 158" fill="none" stroke="#0C0C0C" strokeWidth="3" />
      <path d="M52 158L284 34" fill="none" stroke="#A3A29C" strokeWidth="3" />
      <path d="M168 96V176M40 96H168" fill="none" stroke="#0C0C0C" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="168" cy="96" r="5" fill="#0C0C0C" />
      <text x="258" y="150" fontSize="12" fontWeight="600" fill="#0C0C0C" textAnchor="end">Demanda</text>
      <text x="258" y="44" fontSize="12" fontWeight="600" fill="#A3A29C" textAnchor="end">Oferta</text>
      <text x="176" y="88" fontSize="11" fill="#0C0C0C">Equilibrio</text>
      <text x="10" y="14" fontSize="11" fill="#0C0C0C">Precio</text>
      <text x="296" y="196" fontSize="11" fill="#0C0C0C" textAnchor="end">Cantidad</text>
    </svg>
  );
}

const SLIDES = [
  {
    id: 'que-es',
    kicker: 'Punto de partida',
    title: 'Qué es analizar el mercado',
    body: [
      'Antes de decidir cuánto producir, a qué precio vender o a qué clientes atender, Lácteos del Valle necesita saber quién compra, quién compite y qué tanto cambia la demanda cuando cambian las condiciones.',
      'El análisis de mercado reúne esas respuestas en cuatro preguntas: ¿cuánto se compra?, ¿a qué precio?, ¿quién más vende? y ¿a qué segmentos conviene llegar?',
    ],
    keyPoint: 'Analizar el mercado reduce la incertidumbre antes de decidir.',
  },
  {
    id: 'demanda-oferta',
    kicker: 'Fuerzas básicas',
    title: 'Demanda, oferta y precio de equilibrio',
    body: [
      'La demanda muestra cuánta leche quieren comprar los consumidores a cada precio: si el precio sube, se compra menos. La oferta muestra cuánta están dispuestos a vender los productores: si el precio sube, venden más.',
      'El precio de equilibrio es donde ambas coinciden. Se desplaza cuando cambia el ingreso de los hogares, el precio de los sustitutos, los gustos o el costo del litro de leche cruda.',
    ],
    keyPoint: 'Un cambio en el precio mueve la cantidad; un cambio en ingresos, gustos o sustitutos mueve toda la curva.',
    visual: <EquilibriumChart />,
  },
  {
    id: 'elasticidad',
    kicker: 'Sensibilidad al precio',
    title: 'Elasticidad: qué tanto reacciona la demanda',
    body: [
      'La elasticidad precio de la demanda mide cuánto cambia la cantidad comprada cuando cambia el precio: es la variación porcentual de la cantidad dividida entre la variación porcentual del precio.',
      'La leche entera es un producto básico: los hogares la siguen comprando aunque suba un poco, así que su demanda es poco elástica. El yogur griego es un gusto prescindible con muchos sustitutos, y su demanda es más elástica.',
    ],
    keyPoint: 'Si la demanda es elástica (|E| > 1), bajar el precio aumenta el ingreso total; si es inelástica (|E| < 1), subirlo lo aumenta.',
  },
];

const CASES = [
  {
    id: 'market-c1',
    title: 'Un competidor baja el precio',
    context: ['Una procesadora grande redujo 8 % el precio de la leche entera en los supermercados de Cali. Lácteos del Valle vende hoy 20.000 litros por semana y su mayor canal son las tiendas de barrio.'],
    data: [
      { label: 'Ventas semanales', value: '20.000 L' },
      { label: 'Participación en Cali', value: '22 %' },
      { label: 'Margen por litro', value: '$420' },
      { label: 'Rebaja del competidor', value: '8 %' },
    ],
    question: '¿Cómo respondes?',
    lesson: 'Antes de reaccionar al precio de un rival, mira qué tan sustituibles son tus productos y en qué canales compite de verdad.',
    options: [
      { id: 'a', label: 'Igualar la rebaja en todo el portafolio', points: 12, feedback: 'Igualar protege el volumen, pero regala margen en canales donde no estaba en riesgo.' },
      { id: 'b', label: 'Mantener el precio y reforzar frescura en tiendas de barrio', points: 34, feedback: 'Excelente. Tu producto se diferencia por frescura y tu canal principal no es el supermercado.' },
      { id: 'c', label: 'Subir 5 % para posicionarte como marca premium', points: 0, feedback: 'Subir el precio sin diferenciación clara empuja a los clientes hacia el sustituto.' },
    ],
  },
  {
    id: 'market-c2',
    title: 'Subir o bajar el precio del yogur griego',
    context: ['El yogur griego es de los productos con más margen, pero sus ventas se estancaron. La elasticidad precio es −1,8 (demanda elástica).'],
    data: [
      { label: 'Precio actual', value: '$6.500' },
      { label: 'Elasticidad estimada', value: '−1,8' },
    ],
    question: '¿Qué decides sobre el precio?',
    lesson: 'Cuando |E| > 1, bajar el precio aumenta el ingreso, siempre que el margen alcance.',
    options: [
      { id: 'a', label: 'Subir el precio 5 %', points: 0, feedback: 'Con elasticidad −1,8, subir 5 % reduce la cantidad cerca de 9 % y el ingreso cae.' },
      { id: 'b', label: 'Mantener el precio y esperar', points: 10, feedback: 'No pierdes, pero desaprovechas la oportunidad de una demanda elástica.' },
      { id: 'c', label: 'Bajar el precio 5 % y vigilar el margen', points: 33, feedback: 'Bien pensado. Bajar 5 % sube la cantidad un 9 %, aumentando el ingreso total.' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Estilos Scrollytelling & Widget                                           */
/* -------------------------------------------------------------------------- */
const CUSTOM_CSS = `
  .scrolly-container {
    display: flex;
    flex-direction: column;
    gap: 15vh;
    padding-bottom: 15vh;
  }
  .scrolly-slide {
    opacity: 0.1;
    transform: translateY(40px);
    transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1);
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .scrolly-slide.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
  
  /* Widget Flotante del Estado de la Empresa */
  .company-status-widget {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: var(--blanco);
    border: 2px solid var(--tinta);
    border-radius: 12px;
    padding: 1rem 1.5rem;
    box-shadow: 6px 6px 0px var(--tinta);
    z-index: 100;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .status-indicator {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--tinta);
  }
  .status-text {
    font-weight: 700;
    font-size: 1.1rem;
  }
  
  /* Colores de estado */
  .status--pesimo .status-indicator { background-color: #ff4d4d; }
  .status--bajo .status-indicator { background-color: #ffb84d; }
  .status--normal .status-indicator { background-color: #f2e144; }
  .status--alto .status-indicator { background-color: #4CAF50; }
  
  .company-image {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
    background: var(--gris-claro);
    display: grid;
    place-items: center;
    font-size: 2rem;
  }
`;

/* -------------------------------------------------------------------------- */
/*  Componente Principal                                                      */
/* -------------------------------------------------------------------------- */

export default function Topic1Market() {
  const { getTopicStatus } = useGame();
  
  const [decisions, setDecisions] = useState([]);
  const [visibleSlides, setVisibleSlides] = useState(new Set());
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  
  const isCompleted = getTopicStatus(TOPIC_ID) === TOPIC_STATUS.COMPLETED;
  const [showResults, setShowResults] = useState(isCompleted);

  // Intersection Observer para el Scrollytelling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSlides((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll('.scrolly-slide').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleContinueCase = (result) => {
    setDecisions((prev) => [...prev, result]);
    if (activeCaseIndex < CASES.length - 1) {
      setActiveCaseIndex((prev) => prev + 1);
    } else {
      setTimeout(() => setShowResults(true), 800); // Pequeña pausa antes de resultados
    }
  };

  const handleRetry = () => {
    setDecisions([]);
    setActiveCaseIndex(0);
    setShowResults(false);
    window.scrollTo(0, 0);
  };

  // Cálculo del estado de la empresa
  const currentScore = decisions.reduce((acc, curr) => acc + curr.points, 0);
  const maxPossibleScoreSoFar = decisions.reduce((acc, curr) => acc + curr.maxPoints, 0);
  
  const getCompanyHealth = () => {
    if (decisions.length === 0) return { status: 'normal', label: 'Estable', emoji: '🏭' };
    const ratio = currentScore / maxPossibleScoreSoFar;
    if (ratio < 0.3) return { status: 'pesimo', label: 'Crisis', emoji: '📉' };
    if (ratio < 0.6) return { status: 'bajo', label: 'En riesgo', emoji: '⚠️' };
    if (ratio < 0.9) return { status: 'normal', label: 'Estable', emoji: '📊' };
    return { status: 'alto', label: 'Excelente', emoji: '🚀' };
  };

  const health = getCompanyHealth();

  if (showResults) {
    return (
      <ResultSummary
        topicId={TOPIC_ID}
        decisions={decisions}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <>
      <style>{CUSTOM_CSS}</style>
      
      <header className="page-head page-head--compact">
        <p className="micro micro--num">(01)</p>
        <h1>{topic.title}</h1>
        <p className="prose">Haz scroll para descubrir la teoría y tomar las decisiones que marcarán el futuro de la empresa.</p>
      </header>

      {/* Flujo de Scrollytelling */}
      <div className="scrolly-container">
        
        {/* TEORÍA */}
        {SLIDES.map((slide, i) => (
          <article 
            id={`slide-${i}`} 
            key={slide.id} 
            className={`scrolly-slide theory__slide ${visibleSlides.has(`slide-${i}`) ? 'is-visible' : ''}`}
          >
            <div className="theory__side">
              <p className="micro">{slide.kicker}</p>
            </div>
            <div>
              <h2 className="theory__title">{slide.title}</h2>
              <div className="prose theory__body">
                {slide.body.map((p, idx) => <p key={idx}>{p}</p>)}
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
        ))}

        {/* SIMULACIÓN (Aparecen secuencialmente) */}
        {CASES.map((c, i) => (
          i <= activeCaseIndex && (
            <div 
              id={`case-${i}`} 
              key={c.id} 
              className={`scrolly-slide ${visibleSlides.has(`case-${i}`) ? 'is-visible' : ''}`}
            >
              <SimulationCase
                topicId={TOPIC_ID}
                caseData={c}
                caseNumber={i + 1}
                totalCases={CASES.length}
                continueLabel={i === CASES.length - 1 ? 'Ver resultados' : 'Siguiente decisión'}
                onContinue={handleContinueCase}
              />
            </div>
          )
        ))}
      </div>

      {/* Widget de Estado (Fijo en la pantalla) */}
      <div className={`company-status-widget status--${health.status}`}>
        <div className="company-image">{health.emoji}</div>
        <div>
          <p className="micro" style={{ margin: 0, opacity: 0.8 }}>Estado de Lácteos del Valle</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="status-indicator" />
            <span className="status-text">{health.label}</span>
          </div>
        </div>
      </div>
    </>
  );
}