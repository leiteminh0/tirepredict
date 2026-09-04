import "./StatCard.css";

export default function StatCard({ label, valor, cor }) {
  return (
    <div className="stat-card" style={{ "--cor-stat": cor || "var(--text)" }}>
      <span className="stat-label">{label}</span>
      <span className="stat-valor">{valor}</span>
    </div>
  );
}