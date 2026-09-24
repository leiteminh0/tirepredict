import "./RiskBadge.css";

const RISK_CONFIG = {
  ALTO: {
    label: "Alto",
    ariaLabel: "Risco alto",
    variant: "danger",
    icon: (
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
        <path d="M5.5 1.5L9.5 8.5H1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <line x1="5.5" y1="4.5" x2="5.5" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="5.5" cy="7.5" r="0.5" fill="currentColor"/>
      </svg>
    ),
  },
  MEDIO: {
    label: "Médio",
    ariaLabel: "Risco médio",
    variant: "warning",
    icon: (
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
        <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="5.5" y1="3" x2="5.5" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="5.5" cy="7.5" r="0.5" fill="currentColor"/>
      </svg>
    ),
  },
  BAIXO: {
    label: "Normal",
    ariaLabel: "Risco baixo",
    variant: "success",
    icon: (
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
        <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M3.5 5.5L5 7L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  INDISPONIVEL: {
    label: "Sem dados",
    ariaLabel: "Dados indisponíveis",
    variant: "muted",
    icon: (
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
        <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="5.5" y1="3.5" x2="5.5" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="5.5" cy="7.5" r="0.5" fill="currentColor"/>
      </svg>
    ),
  },
};

/**
 * RiskBadge — accessible risk indicator using color + icon + label
 *
 * Never relies on color alone for risk communication (WCAG 1.4.1).
 *
 * Props:
 *   nivel   "ALTO" | "MEDIO" | "BAIXO" | "INDISPONIVEL"
 *   compact boolean — icon-only (still includes aria-label)
 */
export default function RiskBadge({ nivel = "INDISPONIVEL", compact = false }) {
  const cfg = RISK_CONFIG[nivel] ?? RISK_CONFIG.INDISPONIVEL;

  return (
    <span
      className={`tp-risk-badge tp-risk-badge--${cfg.variant}${compact ? " tp-risk-badge--compact" : ""}`}
      role="img"
      aria-label={cfg.ariaLabel}
    >
      {cfg.icon}
      {!compact && <span className="tp-risk-badge__label">{cfg.label}</span>}
    </span>
  );
}
