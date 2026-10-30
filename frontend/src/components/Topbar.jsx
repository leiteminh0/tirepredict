import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import "./Topbar.css";

// Uma leitura só conta como "ao vivo" se chegou dentro desta janela.
const JANELA_AO_VIVO_MS = 2 * 60 * 1000;
// Reavalia o badge sem esperar o próximo poll (as páginas entram em backoff de até 60 s).
const INTERVALO_REAVALIACAO_MS = 30 * 1000;

function idadeEmMs(timestamp, agora) {
  if (!timestamp) return null;
  const ms = new Date(timestamp).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, agora - ms);
}

function descreverIdade(ms) {
  if (ms === null) return null;
  const segundos = Math.round(ms / 1000);
  if (segundos < 60) return `${Math.max(1, segundos)} s`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  return `${Math.round(minutos / 60)} h`;
}

function StatusDot({ online, label, hint, animated = false }) {
  return <span className={`tp-topbar__status-dot-wrap${online ? " online" : " offline"}`} aria-label={hint ? `${label}. ${hint}` : label} title={hint}><span className={`tp-topbar__dot${animated && online ? " animated" : ""}`} /><span className="tp-topbar__status-label">{label}</span></span>;
}

export default function Topbar({ trator, modelo, ultimaLeitura = null, ultimaLeituraTs = null, conectado = false, voltarPara = "/frota" }) {
  const hasMachineContext = Boolean(trator || modelo);
  const [agora, setAgora] = useState(() => Date.now());

  // Mantém a idade da leitura atualizada mesmo quando a página está em backoff.
  useEffect(() => {
    if (!ultimaLeituraTs) return undefined;
    setAgora(Date.now());
    const id = window.setInterval(() => setAgora(Date.now()), INTERVALO_REAVALIACAO_MS);
    return () => window.clearInterval(id);
  }, [ultimaLeituraTs]);

  const idadeMs = idadeEmMs(ultimaLeituraTs, agora);
  const idadeTexto = descreverIdade(idadeMs);
  const leituraRecente = idadeMs !== null && idadeMs <= JANELA_AO_VIVO_MS;
  const aoVivo = conectado || leituraRecente;
  // Diferencia a origem do sinal para não mascarar uma queda do broker MQTT.
  const rotuloStatus = conectado ? "MQTT ao vivo" : leituraRecente ? "Ao vivo" : "Aguardando sinal";
  const origemStatus = conectado
    ? "Broker MQTT conectado."
    : leituraRecente
      ? `Última leitura há ${idadeTexto}, recebida via HTTP.`
      : idadeTexto
        ? `Sem leitura recente. Última leitura há ${idadeTexto}.`
        : "Nenhuma leitura recebida nesta máquina.";

  return <header className="tp-topbar" role="banner">
    <div className="tp-topbar__left">
      {hasMachineContext ? <><Link to={voltarPara} className="tp-topbar__back" aria-label="Voltar à frota">← <span>Frota</span></Link><span className="tp-topbar__sep">/</span><div className="tp-topbar__machine"><span className="tp-topbar__machine-name">{trator}</span>{modelo && <span className="tp-topbar__machine-model">{modelo}</span>}</div></> : <div className="tp-topbar__page-title"><span className="tp-topbar__page-kicker">Central de operações</span><span className="tp-topbar__page-name">Frota</span></div>}
    </div>
    <div className="tp-topbar__right">
      {hasMachineContext && ultimaLeitura && <span className="tp-topbar__update">Atualizado {ultimaLeitura}</span>}
      <StatusDot online={aoVivo} label={rotuloStatus} hint={origemStatus} animated />
      <ThemeToggle />
      <div className="tp-topbar__profile" aria-label="Perfil do operador"><span>OP</span></div>
    </div>
  </header>;
}
