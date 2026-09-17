import "./CardPneu.css";

const CONFIG_RISCO = {
  ALTO: { cor: "var(--red)", texto: "Alto", icone: "!" },
  MEDIO: { cor: "var(--amber)", texto: "Medio", icone: "~" },
  BAIXO: { cor: "var(--green)", texto: "Normal", icone: "OK" },
};

export default function CardPneu({ posicao, pressao, temperatura, nivel, selecionado, onClick }) {
  const cfg = CONFIG_RISCO[nivel] || CONFIG_RISCO.BAIXO;
  return <button type="button" className={`card-pneu ${selecionado ? "selecionado" : ""}`} style={{ "--cor-risco": cfg.cor }} onClick={onClick}>
    <span className="card-pneu-posicao">{posicao}</span>
    <span className="card-pneu-pressao">{pressao ?? "--"} <small>PSI</small></span>
    <span className="card-pneu-temp">{temperatura ?? "--"} C</span>
    <span className="card-pneu-badge" style={{ background: cfg.cor, color: "var(--badge-text)" }}>{cfg.icone} {cfg.texto}</span>
  </button>;
}
