import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  const location = useLocation();

  const linkAtivo = (caminho) => location.pathname === caminho;
  const emMaquina = /\/maquinas\//.test(location.pathname);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-nodus">Nodus</span>
        <span className="logo-tire">TirePredict</span>
      </div>

      <nav className="sidebar-nav" aria-label="Navegação principal">
        <Link
          to="/frota"
          className={`sidebar-link ${linkAtivo("/frota") || location.pathname === "/" ? "ativo" : ""}`}
        >
          <span className="icone" aria-hidden="true">▣</span>
          Frota
        </Link>

        <Link
          to={emMaquina ? location.pathname.replace(/\/dashboard$|\/alertas$/, "") + "/dashboard" : "/frota"}
          className={`sidebar-link ${/\/dashboard$/.test(location.pathname) ? "ativo" : ""}`}
        >
          <span className="icone" aria-hidden="true">◫</span>
          Dashboard da máquina
        </Link>

        <Link
          to={emMaquina ? location.pathname.replace(/\/dashboard$|\/alertas$/, "") + "/alertas" : "/frota"}
          className={`sidebar-link ${/\/alertas$/.test(location.pathname) ? "ativo" : ""}`}
        >
          <span className="icone" aria-hidden="true">⚑</span>
          Alertas da máquina
        </Link>
      </nav>

      <div className="sidebar-footer">
        <span className="status-dot" aria-hidden="true" />
        Sistema ativo
      </div>
    </aside>
  );
}