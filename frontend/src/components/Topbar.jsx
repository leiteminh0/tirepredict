import { Link } from "react-router-dom";
import "./Topbar.css";

/* Compact status dot */
function StatusDot({ online, label, animated = false }) {
  return (
    <span className={`tp-topbar__status-dot-wrap${online ? " online" : " offline"}`} aria-label={label}>
      <span className={`tp-topbar__dot${animated && online ? " animated" : ""}`} />
      <span className="tp-topbar__status-label">{label}</span>
    </span>
  );
}

export default function Topbar({
  trator,
  modelo,
  ultimaLeitura,
  conectado = false,
  voltarPara = "/frota",
}) {
  const hasMachineContext = Boolean(trator || modelo);

  return (
    <header className="tp-topbar" role="banner">
      {/* LEFT: brand + context breadcrumb */}
      <div className="tp-topbar__left">
        {hasMachineContext ? (
          <>
            <Link to={voltarPara} className="tp-topbar__back" aria-label="Voltar à frota">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Frota
            </Link>
            <span className="tp-topbar__sep" aria-hidden="true">/</span>
            <div className="tp-topbar__machine">
              <span className="tp-topbar__machine-name">{trator}</span>
              {modelo && <span className="tp-topbar__machine-model">{modelo}</span>}
            </div>
          </>
        ) : (
          <div className="tp-topbar__page-title">
            <span className="tp-topbar__page-kicker">Central de operações</span>
            <span className="tp-topbar__page-name">Frota</span>
          </div>
        )}
      </div>

      {/* RIGHT: system indicators */}
      <div className="tp-topbar__right">
        {hasMachineContext && ultimaLeitura && (
          <span className="tp-topbar__update">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6.5 3.5V6.5L8.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {ultimaLeitura}
          </span>
        )}

        <div className="tp-topbar__indicators">
          <StatusDot
            online={conectado}
            label={conectado ? "MQTT ao vivo" : "MQTT aguardando"}
            animated
          />
        </div>
      </div>
    </header>
  );
}
