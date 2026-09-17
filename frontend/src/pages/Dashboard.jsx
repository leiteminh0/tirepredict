import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import CardPneu from "../components/CardPneu";
import GraficoPressao from "../components/GraficoPressao";
import PainelAlertas from "../components/PainelAlertas";
import { formatarTempoRelativo, listarAlertas, listarFrota, verificarSaude } from "../services/api";
import "./Dashboard.css";

export default function Dashboard() {
  const { maquinaId } = useParams();
  const [maquinas, setMaquinas] = useState([]);
  const [alertasApi, setAlertasApi] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [erro, setErro] = useState(null);
  const [mqttConectado, setMqttConectado] = useState(false);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const [frota, respostaAlertas, respostaSaude] = await Promise.all([listarFrota(), listarAlertas(), verificarSaude()]);
        if (!ativo) return;
        setMaquinas(frota);
        setAlertasApi(respostaAlertas.data);
        setMqttConectado(respostaSaude.data.mqtt?.connected === true);
        setErro(null);
      } catch {
        if (ativo) setErro("Nao foi possivel atualizar os dados da maquina.");
      }
    };
    carregar();
    const intervalo = window.setInterval(carregar, 5000);
    return () => { ativo = false; window.clearInterval(intervalo); };
  }, []);

  const maquina = maquinas.find((item) => item.id === Number(maquinaId));
  const pneus = maquina?.pneus ?? [];
  const pneuSelecionado = pneus.find((pneu) => pneu.id === selecionadoId) ?? pneus[0];
  const pneusPorId = new Map(pneus.map((pneu) => [pneu.id, pneu]));
  const alertas = alertasApi.filter((leitura) => pneusPorId.has(leitura.pneu_id)).slice(0, 4).map((leitura) => {
    const pneu = pneusPorId.get(leitura.pneu_id);
    return { nivel: "ALTO", texto: `${pneu.posicao}: ${leitura.pressao} PSI e ${leitura.temperatura} C`, tempo: formatarTempoRelativo(leitura.timestamp) };
  });
  const emAlto = pneus.filter((pneu) => pneu.nivel === "ALTO").length;
  const emMedio = pneus.filter((pneu) => pneu.nivel === "MEDIO").length;
  const normais = pneus.filter((pneu) => pneu.nivel === "BAIXO").length;

  if (erro) return <div className="pagina"><p className="estado-vazio">{erro}</p></div>;
  if (!maquina) return <div className="pagina"><p className="estado-vazio">Carregando maquina monitorada...</p></div>;

  return <div className="pagina">
    <Topbar trator={maquina.nome} modelo={maquina.modelo} ultimaLeitura={maquina.ultimaLeitura ?? "sem leitura"} conectado={mqttConectado} voltarPara="/frota" />
    <section className="stats-row"><StatCard label="Pneus monitorados" valor={pneus.length} cor="var(--text)" /><StatCard label="Em risco alto" valor={emAlto} cor="var(--red)" /><StatCard label="Em risco medio" valor={emMedio} cor="var(--amber)" /><StatCard label="Normais" valor={normais} cor="var(--green)" /></section>
    <h2 className="dashboard-subtitulo">Status dos pneus</h2>
    <section className="pneus-grid">{pneus.map((pneu) => <CardPneu key={pneu.id} {...pneu} selecionado={pneu.id === pneuSelecionado?.id} onClick={() => setSelecionadoId(pneu.id)} />)}</section>
    <section className="painel-inferior"><div className="painel">{pneuSelecionado ? <GraficoPressao posicao={pneuSelecionado.posicao} dados={pneuSelecionado.historico} /> : <p className="estado-vazio">Nenhum pneu disponivel para esta maquina.</p>}</div><div className="painel"><PainelAlertas alertas={alertas} /></div></section>
  </div>;
}
