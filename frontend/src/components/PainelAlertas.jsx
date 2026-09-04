import "./PainelAlertas.css";

const CORES = { ALTO: "var(--red)", MEDIO: "var(--amber)", BAIXO: "var(--green)" };

export default function PainelAlertas({ alertas, insightIA }) {
  const [critico, ...outros] = alertas;

  return (
    <div className="painel-alertas">
      <h3 className="alertas-titulo">Resumo de operação</h3>

      {critico && (
        <div className="alerta-critico" style={{ "--cor": CORES[critico.nivel] }}>
          <span className="alerta-critico-bolinha" aria-hidden="true" />
          <div className="alerta-critico-corpo">
            <span className="alerta-critico-texto">{critico.texto}</span>
            <span className="alerta-critico-tempo">{critico.tempo}</span>
          </div>
        </div>
      )}

      <div className="alertas-lista-compacta">
        {outros.map((a, i) => (
          <div className="alerta-item" key={i}>
            <span className="alerta-bolinha" style={{ background: CORES[a.nivel] }} aria-hidden="true" />
            <span className="alerta-texto">{a.texto}</span>
            <span className="alerta-tempo">{a.tempo}</span>
          </div>
        ))}
      </div>

      {insightIA && (
        <div className="insight-ia">
          <span className="insight-icone" aria-hidden="true">AI</span>
          <div className="insight-copy">
            <p className="insight-texto">{insightIA.texto}</p>
            <span className="insight-fonte">{insightIA.fonte}</span>
          </div>
        </div>
      )}
    </div>
  );
}