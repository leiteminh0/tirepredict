import RiskBadge from "./RiskBadge";
import "./PainelAlertas.css";

export default function PainelAlertas({ alertas }) {
  const [critico, ...outros] = alertas ?? [];

  return (
    <div className="tp-painel-alertas">
      <div className="tp-painel-alertas__header">
        <span className="tp-painel-alertas__kicker">Monitoramento</span>
        <h3 className="tp-painel-alertas__title">Alertas ativos</h3>
      </div>

      {!critico ? (
        <div className="tp-painel-alertas__empty">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
            <path d="M9 14l4 4 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Nenhum alerta ativo</span>
        </div>
      ) : (
        <>
          {/* Primary critical alert */}
          <div className={`tp-alert-primary tp-alert-primary--${critico.nivel?.toLowerCase()}`}>
            <div className="tp-alert-primary__dot" aria-hidden="true" />
            <div className="tp-alert-primary__body">
              <div className="tp-alert-primary__top">
                <span className="tp-alert-primary__text">{critico.texto}</span>
                <RiskBadge nivel={critico.nivel} />
              </div>
              <span className="tp-alert-primary__time">{critico.tempo}</span>
            </div>
          </div>

          {/* Secondary alerts */}
          {outros.length > 0 && (
            <div className="tp-alert-list">
              {outros.map((alerta, i) => (
                <div key={`${alerta.texto}-${i}`} className="tp-alert-item">
                  <span
                    className="tp-alert-item__dot"
                    style={{
                      background: alerta.nivel === "ALTO"
                        ? "var(--tp-danger)"
                        : alerta.nivel === "MEDIO"
                        ? "var(--tp-warning)"
                        : "var(--tp-success)"
                    }}
                    aria-hidden="true"
                  />
                  <span className="tp-alert-item__text">{alerta.texto}</span>
                  <span className="tp-alert-item__time">{alerta.tempo}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
