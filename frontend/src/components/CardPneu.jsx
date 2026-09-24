import RiskBadge from "./RiskBadge";
import "./CardPneu.css";

/* Minimal tire SVG silhouette */
function TireIcon({ nivel }) {
  const ringColor = nivel === "ALTO"
    ? "var(--tp-danger)"
    : nivel === "MEDIO"
    ? "var(--tp-warning)"
    : "var(--tp-green-muted)";

  return (
    <svg className="tp-tire-icon" width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      {/* Outer ring */}
      <circle cx="22" cy="22" r="19" stroke={ringColor} strokeWidth="1.5" opacity="0.35"/>
      {/* Tread segments */}
      <circle cx="22" cy="22" r="14" stroke={ringColor} strokeWidth="1.5"/>
      {/* Hub */}
      <circle cx="22" cy="22" r="6" fill="none" stroke={ringColor} strokeWidth="1.5"/>
      <circle cx="22" cy="22" r="2.5" fill={ringColor} opacity="0.7"/>
      {/* Spoke marks */}
      <line x1="22" y1="4" x2="22" y2="10" stroke={ringColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="22" y1="34" x2="22" y2="40" stroke={ringColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="4" y1="22" x2="10" y2="22" stroke={ringColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="34" y1="22" x2="40" y2="22" stroke={ringColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

export default function CardPneu({ posicao, pressao, temperatura, nivel = "INDISPONIVEL", selecionado, onClick }) {
  return (
    <button
      type="button"
      className={[
        "tp-card-pneu",
        `tp-card-pneu--${(nivel || "INDISPONIVEL").toLowerCase()}`,
        selecionado ? "tp-card-pneu--selected" : "",
      ].join(" ").trim()}
      onClick={onClick}
      aria-pressed={selecionado}
      aria-label={`Pneu ${posicao} — ${pressao ?? "sem leitura"} PSI — Risco ${nivel}`}
    >
      {/* Top: position + tire icon */}
      <div className="tp-card-pneu__top">
        <span className="tp-card-pneu__position">{posicao}</span>
        <TireIcon nivel={nivel} />
      </div>

      {/* Main pressure reading */}
      <div className="tp-card-pneu__pressure-row">
        <span className="tp-card-pneu__pressure">{pressao ?? "—"}</span>
        <span className="tp-card-pneu__pressure-unit">PSI</span>
      </div>

      {/* Temperature */}
      <span className="tp-card-pneu__temp">
        {temperatura != null ? `${temperatura} °C` : "—"}
      </span>

      {/* Risk badge */}
      <div className="tp-card-pneu__footer">
        <RiskBadge nivel={nivel} />
      </div>
    </button>
  );
}
