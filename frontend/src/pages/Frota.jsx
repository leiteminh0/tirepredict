import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarFrota } from "../services/api";
import "./Dashboard.css";

export default function Frota() {
  const navigate = useNavigate();
  const [maquinas, setMaquinas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    listarFrota()
      .then(setMaquinas)
      .catch(() => setErro("Não foi possível carregar a frota agora."))
      .finally(() => setCarregando(false));
  }, []);

  const getResumoMaquina = (pneus) => ({
    criticos: pneus.filter((pneu) => pneu.nivel === "ALTO").length,
    medios: pneus.filter((pneu) => pneu.nivel === "MEDIO").length,
    normais: pneus.filter((pneu) => pneu.nivel === "BAIXO").length,
  });

  return (
    <div className="pagina pagina-frota">
      <header className="pagina-header pagina-header--frota">
        <div>
          <p className="pagina-kicker">Central de frota</p>
          <h1>Máquinas monitoradas</h1>
        </div>
        <div className="pagina-header__chip">{maquinas.length} ativos</div>
      </header>

      {carregando && <p className="estado-vazio">Carregando máquinas monitoradas...</p>}
      {erro && <p className="estado-vazio">{erro}</p>}
      {!carregando && !erro && maquinas.length === 0 && (
        <p className="estado-vazio">Nenhuma máquina cadastrada. Execute o seed da API.</p>
      )}

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
