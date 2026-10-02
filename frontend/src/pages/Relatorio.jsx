/**
 * Relatório da Frota — TirePredict
 *
 * Visão consolidada de toda a frota: cada máquina, cada pneu,
 * risco atual, pressão, temperatura, horas de uso e vida útil.
 *
 * Otimizado para impressão via window.print() e para apresentação
 * em tela cheia na bancada.
 */
import { useEffect, useState } from "react";
import { listarFrota, verificarSaude } from "../services/api";
import RiskBadge from "../components/RiskBadge";
import "./Relatorio.css";

const HORAS_VIDA_UTIL = 2000;

function NivelDot({ nivel }) {
  const cores = { ALTO: "var(--tp-danger)", MEDIO: "var(--tp-warning)", BAIXO: "var(--tp-success)" };
  return (
    <span
      style={{
        display: "inline-block",
        width: 8, height: 8,
        borderRadius: "50%",
        background: cores[nivel] ?? "var(--tp-neutral-500)",
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
}

function VidaUtilMini({ horasUso }) {
  if (horasUso == null) return <span className="tp-rel-sem-dado">—</span>;
  const pct = Math.min(100, Math.round((horasUso / HORAS_VIDA_UTIL) * 100));
  const variante = pct >= 85 ? "danger" : pct >= 60 ? "warning" : "success";
  return (
    <div className="tp-rel-vida">
      <div className="tp-rel-vida-track">
        <div className={`tp-rel-vida-fill tp-rel-vida-fill--${variante}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`tp-rel-vida-pct tp-rel-vida-pct--${variante}`}>{pct}%</span>
    </div>
  );
}

export default function Relatorio() {
  const [maquinas, setMaquinas] = useState([]);
  const [saude, setSaude] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [geradoEm] = useState(() =>
    new Date().toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  );

  useEffect(() => {
    Promise.all([listarFrota(), verificarSaude()])
      .then(([frota, resp]) => {
        setMaquinas(frota);
        setSaude(resp.data);
      })
      .finally(() => setCarregando(false));
  }, []);

  const totalPneus = maquinas.reduce((a, m) => a + m.pneus.length, 0);
  const criticos   = maquinas.reduce((a, m) => a + m.pneus.filter((p) => p.nivel === "ALTO").length, 0);
  const medios     = maquinas.reduce((a, m) => a + m.pneus.filter((p) => p.nivel === "MEDIO").length, 0);
  const normais    = maquinas.reduce((a, m) => a + m.pneus.filter((p) => p.nivel === "BAIXO").length, 0);

  return (
    <div className="tp-rel-page">

      {/* Header */}
      <header className="tp-rel-header no-print-hide">
        <div className="tp-rel-header__left">
          <div className="tp-topbar__page-title">
            <span className="tp-topbar__page-kicker">Exportação operacional</span>
            <span className="tp-topbar__page-name">Relatório da Frota</span>
          </div>
        </div>
        <div className="tp-rel-header__right">
          <span className="tp-rel-timestamp">Gerado em {geradoEm}</span>
          <button
            type="button"
            className="tp-rel-btn-print"
            onClick={() => window.print()}
            aria-label="Imprimir relatório"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="3" y="1" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="3" y="9" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M3 7h10" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="12" cy="7.5" r="1" fill="currentColor"/>
            </svg>
            Imprimir
          </button>
        </div>
      </header>

      {carregando ? (
        <div className="tp-rel-loading">Carregando dados da frota…</div>
      ) : (
        <div className="tp-rel-body">

          {/* Cabeçalho do relatório (visível na impressão) */}
          <div className="tp-rel-print-header print-only">
            <h1>TirePredict — Relatório de Frota</h1>
            <p>Gerado em {geradoEm}</p>
          </div>

          {/* Sumário */}
          <section className="tp-rel-summary" aria-label="Sumário da frota">
            <div className="tp-rel-kpi">
              <span className="tp-rel-kpi__value">{maquinas.length}</span>
              <span className="tp-rel-kpi__label">Máquinas</span>
            </div>
            <div className="tp-rel-kpi">
              <span className="tp-rel-kpi__value">{totalPneus}</span>
              <span className="tp-rel-kpi__label">Pneus monitorados</span>
            </div>
            <div className="tp-rel-kpi tp-rel-kpi--danger">
              <span className="tp-rel-kpi__value">{criticos}</span>
              <span className="tp-rel-kpi__label">Risco crítico</span>
            </div>
            <div className="tp-rel-kpi tp-rel-kpi--warning">
              <span className="tp-rel-kpi__value">{medios}</span>
              <span className="tp-rel-kpi__label">Risco médio</span>
            </div>
            <div className="tp-rel-kpi tp-rel-kpi--success">
              <span className="tp-rel-kpi__value">{normais}</span>
              <span className="tp-rel-kpi__label">Normais</span>
            </div>
            {saude && (
              <div className={`tp-rel-kpi tp-rel-kpi--${saude.mqtt?.connected ? "success" : "warning"}`}>
                <span className="tp-rel-kpi__value">{saude.mqtt?.connected ? "Online" : "Offline"}</span>
                <span className="tp-rel-kpi__label">MQTT</span>
              </div>
            )}
          </section>

          {/* Tabela por máquina */}
          {maquinas.map((maquina) => (
            <section key={maquina.id} className="tp-rel-maquina" aria-label={`Máquina ${maquina.nome}`}>
              <div className="tp-rel-maquina__header">
                <div>
                  <h2 className="tp-rel-maquina__nome">{maquina.nome}</h2>
                  <span className="tp-rel-maquina__modelo">{maquina.modelo}</span>
                </div>
                <span className="tp-rel-maquina__ultima">
                  {maquina.ultimaLeitura ? `Última leitura: ${maquina.ultimaLeitura}` : "Sem leitura"}
                </span>
              </div>

              <table className="tp-rel-table" aria-label={`Pneus de ${maquina.nome}`}>
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Risco</th>
                    <th>Pressão</th>
                    <th>Temperatura</th>
                    <th>Horas de uso</th>
                    <th>Vida útil</th>
                    <th>Ação recomendada</th>
                  </tr>
                </thead>
                <tbody>
                  {maquina.pneus.map((pneu) => (
                    <tr key={pneu.id} className={`tp-rel-row tp-rel-row--${(pneu.nivel ?? "indisponivel").toLowerCase()}`}>
                      <td>
                        <div className="tp-rel-posicao">
                          <NivelDot nivel={pneu.nivel} />
                          {pneu.posicao}
                        </div>
                      </td>
                      <td><RiskBadge nivel={pneu.nivel} /></td>
                      <td className="tp-rel-num">{pneu.pressao != null ? `${pneu.pressao} PSI` : "—"}</td>
                      <td className="tp-rel-num">{pneu.temperatura != null ? `${pneu.temperatura} °C` : "—"}</td>
                      <td className="tp-rel-num">{pneu.horasUso != null ? `${pneu.horasUso} h` : "—"}</td>
                      <td><VidaUtilMini horasUso={pneu.horasUso} /></td>
                      <td className="tp-rel-acao">{pneu.acaoRecomendada ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

          {/* Rodapé */}
          <footer className="tp-rel-footer">
            <span>TirePredict — Sistema de Monitoramento Preditivo de Pneus Agrícolas</span>
            <span>Relatório gerado automaticamente em {geradoEm}</span>
          </footer>
        </div>
      )}
    </div>
  );
}
