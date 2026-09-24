import RiskBadge from "./RiskBadge";
import "./CardAlerta.css";

const SEVERITY_MAP = {
  critico: { nivel: "ALTO", label: "Crítico", action: "Ação imediata" },
  medio:   { nivel: "MEDIO", label: "Médio",  action: "Monitorar" },
  informativo: { nivel: "BAIXO", label: "Informativo", action: "Observação" },
};

export default function CardAlerta({ nome, pressao, temperatura, acaoRecomendada, severidade = "critico" }) {
  const cfg = SEVERITY_MAP[severidade] ?? SEVERITY_MAP.critico;

  return (
    <article
      className={`tp-card-alerta tp-card-alerta--${severidade}`}
      aria-label={`Alerta ${cfg.label}: ${nome}`}
    >
      <div className="tp-card-alerta__left">
        <RiskBadge nivel={cfg.nivel} compact />
        <div className="tp-card-alerta__severity-bar" aria-hidden="true" />
      </div>

      <div className="tp-card-alerta__body">
        <div className="tp-card-alerta__header">
          <div>
            <span className="tp-card-alerta__kicker">Pneu monitorado</span>
            <h3 className="tp-card-alerta__name">{nome}</h3>
          </div>
          <div className="tp-card-alerta__badges">
            <RiskBadge nivel={cfg.nivel} />
            <span className="tp-card-alerta__action-label">{cfg.action}</span>
          </div>
        </div>

        <div className="tp-card-alerta__readings">
          <span className="tp-card-alerta__reading">
            <span className="tp-card-alerta__reading-value">{pressao}</span>
            <span className="tp-card-alerta__reading-unit">PSI</span>
          </span>
          <span className="tp-card-alerta__reading-sep" aria-hidden="true">·</span>
          <span className="tp-card-alerta__reading">
            <span className="tp-card-alerta__reading-value">{temperatura}</span>
            <span className="tp-card-alerta__reading-unit">°C</span>
          </span>
        </div>

        <p className="tp-card-alerta__recommendation">{acaoRecomendada}</p>
      </div>
    </article>
  );
}
