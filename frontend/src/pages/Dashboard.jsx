import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import CardPneu from "../components/CardPneu";
import GraficoPressao from "../components/GraficoPressao";
import PainelAlertas from "../components/PainelAlertas";
import { getMaquinaById } from "../services/mockData";
import "./Dashboard.css";

export default function Dashboard() {
  const { maquinaId } = useParams();
  const maquina = getMaquinaById(maquinaId);
  const pneus = maquina.pneus;

  const [selecionadoId, setSelecionadoId] = useState(pneus[0]?.id ?? null);
  const pneuSelecionado = useMemo(
    () => pneus.find((p) => p.id === selecionadoId) ?? pneus[0],
    [pneus, selecionadoId]
  );

  const alertas = [
    { nivel: "ALTO", texto: `${pneus[0]?.posicao ?? "Pneu"} — calibrar imediatamente`, tempo: "agora" },
    { nivel: "MEDIO", texto: `${pneus[1]?.posicao ?? "Pneu"} — verificar em 48h`, tempo: "2 min" },
    { nivel: "BAIXO", texto: `${pneus[2]?.posicao ?? "Pneu"} — pressão normal`, tempo: "5 min" },
  ];

  const insightIA = {
    texto: `IA detectou queda gradual consistente no pneu ${pneus[0]?.posicao ?? "selecionado"} — probabilidade de falha: 91%`,
    fonte: "Modelo LSTM + filtro CUSUM",
  };

  const emAlto = pneus.filter((p) => p.nivel === "ALTO").length;
  const emMedio = pneus.filter((p) => p.nivel === "MEDIO").length;
  const normais = pneus.filter((p) => p.nivel === "BAIXO").length;

  return (
    <div className="pagina">
      <Topbar
        trator={maquina.nome}
        modelo={maquina.modelo}
        ultimaLeitura={maquina.ultimaLeitura}
        voltarPara="/frota"
      />

      <section className="stats-row">
        <StatCard label="Pneus monitorados" valor={pneus.length} cor="var(--text)" />
        <StatCard label="Em risco alto" valor={emAlto} cor="var(--red)" />
        <StatCard label="Em risco médio" valor={emMedio} cor="var(--amber)" />
        <StatCard label="Normais" valor={normais} cor="var(--green)" />
      </section>

      <h2 className="dashboard-subtitulo">Status dos pneus</h2>
      <section className="pneus-grid">
        {pneus.map((p) => (
          <CardPneu
            key={p.id}
            posicao={p.posicao}
            pressao={p.pressao}
            temperatura={p.temperatura}
            nivel={p.nivel}
            selecionado={p.id === selecionadoId}
            onClick={() => setSelecionadoId(p.id)}
          />
        ))}
      </section>

      <section className="painel-inferior">
        <div className="painel">
          {pneuSelecionado ? (
            <GraficoPressao posicao={pneuSelecionado.posicao} dados={pneuSelecionado.historico} />
          ) : (
            <p className="estado-vazio">Nenhum pneu disponível para esta máquina.</p>
          )}
        </div>
        <div className="painel">
          <PainelAlertas alertas={alertas} insightIA={insightIA} />
        </div>
      </section>
    </div>
  );
}