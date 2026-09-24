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
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    let errosConsecutivos = 0;
    let intervaloId = null;

    const carregar = async () => {
      if (document.hidden) return;
      try {
        const [frota, resposta] = await Promise.all([listarFrota(), listarAlertas(Number(maquinaId))]);
        if (!ativo) return;
        const encontrada = frota.find((item) => item.id === Number(maquinaId));
        setMaquina(encontrada);
        const pneus = new Map((encontrada?.pneus ?? []).map((p) => [p.id, p]));
        setAlertas(
          resposta.data.map((leitura) => ({ ...leitura, pneu: pneus.get(leitura.pneu_id) })).filter((a) => a.pneu)
        );
        setErro(null);
        errosConsecutivos = 0;
      } catch {
        if (ativo) {
          setErro("Não foi possível atualizar os alertas.");
          errosConsecutivos += 1;
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    const agendar = () => {
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
  }, [maquinaId]);

  if (carregando) {
    return (
      <div className="tp-dashboard-page">
        <div className="alertas-lista">
          {[1, 2, 3].map((n) => (
            <div key={n} className="tp-panel" style={{ minHeight: 120 }} aria-hidden="true">
              <div className="tp-skel tp-skel--line" style={{ width: "30%", height: 10 }} />
              <div className="tp-skel tp-skel--line" style={{ width: "55%", height: 20, marginTop: 10 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!maquina) {
    return (
      <div className="tp-dashboard-page">
        <div className="tp-empty-state">
          <span className="tp-empty-state__text">Máquina não encontrada</span>
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
        voltarPara="/frota"
      />

      <header className="pagina-header">
        <div>
          <p className="pagina-kicker">Operação em andamento</p>
          <h1>Alertas da máquina</h1>
        </div>
        <div className="pagina-header__chip">
          {alertas.length} ativo{alertas.length !== 1 ? "s" : ""}
        </div>
      </header>

      <section className="alertas-lista" aria-label="Lista de alertas da máquina selecionada">
        {erro && (
          <div className="tp-empty-state" role="alert">
            <span className="tp-empty-state__text">{erro}</span>
          </div>
        )}
        {!erro && alertas.length === 0 && (
          <div className="tp-empty-state">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
              <path d="M12 18l5 5 7-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="tp-empty-state__text">Nenhum alerta ativo nesta máquina</span>
            <span className="tp-empty-state__sub">Todos os pneus dentro dos parâmetros operacionais</span>
          </div>
        )}
        {alertas.map((alerta) => (
          <CardAlerta
            key={alerta.id}
            nome={alerta.pneu.posicao}
            pressao={alerta.pressao}
            temperatura={alerta.temperatura}
            acaoRecomendada={alerta.pneu.acaoRecomendada ?? "Verifique a calibragem e confirme uma nova leitura."}
            severidade={alerta.pneu.nivel === "MEDIO" ? "medio" : "critico"}
          />
        ))}
      </section>
    </div>
  );
}
