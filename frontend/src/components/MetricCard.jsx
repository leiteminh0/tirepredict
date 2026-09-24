import "./MetricCard.css";

/**
 * MetricCard — glass KPI widget
 *
 * Props:
 *   label    string  — displayed above the value
 *   value    string|number
 *   unit     string  — optional unit suffix (e.g. "PSI", "°C")
 *   variant  "default" | "success" | "warning" | "danger" | "info" | "accent"
 *   glass    1 | 2   — glass depth level (default 1)
 */
export default function MetricCard({ label, value, unit, variant = "default", glass = 1 }) {
  const val = value ?? "—";

  return (
    <div
      className={[
        "tp-metric-card",
        `tp-metric-card--${variant}`,
        `tp-metric-card--glass-${glass}`,
      ].join(" ")}
      role="figure"
      aria-label={`${label}: ${val}${unit ? " " + unit : ""}`}
    >
      <span className="tp-metric-card__label">{label}</span>
      <div className="tp-metric-card__value-row">
        <span className="tp-metric-card__value">{val}</span>
        {unit && <span className="tp-metric-card__unit">{unit}</span>}
      </div>
      <span className="tp-metric-card__bar" aria-hidden="true" />
    </div>
  );
}
