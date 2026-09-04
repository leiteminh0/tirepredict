import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import "./Topbar.css";

export default function Topbar({ trator, modelo, ultimaLeitura, voltarPara = "/frota" }) {
  const hasMachineContext = Boolean(trator || modelo);

  return (
    <header className="topbar">
      <div className="topbar-esquerda">
        <div className="topbar-brand">
          <span className="topbar-logo">
            Nodus <span className="topbar-logo-accent">TirePredict</span>
          </span>
          <span className="topbar-ao-vivo">
            <span className="pulso" /> Ao vivo
          </span>
        </div>

        {hasMachineContext && (
          <div className="topbar-maquina">
            <Link to={voltarPara} className="topbar-voltar" aria-label="Voltar à frota">
              Voltar à Frota
            </Link>
            <div className="topbar-maquina__conteudo">
              <span className="topbar-maquina__nome">{trator}</span>
              <span className="topbar-maquina__modelo">{modelo}</span>
            </div>
          </div>
        )}
      </div>

      <div className="topbar-direita">
        <span className="topbar-info">
          {hasMachineContext ? `Última leitura: ${ultimaLeitura}` : `Frota monitorada`}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}