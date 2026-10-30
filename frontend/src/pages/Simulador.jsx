/**
 * Simulador de Telemetria — TirePredict
 *
 * Permite enviar leituras controladas via POST /simular para demonstrar
 * o sistema ao vivo sem depender do hardware (ESP32/TPMS).
 *
 * Funcionalidades:
 *   • Seleciona pneu por máquina
 *   • Sliders para pressão, temperatura e horas de uso
 *   • Modos: Manual (envio único) e Automático (envio em loop configurável)
 *   • Presets de cenário: Normal, Alerta Médio, Crítico, Deflação gradual
 *   • Acesso de escrita: token informado na tela e mantido só em sessionStorage
 *   • Exibe resposta da API com nível de risco classificado pelo ML
 */
import { useEffect, useRef, useState } from "react";
import { listarFrota, simular } from "../services/api";
import RiskBadge from "../components/RiskBadge";
import "./Simulador.css";

// ── Presets de cenário ────────────────────────────────────────────────────────
const PRESETS = [
  {
    id: "normal",
    label: "Normal",
    desc: "Operação dentro dos parâmetros",
    pressao: 36,
    temperatura: 32,
    horasUso: 120,
    cor: "success",
  },
  {
    id: "medio",
    label: "Alerta Médio",
    desc: "Pressão levemente abaixo",
    pressao: 27,
    temperatura: 42,
    horasUso: 850,
    cor: "warning",
  },
  {
    id: "critico",
    label: "Crítico",
    desc: "Pressão crítica + temperatura alta",
    pressao: 18,
    temperatura: 68,
    horasUso: 2100,
    cor: "danger",
  },
  {
    id: "deflacao",
    label: "Deflação gradual",
    desc: "Simula perda de pressão em 8 envios",
    pressao: 35,
    temperatura: 38,
    horasUso: 500,
    cor: "warning",
    sequencial: true,
    sequencia: [35, 33, 31, 29, 27, 24, 21, 17],
  },
];

// ── Token de escrita ──────────────────────────────────────────────────────────
// Guardado só em sessionStorage: sobrevive a um F5 durante a demonstração e
// desaparece quando a aba é fechada. Nunca é embutido no bundle (nada de VITE_*).
const CHAVE_TOKEN = "tp:write-api-token";

function lerTokenSalvo() {
  try {
    return sessionStorage.getItem(CHAVE_TOKEN) ?? "";
  } catch {
    return "";
  }
}

function salvarToken(valor) {
  try {
    if (valor) sessionStorage.setItem(CHAVE_TOKEN, valor);
    else sessionStorage.removeItem(CHAVE_TOKEN);
  } catch {
    /* sessionStorage indisponível (modo privado) — o token fica só em memória */
  }
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Simulador() {
  // Dados da frota
  const [maquinas, setMaquinas] = useState([]);
  const [maquinaId, setMaquinaId] = useState("");
  const [pneuId, setPneuId] = useState("");

  // Parâmetros da leitura
  const [pressao, setPressao] = useState(35);
  const [temperatura, setTemperatura] = useState(35);
  const [horasUso, setHorasUso] = useState(500);

  // Acesso de escrita
  const [token, setToken] = useState(lerTokenSalvo);
  const [testandoToken, setTestandoToken] = useState(false);
  const [avisoAcesso, setAvisoAcesso] = useState(null); // { tipo: "ok" | "info", texto }

  // Estado de envio
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { nivel, probabilidade, acao_recomendada }
  const [erro, setErro] = useState(null);
  const [log, setLog] = useState([]);

  // Modo automático
  const [autoAtivo, setAutoAtivo] = useState(false);
  const [autoIntervalo, setAutoIntervalo] = useState(3);
  const autoRef = useRef(null);
  const seqIndexRef = useRef(0);
  const presetAtivoRef = useRef(null);

  // Carrega frota
  useEffect(() => {
    listarFrota()
      .then((frota) => {
        setMaquinas(frota);
        if (frota.length > 0) {
          setMaquinaId(String(frota[0].id));
          if (frota[0].pneus.length > 0) setPneuId(String(frota[0].pneus[0].id));
        }
      })
      .catch(() => setErro("Não foi possível carregar a frota."));
  }, []);

  // Atualiza pneu ao trocar de máquina
  useEffect(() => {
    const m = maquinas.find((m) => String(m.id) === maquinaId);
    if (m?.pneus.length > 0) setPneuId(String(m.pneus[0].id));
  }, [maquinaId, maquinas]);

  // Para o auto ao desmontar
  useEffect(() => () => clearInterval(autoRef.current), []);

  const pneuAtual = maquinas
    .find((m) => String(m.id) === maquinaId)
    ?.pneus.find((p) => String(p.id) === pneuId);

  // ── Acesso de escrita ───────────────────────────────────────────────────────
  const atualizarToken = (valor) => {
    setToken(valor);
    salvarToken(valor.trim());
    setAvisoAcesso(null);
  };

  const limparAcesso = () => {
    setToken("");
    salvarToken("");
    setAvisoAcesso({ tipo: "info", texto: "Token removido desta aba." });
  };

  // ── Enviar uma leitura ──────────────────────────────────────────────────────
  // Retorna { ok, status } para que o teste de token saiba o resultado sem
  // duplicar o tratamento de erro.
  const enviarLeitura = async (p = pressao, t = temperatura, h = horasUso) => {
    if (!pneuId) return { ok: false, status: null };
    const tokenAtual = token.trim();
    if (!tokenAtual) {
      setErro("Informe o token de escrita em Acesso de escrita para enviar leituras.");
      return { ok: false, status: 401 };
    }
    setEnviando(true);
    setErro(null);
    try {
      // Chamada autenticada: grava + prevê em uma única requisição.
      // O token sai daqui apenas no header X-API-Token.
      const resp = await simular(
        {
          pneu_id: Number(pneuId),
          pressao: p,
          temperatura: t,
          horas_uso: h,
        },
        tokenAtual,
      );
      const { previsao, leitura_salva } = resp.data;
      const risco = previsao;
      setResultado(risco);
      setLog((prev) => [
        {
          id: Date.now(),
          hora: new Date().toLocaleTimeString("pt-BR"),
          posicao: pneuAtual?.posicao ?? `Pneu ${pneuId}`,
          pressao: p,
          temperatura: t,
          nivel: risco.nivel,
          leitura_salva,
        },
        ...prev.slice(0, 19),
      ]);
      return { ok: true, status: resp.status };
    } catch (e) {
      const status = e?.response?.status;
      const mensagens = {
        401: "Token de escrita recusado. Confirme o valor em Acesso de escrita.",
        404: "Pneu não encontrado. Recarregue a página.",
        422: "Valor fora do intervalo permitido.",
        503: "Servidor sem WRITE_API_TOKEN configurado — o envio está bloqueado pela API.",
      };
      setErro(mensagens[status] ?? "Erro ao enviar leitura. Verifique a API.");
      return { ok: false, status };
    } finally {
      setEnviando(false);
    }
  };

  // ── Testar token ────────────────────────────────────────────────────────────
  // Usa a própria rota de escrita: se a leitura for gravada, o token é válido.
  const testarToken = async () => {
    if (!token.trim()) return;
    setTestandoToken(true);
    setAvisoAcesso(null);
    const { ok } = await enviarLeitura();
    setAvisoAcesso(
      ok
        ? { tipo: "ok", texto: "Token aceito. A leitura de teste aparece no histórico ao lado." }
        : null,
    );
    setTestandoToken(false);
  };

  // ── Modo automático ─────────────────────────────────────────────────────────
  const iniciarAuto = () => {
    if (!token.trim()) {
      setErro("Informe o token de escrita em Acesso de escrita antes de iniciar o modo automático.");
      return;
    }
    setAutoAtivo(true);
    autoRef.current = setInterval(async () => {
      const preset = presetAtivoRef.current;
      let p = pressao, t = temperatura, h = horasUso;

      if (preset?.sequencial) {
        const seq = preset.sequencia;
        p = seq[seqIndexRef.current % seq.length];
        seqIndexRef.current += 1;
      }
      await enviarLeitura(p, t, h);
    }, autoIntervalo * 1000);
  };

  const pararAuto = () => {
    clearInterval(autoRef.current);
    setAutoAtivo(false);
    seqIndexRef.current = 0;
  };

  // ── Aplicar preset ──────────────────────────────────────────────────────────
  const aplicarPreset = (preset) => {
    setPressao(preset.pressao);
    setTemperatura(preset.temperatura);
    setHorasUso(preset.horasUso);
    presetAtivoRef.current = preset;
    if (autoAtivo) pararAuto();
  };

  // ── Cor do nível ────────────────────────────────────────────────────────────
  const corNivel = { ALTO: "danger", MEDIO: "warning", BAIXO: "success", INDISPONIVEL: "info" };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="tp-sim-page">

      {/* Header */}
      <header className="tp-topbar" role="banner">
        <div className="tp-topbar__left">
          <div className="tp-topbar__page-title">
            <span className="tp-topbar__page-kicker">Modo demonstração</span>
            <span className="tp-topbar__page-name">Simulador de Telemetria</span>
          </div>
        </div>
        <div className="tp-topbar__right">
          <span className={`tp-badge ${autoAtivo ? "tp-badge--danger" : "tp-badge--success"}`}>
            {autoAtivo ? "● Auto ativo" : "● Manual"}
          </span>
        </div>
      </header>

      <div className="tp-sim-layout">

        {/* ── Painel de controle ── */}
        <section className="tp-sim-panel tp-sim-panel--control" aria-label="Controles do simulador">

          {/* Acesso de escrita */}
          <div className="tp-sim-group">
            <span className="tp-label">Acesso de escrita</span>
            <div className="tp-sim-token">
              <input
                id="tp-token-escrita"
                className="tp-sim-input"
                type="password"
                name="write-api-token"
                value={token}
                onChange={(e) => atualizarToken(e.target.value)}
                placeholder="X-API-Token"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="tp-token-ajuda"
                aria-label="Token de escrita da API"
                disabled={autoAtivo}
              />
              <button
                type="button"
                className="tp-sim-btn-token"
                onClick={testarToken}
                disabled={!token.trim() || testandoToken || autoAtivo || !pneuId}
              >
                {testandoToken ? "Testando…" : "Testar"}
              </button>
              <button
                type="button"
                className="tp-sim-btn-token tp-sim-btn-token--ghost"
                onClick={limparAcesso}
                disabled={!token || autoAtivo}
              >
                Limpar
              </button>
            </div>
            <p id="tp-token-ajuda" className="tp-sim-token-ajuda">
              {token.trim()
                ? "Mantido apenas nesta aba (sessionStorage) e enviado no header X-API-Token. Nunca entra no bundle."
                : "Sem token o envio fica bloqueado. Informe aqui o WRITE_API_TOKEN configurado no servidor."}
            </p>
            {avisoAcesso && (
              <p
                className={`tp-sim-aviso tp-sim-aviso--${avisoAcesso.tipo}`}
                role={avisoAcesso.tipo === "erro" ? "alert" : "status"}
              >
                {avisoAcesso.texto}
              </p>
            )}
          </div>

          {/* Seleção de pneu */}
          <div className="tp-sim-group">
            <span className="tp-label">Destino</span>
            <div className="tp-sim-selects">
              <label className="tp-sim-select-wrap">
                <span className="tp-sim-select-label">Máquina</span>
                <select
                  className="tp-sim-select"
                  value={maquinaId}
                  onChange={(e) => setMaquinaId(e.target.value)}
                  disabled={autoAtivo}
                >
                  {maquinas.map((m) => (
                    <option key={m.id} value={String(m.id)}>{m.nome}</option>
                  ))}
                </select>
              </label>
              <label className="tp-sim-select-wrap">
                <span className="tp-sim-select-label">Pneu</span>
                <select
                  className="tp-sim-select"
                  value={pneuId}
                  onChange={(e) => setPneuId(e.target.value)}
                  disabled={autoAtivo}
                >
                  {maquinas
                    .find((m) => String(m.id) === maquinaId)
                    ?.pneus.map((p) => (
                      <option key={p.id} value={String(p.id)}>{p.posicao}</option>
                    ))}
                </select>
              </label>
            </div>
          </div>

          {/* Presets */}
          <div className="tp-sim-group">
            <span className="tp-label">Cenários</span>
            <div className="tp-sim-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`tp-sim-preset tp-sim-preset--${p.cor}`}
                  onClick={() => aplicarPreset(p)}
                  title={p.desc}
                  disabled={autoAtivo}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="tp-sim-group">
            <span className="tp-label">Parâmetros manuais</span>

            <SimSlider
              label="Pressão"
              unit="PSI"
              value={pressao}
              min={0} max={80} step={0.5}
              onChange={setPressao}
              warn={pressao < 25}
              danger={pressao < 20}
              disabled={autoAtivo}
            />
            <SimSlider
              label="Temperatura"
              unit="°C"
              value={temperatura}
              min={-20} max={120} step={1}
              onChange={setTemperatura}
              warn={temperatura > 55}
              danger={temperatura > 75}
              disabled={autoAtivo}
            />
            <SimSlider
              label="Horas de uso"
              unit="h"
              value={horasUso}
              min={0} max={5000} step={50}
              onChange={setHorasUso}
              warn={horasUso > 1500}
              danger={horasUso > 3000}
              disabled={autoAtivo}
            />
          </div>

          {/* Modo automático */}
          <div className="tp-sim-group">
            <span className="tp-label">Modo automático</span>
            <div className="tp-sim-auto-row">
              <label className="tp-sim-select-wrap" style={{ flex: 1 }}>
                <span className="tp-sim-select-label">Intervalo</span>
                <select
                  className="tp-sim-select"
                  value={autoIntervalo}
                  onChange={(e) => setAutoIntervalo(Number(e.target.value))}
                  disabled={autoAtivo}
                >
                  <option value={2}>2 segundos</option>
                  <option value={3}>3 segundos</option>
                  <option value={5}>5 segundos</option>
                  <option value={10}>10 segundos</option>
                </select>
              </label>
              <button
                type="button"
                className={`tp-sim-btn-auto ${autoAtivo ? "tp-sim-btn-auto--stop" : "tp-sim-btn-auto--start"}`}
                onClick={autoAtivo ? pararAuto : iniciarAuto}
                disabled={!pneuId || !token.trim()}
              >
                {autoAtivo ? "■ Parar auto" : "▶ Iniciar auto"}
              </button>
            </div>
          </div>

          {/* Botão enviar manual */}
          {!autoAtivo && (
            <button
              type="button"
              className="tp-sim-btn-send"
              onClick={() => enviarLeitura()}
              disabled={!pneuId || enviando || !token.trim()}
            >
              {enviando ? "Enviando…" : "Enviar leitura"}
            </button>
          )}

          {erro && (
            <p className="tp-sim-error" role="alert">{erro}</p>
          )}
        </section>

        {/* ── Resultado ── */}
        <section className="tp-sim-panel tp-sim-panel--result" aria-label="Resultado da última leitura">
          <span className="tp-label">Resultado — ML</span>

          {resultado ? (
            <div className="tp-sim-result">
              <div className="tp-sim-result__badge">
                <RiskBadge nivel={resultado.nivel} large />
              </div>
              <div className="tp-sim-result__stats">
                <div className="tp-sim-result__stat">
                  <span className="tp-sim-result__stat-label">Confiança</span>
                  <span className="tp-sim-result__stat-value">
                    {resultado.probabilidade != null
                      ? `${Math.round(resultado.probabilidade * 100)}%`
                      : "—"}
                  </span>
                </div>
                <div className="tp-sim-result__stat">
                  <span className="tp-sim-result__stat-label">Ação recomendada</span>
                  <span className="tp-sim-result__stat-value tp-sim-result__stat-value--action">
                    {resultado.acao_recomendada}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="tp-sim-result-empty">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                <circle cx="20" cy="20" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
                <circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.6"/>
                <line x1="20" y1="4" x2="20" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="20" y1="29" x2="20" y2="36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="4" y1="20" x2="11" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="29" y1="20" x2="36" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Envie uma leitura para ver o resultado do modelo</span>
            </div>
          )}

          {/* Log de envios */}
          {log.length > 0 && (
            <div className="tp-sim-log" aria-label="Histórico de envios">
              <span className="tp-label" style={{ marginBottom: 8, display: "block" }}>
                Histórico ({log.length})
              </span>
              <div className="tp-sim-log__list">
                {log.map((entry) => (
                  <div key={entry.id} className={`tp-sim-log__entry tp-sim-log__entry--${corNivel[entry.nivel] ?? "info"}`}>
                    <span className="tp-sim-log__hora">{entry.hora}</span>
                    <span className="tp-sim-log__posicao">{entry.posicao}</span>
                    <span className="tp-sim-log__pressao">{entry.pressao} PSI</span>
                    <span className={`tp-sim-log__nivel tp-sim-log__nivel--${corNivel[entry.nivel] ?? "info"}`}>
                      {entry.nivel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── SimSlider ─────────────────────────────────────────────────────────────────
function SimSlider({ label, unit, value, min, max, step, onChange, warn, danger, disabled }) {
  const variant = danger ? "danger" : warn ? "warning" : "success";
  return (
    <label className={`tp-sim-slider-wrap tp-sim-slider-wrap--${variant}`}>
      <div className="tp-sim-slider-header">
        <span className="tp-sim-slider-label">{label}</span>
        <span className="tp-sim-slider-value">
          {value} <span className="tp-sim-slider-unit">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        className={`tp-sim-slider tp-sim-slider--${variant}`}
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        aria-label={`${label}: ${value} ${unit}`}
      />
      <div className="tp-sim-slider-range">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </label>
  );
}
