/**
 * StatCard — legacy alias for MetricCard.
 * Kept for backward compatibility; prefer MetricCard in new code.
 */
import MetricCard from "./MetricCard";

const VARIANT_MAP = {
  "var(--text)":    "default",
  "var(--red)":     "danger",
  "var(--amber)":   "warning",
  "var(--green)":   "success",
  "var(--tp-danger)":  "danger",
  "var(--tp-warning)": "warning",
  "var(--tp-success)": "success",
};

export default function StatCard({ label, valor, cor }) {
  const variant = VARIANT_MAP[cor] ?? "default";
  return <MetricCard label={label} value={valor} variant={variant} glass={1} />;
}
