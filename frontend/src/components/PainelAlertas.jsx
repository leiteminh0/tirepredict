import "./PainelAlertas.css";

const CORES = { ALTO: "var(--red)", MEDIO: "var(--amber)", BAIXO: "var(--green)" };

export default function PainelAlertas({ alertas }) {
  const [critico, ...outros] = alertas;
  return <div className="painel-alertas">
    <h3 className="alertas-titulo">Alertas recentes</h3>
    {!critico && <p className="estado-vazio">Nenhum alerta ativo nesta maquina.</p>}
    {critico && <div className="alerta-critico" style={{ "--cor": CORES[critico.nivel] }}><span className="alerta-critico-bolinha" /><div className="alerta-critico-corpo"><span className="alerta-critico-texto">{critico.texto}</span><span className="alerta-critico-tempo">{critico.tempo}</span></div></div>}
    <div className="alertas-lista-compacta">{outros.map((alerta, index) => <div className="alerta-item" key={`${alerta.texto}-${index}`}><span className="alerta-bolinha" style={{ background: CORES[alerta.nivel] }} /><span className="alerta-texto">{alerta.texto}</span><span className="alerta-tempo">{alerta.tempo}</span></div>)}</div>
  </div>;
}
