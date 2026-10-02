/**
 * Histórico de Alertas — TirePredict
 *
 * Lista todos os alertas (leituras abaixo do threshold) com filtro
 * por máquina e por período. Mostra contadores de ocorrência por pneu.
 */
import { useEffect, useState, useMemo } from "react";
import { listarAlertas, listarFrota } from "../services/api";
import "./HistoricoAlertas.css";

const PERIODOS = [
  { label: "Últimas 24h",  horas: 24 },
  { label: "Últimos 7 dias", horas: 168 },
  { label: "Últimos 30 dias", horas: 720 },
  { label: "Todos", horas: null },
];

function formatarDataHora(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function HistoricoAlertas() {
  const [frota, setFrota] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Filtros
  const [maquinaFiltro, setMaquinaFiltro] = useState("todas");
  const [periodoIdx, setPeriodoIdx] = useState(1); // padrão: 7 dias

  useEffect(() => {
    let ativo = true;
    Promise.all([listarFrota(), listarAlertas()])
      .then(([f, resp]) => {
        if (!ativo) return;
        setFrota(f);
        setAlertas(resp.data);
        setErro(null);
      })
      .catch(() => setErro("Não foi possível carregar o histórico."))
      .finally(() => ativo && setCarregando(false));
    return () => { ativo = false; };
  }, []);

  // Mapa pneuId → { posicao, maquinaId, maquinaNome, nivel }
  const pneuMap = useMemo(() => {
    const m = new Map();
    frota.forEach((maq) => {
      maq.pneus.forEach((p) => {
        m.set(p.id, { posicao: p.posicao, maquinaId: maq.id, maquinaNome: maq.nome, nivel: p.nivel });
      });
    });
    return m;
  }, [frota]);

  // Alertas filtrados
  const alertasFiltrados = useMemo(() => {
    const periodo = PERIODOS[periodoIdx];
    const corte = periodo.horas ? Date.now() - periodo.horas * 3600 * 1000 : null;

    return alertas
      .filter((a) => {
        const info = pneuMap.get(a.pneu_id);
        if (!info) return false;
        if (maquinaFiltro !== "todas" && String(info.maquinaId) !== maquinaFiltro) return false;
        if (corte && new Date(a.timestamp).getTime() < corte) return false;
        return true;
      })
      .map((a) => ({ ...a, _info: pneuMap.get(a.pneu_id) }));
  }, [alertas, pneuMap, maquinaFiltro, periodoIdx]);

  // Contagem por pneu (ranking)
  const rankingPneus = useMemo(() => {
    const contagem = new Map();
    alertasFiltrados.forEach((a) => {
      const key = a.pneu_id;
      contagem.set(key, (contagem.get(key) ?? 0) + 1);
    });
    return [...contagem.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pneuId, total]) => ({
        pneuId,
        total,
        info: pneuMap.get(pneuId),
      }));
  }, [alertasFiltrados, pneuMap]);

  return (
    <div className="tp-hist-page">

      {/* Header */}
      <header className="tp-topbar" role="banner">
        <div className="tp-topbar__left">
          <div className="tp-topbar__page-title">
            <span className="tp-topbar__page-kicker">Rastreabilidade operacional</span>
            <span className="tp-topbar__page-name">Histórico de Alertas</span>
          </div>
        </div>
        <div className="tp-topbar__right">
          <span className="tp-topbar__update">
            {alertasFiltrados.length} alerta{alertasFiltrados.length !== 1 ? "s" : ""} encontrado{alertasFiltrados.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {/* Filtros */}
      <section className="tp-hist-filtros" aria-label="Filtros">
        {/* Período */}
        <div className="tp-hist-filtro-group">
          <span className="tp-label">Período</span>
          <div className="tp-hist-chips">
            {PERIODOS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                className={`tp-hist-chip ${periodoIdx === i ? "tp-hist-chip--active" : ""}`}
                onClick={() => setPeriodoIdx(i)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Máquina */}
        <div className="tp-hist-filtro-group">
          <span className="tp-label">Máquina</span>
          <select
            className="tp-hist-select"
            value={maquinaFiltro}
            onChange={(e) => setMaquinaFiltro(e.target.value)}
            aria-label="Filtrar por máquina"
          >
            <option value="todas">Todas as máquinas</option>
            {frota.map((m) => (
              <option key={m.id} value={String(m.id)}>{m.nome}</option>
            ))}
          </select>
        </div>
      </section>

      {carregando ? (
        <div className="tp-hist-loading">Carregando histórico…</div>
      ) : erro ? (
        <div className="tp-hist-empty" role="alert">{erro}</div>
      ) : (
        <div className="tp-hist-layout">

          {/* Lista principal */}
          <section className="tp-hist-lista" aria-label="Lista de alertas">
            {alertasFiltrados.length === 0 ? (
              <div className="tp-hist-empty">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                  <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                  <path d="M12 18l5 5 7-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>Nenhum alerta no período selecionado</p>
              </div>
            ) : (
              alertasFiltrados.map((alerta) => (
                <div
                  key={alerta.id}
                  className="tp-hist-item"
                  aria-label={`Alerta: ${alerta._info?.posicao} — ${alerta.pressao} PSI`}
                >
                  <div className="tp-hist-item__left">
                    <span className="tp-hist-item__posicao">
                      {alerta._info?.posicao ?? `Pneu ${alerta.pneu_id}`}
                    </span>
                    <span className="tp-hist-item__maquina">
                      {alerta._info?.maquinaNome ?? "—"}
                    </span>
                  </div>
                  <div className="tp-hist-item__dados">
                    <span className="tp-hist-item__pressao">{alerta.pressao} PSI</span>
                    <span className="tp-hist-item__temp">{alerta.temperatura} °C</span>
                  </div>
                  <div className="tp-hist-item__hora">
                    {formatarDataHora(alerta.timestamp)}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Ranking de pneus com mais alertas */}
          {rankingPneus.length > 0 && (
            <aside className="tp-hist-ranking" aria-label="Pneus com mais alertas">
              <span className="tp-label" style={{ marginBottom: 12, display: "block" }}>
                Top pneus com alertas
              </span>
              {rankingPneus.map(({ pneuId, total, info }) => (
                <div key={pneuId} className="tp-hist-rank-item">
                  <div className="tp-hist-rank-info">
                    <span className="tp-hist-rank-posicao">{info?.posicao ?? `Pneu ${pneuId}`}</span>
                    <span className="tp-hist-rank-maquina">{info?.maquinaNome ?? "—"}</span>
                  </div>
                  <span className="tp-hist-rank-total">{total}</span>
                </div>
              ))}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
