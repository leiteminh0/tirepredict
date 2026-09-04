import "./CardAlerta.css";

const MAPA_SEVERIDADE = {
  critico: {
    label: "Crítico",
    icone: "!",
    barra: "var(--red)",
    fundo: "var(--red-soft)",
    texto: "Ação imediata",
  },
  medio: {
    label: "Médio",
    icone: "~",
    barra: "var(--amber)",
    fundo: "var(--amber-soft)",
    texto: "Monitorar",
  },
  informativo: {
    label: "Informativo",
    icone: "i",
    barra: "var(--green)",
    fundo: "var(--green-soft)",
    texto: "Observação",
  },
};

export default function CardAlerta({ nome, pressao, temperatura, acaoRecomendada, severidade = "critico" }) {
  const cfg = MAPA_SEVERIDADE[severidade] || MAPA_SEVERIDADE.critico;

  return (
    <article className={`card-alerta card-alerta--${severidade}`}>
      <div className="card-alerta__indicador" style={{ background: cfg.fundo, color: cfg.barra }} aria-label={`${cfg.label} alerta`}>
        {cfg.icone}
      </div>

      <div className="card-alerta__conteudo">
        <div className="card-alerta__topo">
          <div>
            <p className="card-alerta__rotulo">Pneu monitorado</p>
            <h3>{nome}</h3>
          </div>
          <span className="card-alerta__badge" style={{ background: cfg.fundo, color: cfg.barra }}>
            {cfg.label}
          </span>
        </div>

        <div className="card-alerta__metrica">
          <span>{pressao} PSI</span>
          <span>{temperatura}°C</span>
          <span>{cfg.texto}</span>
        </div>

        <p className="card-alerta__acao">{acaoRecomendada}</p>
      </div>
    </article>
  );
}