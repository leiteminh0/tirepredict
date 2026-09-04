import { useNavigate } from "react-router-dom";
import { maquinas, getResumoMaquina } from "../services/mockData";
import "./Dashboard.css";

export default function Frota() {
  const navigate = useNavigate();

  return (
    <div className="pagina pagina-frota">
      <header className="pagina-header pagina-header--frota">
        <div>
          <p className="pagina-kicker">Central de frota</p>
          <h1>Máquinas monitoradas</h1>
        </div>
        <div className="pagina-header__chip">{maquinas.length} ativos</div>
      </header>

      <section className="frota-grid" aria-label="Lista de máquinas monitoradas">
        {maquinas.map((maquina) => {
          const resumo = getResumoMaquina(maquina.pneus);

          return (
            <button
              key={maquina.id}
              type="button"
              className="maquina-card"
              onClick={() => navigate(`/maquinas/${maquina.id}/dashboard`)}
            >
              <div className="maquina-card__topo">
                <div>
                  <p className="maquina-card__label">Máquina</p>
                  <h2>{maquina.nome}</h2>
                </div>
                <span className="maquina-card__modelo">{maquina.modelo}</span>
              </div>

              <div className="maquina-card__resumo">
                <span>{resumo.criticos} crítico(s)</span>
                <span>{resumo.medios} médio(s)</span>
                <span>{resumo.normais} normal(is)</span>
              </div>

              <div className="maquina-card__footer">
                <span className="maquina-card__status">Última leitura: {maquina.ultimaLeitura}</span>
                <span className="maquina-card__acessar">Abrir painel</span>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
