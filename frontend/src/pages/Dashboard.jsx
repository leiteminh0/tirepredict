import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Topbar from "../components/Topbar";
import MetricCard from "../components/MetricCard";
import CardPneu from "../components/CardPneu";
import GraficoPressao from "../components/GraficoPressao";
import PainelAlertas from "../components/PainelAlertas";
import { formatarTempoRelativo, listarFrota, verificarSaude } from "../services/api";
import "./Dashboard.css";

function PanelSkeleton({ height = 280 }) {
  return (
    <div
      className="tp-panel"
      style={{ minHeight: height }}
      aria-hidden="true"
    >
      <div className="tp-skel tp-skel--line" style={{ width: "35%", height: 11, marginBottom: 16 }} />
      <div className="tp-skel tp-skel--line" style={{ width: "60%", height: 20, marginBottom: 24 }} />
      <div className="tp-skel tp-skel--block" style={{ height: height - 80 }} />
    </div>
  );
}

export default function Dashboard() {
  const { maquinaId } = useParams();
  const [maquinas, setMaquinas] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mqttConectado, setMqttConectado] = useState(false);

  useEffect(() => {
    let ativo = true;
    let errosConsecutivos = 0;
    let intervaloId = null;

    const carregar = async () => {
      // Não poleia com aba em background — economiza requisições.
      if (document.hidden) return;
      try {
        const [frota, respostaSaude] = await Promise.all([
          listarFrota(),
          verificarSaude(),
        ]);
        if (!ativo) return;
        setMaquinas(frota);
        setMqttConectado(respostaSaude.data.mqtt?.connected === true);
        setErro(null);
        errosConsecutivos = 0;
      } catch {
        if (ativo) {
          setErro("Não foi possível atualizar os dados da máquina.");
          errosConsecutivos += 1;
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    const agendar = () => {
      // Backoff exponencial: 5s, 10s, 20s, até 60s máximo.
      const delay = Math.min(5000 * Math.pow(2, errosConsecutivos), 60000);
      intervaloId = window.setTimeout(async () => {
        await carregar();
        if (ativo) agendar();
      }, delay);
    };

    const aoMudarVisibilidade = () => {
      if (!document.hidden) carregar();
    };

    carregar();
    agendar();
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      ativo = false;
      window.clearTimeout(intervaloId);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, []);

  const maquina = maquinas.find((m) => m.id === Number(maquinaId));
  const pneus = maquina?.pneus ?? [];
  const pneuSelecionado = pneus.find((p) => p.id === selecionadoId) ?? pneus[0];

  const alertas = pneus
    .filter((p) => ["ALTO", "MEDIO"].includes(p.nivel) && p.ultimaLeitura)
    .slice(0, 4)
    .map((p) => ({
      nivel: p.nivel,
      texto: `${p.posicao}: ${p.pressao} PSI — ${p.temperatura} °C`,
      tempo: formatarTempoRelativo(p.ultimaLeitura),
    }));

  const emAlto   = pneus.filter((p) => p.nivel === "ALTO").length;
  const emMedio  = pneus.filter((p) => p.nivel === "MEDIO").length;
  const normais  = pneus.filter((p) => p.nivel === "BAIXO").length;

  /* Loading skeleton */
  if (carregando) {
    return (
      <div className="tp-dashboard-page">
        <div className="tp-kpi-row">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="tp-panel" style={{ minHeight: 96 }} aria-hidden="true">
              <div className="tp-skel tp-skel--line" style={{ width: "60%", height: 10 }} />
              <div className="tp-skel tp-skel--line" style={{ width: "40%", height: 28, marginTop: 12 }} />
            </div>
          ))}
        </div>
        <PanelSkeleton height={200} />
        <PanelSkeleton height={280} />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="tp-dashboard-page">
        <div className="tp-empty-state" role="alert">
          <span className="tp-empty-state__text">{erro}</span>
        </div>
      </div>
    );
  }

  if (!maquina) {
    return (
      <div className="tp-dashboard-page">
        <div className="tp-empty-state">
          <span className="tp-empty-state__text">Máquina não encontrada</span>
          <span className="tp-empty-state__sub">Verifique o ID e tente novamente</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tp-dashboard-page">
      <Topbar
        trator={maquina.nome}
        modelo={maquina.modelo}
        ultimaLeitura={maquina.ultimaLeitura ?? "sem leitura"}
        conectado={mqttConectado}
        voltarPara="/frota"
      />

      {/* KPI Row */}
      <section className="tp-kpi-row" aria-label="Métricas da máquina">
        <MetricCard label="Pneus monitorados" value={pneus.length} glass={2} />
        <MetricCard
          label="Risco crítico"
          value={emAlto}
          variant={emAlto > 0 ? "danger" : "default"}
          glass={2}
        />
        <MetricCard
          label="Risco médio"
          value={emMedio}
          variant={emMedio > 0 ? "warning" : "default"}
          glass={1}
        />
        <MetricCard label="Normais" value={normais} variant="success" glass={1} />
      </section>

      {/* Tire grid */}
      <section aria-label="Status dos pneus">
        <p className="tp-dashboard-section-label">Status dos pneus</p>
        <div className="tp-pneus-grid">
          {pneus.length === 0 ? (
            <p className="tp-empty-state__text">Nenhum pneu cadastrado nesta máquina.</p>
          ) : (
            pneus.map((pneu) => (
              <CardPneu
                key={pneu.id}
                {...pneu}
                selecionado={pneu.id === pneuSelecionado?.id}
                onClick={() => setSelecionadoId(pneu.id)}
              />
            ))
          )}
        </div>
      </section>

      {/* Bottom panels: chart + alerts */}
      <div className="tp-dashboard-lower">
        <div className="tp-panel tp-panel--chart">
          {pneuSelecionado ? (
            <GraficoPressao
              posicao={pneuSelecionado.posicao}
              dados={pneuSelecionado.historico}
            />
          ) : (
            <p className="tp-empty-state__text">Nenhum pneu disponível para esta máquina.</p>
          )}
        </div>
        <div className="tp-panel tp-panel--alerts">
          <PainelAlertas alertas={alertas} />
        </div>
      </div>
    </div>
  );
}
