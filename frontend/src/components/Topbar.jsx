import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import "./Topbar.css";

function StatusDot({ online, label, animated = false }) {
  return <span className={`tp-topbar__status-dot-wrap${online ? " online" : " offline"}`} aria-label={label}><span className={`tp-topbar__dot${animated && online ? " animated" : ""}`} /><span className="tp-topbar__status-label">{label}</span></span>;
}

export default function Topbar({ trator, modelo, ultimaLeitura, conectado = false, voltarPara = "/frota" }) {
  const hasMachineContext = Boolean(trator || modelo);
  return <header className="tp-topbar" role="banner">
    <div className="tp-topbar__left">
      {hasMachineContext ? <><Link to={voltarPara} className="tp-topbar__back" aria-label="Voltar à frota">← <span>Frota</span></Link><span className="tp-topbar__sep">/</span><div className="tp-topbar__machine"><span className="tp-topbar__machine-name">{trator}</span>{modelo && <span className="tp-topbar__machine-model">{modelo}</span>}</div></> : <div className="tp-topbar__page-title"><span className="tp-topbar__page-kicker">Central de operações</span><span className="tp-topbar__page-name">Frota</span></div>}
    </div>
    <div className="tp-topbar__right">
      {hasMachineContext && ultimaLeitura && <span className="tp-topbar__update">Atualizado {ultimaLeitura}</span>}
      <StatusDot online={conectado} label={conectado ? "MQTT ao vivo" : "MQTT aguardando"} animated />
      <ThemeToggle />
      <div className="tp-topbar__profile" aria-label="Perfil do operador"><span>OP</span></div>
    </div>
  </header>;
}
