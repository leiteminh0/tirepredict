import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarFrota } from "../services/api";
import MetricCard from "../components/MetricCard";
import RiskBadge from "../components/RiskBadge";
import ThemeToggle from "../components/ThemeToggle";
import "./Frota.css";

function SkeletonCard() {
  return (
    <div className="tp-fleet-card tp-fleet-card--skeleton" aria-hidden="true">
      <div className="tp-skel tp-skel--line" style={{ width: "40%", height: 10 }} />
      <div className="tp-skel tp-skel--line" style={{ width: "70%", height: 20, marginTop: 8 }} />
      <div className="tp-skel tp-skel--line" style={{ width: "55%", height: 12, marginTop: 16 }} />
      <div className="tp-skel tp-skel--line" style={{ width: "90%", height: 12, marginTop: 8 }} />
    </div>
  );
}

function RiskDot({ nivel }) {
  const map = {
    ALTO: "var(--tp-danger)",
    MEDIO: "var(--tp-warning)",
    BAIXO: "var(--tp-success)",
  };
  const color = map[nivel] ?? "var(--tp-neutral-500)";
  return (
    <span
      style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }}
      aria-hidden="true"
    />
  );
}

export default function Frota() {
  const navigate = useNavigate();
  const [maquinas, setMaquinas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    let errosConsecutivos = 0;
    let intervaloId = null;

    const carregar = async () => {
      if (document.hidden) return;
      try {
        const frota = await listarFrota();
        if (ativo) {
          setMaquinas(frota);
          setErro(null);
          errosConsecutivos = 0;
        }
      } catch {
        if (ativo) {
          setErro("Não foi possível carregar a frota agora.");
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
  }, []);

  /* KPI aggregations from real data */
  const totalPneus = maquinas.reduce((acc, m) => acc + m.pneus.length, 0);
  const totalCriticos = maquinas.reduce(
    (acc, m) => acc + m.pneus.filter((p) => p.nivel === "ALTO").length, 0
  );
  const totalMedios = maquinas.reduce(
    (acc, m) => acc + m.pneus.filter((p) => p.nivel === "MEDIO").length, 0
  );
  const totalNormais = maquinas.reduce(
    (acc, m) => acc + m.pneus.filter((p) => p.nivel === "BAIXO").length, 0
  );

  const getRisk = (pneus) => {
    if (pneus.some((p) => p.nivel === "ALTO")) return "ALTO";
    if (pneus.some((p) => p.nivel === "MEDIO")) return "MEDIO";
    return "BAIXO";
  };

  return (
    <div className="tp-frota-page">
      {/* Topbar */}
      <header className="tp-topbar" role="banner">
        <div className="tp-topbar__left">
          <div className="tp-topbar__page-title">
            <span className="tp-topbar__page-kicker">Central de operações</span>
            <span className="tp-topbar__page-name">Frota monitorada</span>
          </div>
        </div>
        <div className="tp-topbar__right">
          <span className="tp-topbar__update">
            {maquinas.length} máquina{maquinas.length !== 1 ? "s" : ""} ativa{maquinas.length !== 1 ? "s" : ""}
          </span>
          <ThemeToggle />
          <div className="tp-topbar__profile" aria-label="Perfil do operador"><span>OP</span></div>
        </div>
      </header>

      {/* KPI Row */}
      {!carregando && !erro && (
        <section className="tp-kpi-row" aria-label="Resumo da frota">
          <MetricCard label="Máquinas" value={maquinas.length} glass={2} />
          <MetricCard label="Pneus monitorados" value={totalPneus} glass={1} />
          <MetricCard label="Risco crítico" value={totalCriticos} variant={totalCriticos > 0 ? "danger" : "default"} glass={2} />
          <MetricCard label="Risco médio" value={totalMedios} variant={totalMedios > 0 ? "warning" : "default"} glass={1} />
          <MetricCard label="Normais" value={totalNormais} variant="success" glass={1} />
        </section>
      )}

      {/* States */}
      {carregando && (
        <section className="tp-fleet-grid" aria-label="Carregando frota">
          {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
        </section>
      )}

      {erro && (
        <div className="tp-empty-state" role="alert">
          <span className="tp-empty-state__icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
              <path d="M16 9v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="16" cy="21" r="1" fill="currentColor"/>
            </svg>
          </span>
          <p className="tp-empty-state__text">{erro}</p>
          <span className="tp-empty-state__sub">Verificando conexão com a API…</span>
        </div>
      )}

      {!carregando && !erro && maquinas.length === 0 && (
        <div className="tp-empty-state">
          <span className="tp-empty-state__icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="8" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
              <line x1="10" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <p className="tp-empty-state__text">Nenhuma máquina cadastrada</p>
          <span className="tp-empty-state__sub">Aguardando dados da API</span>
        </div>
      )}

      {/* Fleet Grid */}
      {!carregando && !erro && maquinas.length > 0 && (
        <section className="tp-fleet-grid" aria-label="Lista de máquinas monitoradas">
          {maquinas.map((maquina) => {
            const riscoDominante = getRisk(maquina.pneus);
            const criticos = maquina.pneus.filter((p) => p.nivel === "ALTO").length;
            const medios = maquina.pneus.filter((p) => p.nivel === "MEDIO").length;
            const normais = maquina.pneus.filter((p) => p.nivel === "BAIXO").length;

            return (
              <button
                key={maquina.id}
                type="button"
                className={`tp-fleet-card tp-fleet-card--risk-${riscoDominante.toLowerCase()}`}
                onClick={() => navigate(`/maquinas/${maquina.id}/dashboard`)}
                aria-label={`${maquina.nome} — ${maquina.modelo}. Abrir painel`}
              >
                {/* Header */}
                <div className="tp-fleet-card__header">
                  <div className="tp-fleet-card__identity">
                    <span className="tp-fleet-card__kicker">Máquina</span>
                    <h2 className="tp-fleet-card__name">{maquina.nome}</h2>
                  </div>
                  <RiskBadge nivel={riscoDominante} />
                </div>

                {/* Model chip */}
                <span className="tp-fleet-card__model">{maquina.modelo}</span>

                {/* Tire breakdown */}
                <div className="tp-fleet-card__breakdown" aria-label="Distribuição de risco dos pneus">
                  {criticos > 0 && (
                    <span className="tp-fleet-card__breakdown-item">
                      <RiskDot nivel="ALTO" />
                      {criticos} crítico{criticos !== 1 ? "s" : ""}
                    </span>
                  )}
                  {medios > 0 && (
                    <span className="tp-fleet-card__breakdown-item">
                      <RiskDot nivel="MEDIO" />
                      {medios} médio{medios !== 1 ? "s" : ""}
                    </span>
                  )}
                  {normais > 0 && (
                    <span className="tp-fleet-card__breakdown-item">
                      <RiskDot nivel="BAIXO" />
                      {normais} normal{normais !== 1 ? "is" : ""}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="tp-fleet-card__footer">
                  <span className="tp-fleet-card__last-reading">
                    {maquina.ultimaLeitura
                      ? `Última leitura: ${maquina.ultimaLeitura}`
                      : "Sem leitura recente"}
                  </span>
                  <span className="tp-fleet-card__cta" aria-hidden="true">
                    Abrir painel
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
