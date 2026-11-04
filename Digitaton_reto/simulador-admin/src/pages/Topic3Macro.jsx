import { Link } from 'react-router-dom';

/* Marcador temporal: se reemplaza cuando armemos TheorySection, SimulationCase y ResultSummary. */
export default function Topic3Macro() {
  return (
    <section className="page-head">
      <p className="micro micro--num">(03)</p>
      <h1>Indicadores macroeconómicos</h1>
      <p className="prose">
        Aquí irán la teoría, la simulación y los resultados de este tema.
      </p>
      <p style={{ marginTop: '2rem' }}>
        <Link to="/" className="btn">
          Volver al inicio
        </Link>
      </p>
    </section>
  );
}
