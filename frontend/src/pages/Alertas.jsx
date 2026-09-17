import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CardAlerta from "../components/CardAlerta";
import Topbar from "../components/Topbar";
import { listarAlertas, listarFrota } from "../services/api";
import "./Dashboard.css";

export default function Alertas() {
  const { maquinaId } = useParams();
  const [maquina, setMaquina] = useState(null);
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      const [frota, resposta] = await Promise.all([listarFrota(), listarAlertas()]);
      if (!ativo) return;
      const encontrada = frota.find((item) => item.id === Number(maquinaId));
      setMaquina(encontrada);
      const pneus = new Map((encontrada?.pneus ?? []).map((pneu) => [pneu.id, pneu]));
      setAlertas(resposta.data.filter((leitura) => pneus.has(leitura.pneu_id)).map((leitura) => ({ ...leitura, pneu: pneus.get(leitura.pneu_id) })));
    };
    carregar().catch(() => {});
    const intervalo = window.setInterval(() => carregar().catch(() => {}), 5000);
    return () => { ativo = false; window.clearInterval(intervalo); };
  }, [maquinaId]);

  if (!maquina) return <div className="pagina"><p className="estado-vazio">Carregando alertas...</p></div>;
  return <div className="pagina">
    <Topbar trator={maquina.nome} modelo={maquina.modelo} ultimaLeitura={maquina.ultimaLeitura ?? "sem leitura"} voltarPara="/frota" />
    <header className="pagina-header"><div><p className="pagina-kicker">Operacao em andamento</p><h1>Alertas da maquina</h1></div><div className="pagina-header__chip">{alertas.length} itens ativos</div></header>
    <section className="alertas-lista" aria-label="Lista de alertas da maquina selecionada">
      {alertas.length === 0 && <p className="estado-vazio">Nenhum alerta ativo nesta maquina.</p>}
      {alertas.map((alerta) => <CardAlerta key={alerta.id} nome={alerta.pneu.posicao} pressao={alerta.pressao} temperatura={alerta.temperatura} acaoRecomendada="Verifique a calibragem e confirme uma nova leitura." severidade="critico" />)}
    </section>
  </div>;
}
