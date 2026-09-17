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
    let ativo = true;
    const carregar = async () => {
      try {
        const frota = await listarFrota();
        if (ativo) {
          setMaquinas(frota);
          setErro(null);
        }
      } catch {
        if (ativo) setErro("Nao foi possivel carregar a frota agora.");
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    carregar();
    const intervalo = window.setInterval(carregar, 5000);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, []);

  const getResumoMaquina = (pneus) => ({
    criticos: pneus.filter((pneu) => pneu.nivel === "ALTO").length,
    medios: pneus.filter((pneu) => pneu.nivel === "MEDIO").length,
    normais: pneus.filter((pneu) => pneu.nivel === "BAIXO").length,
  });

  return (
    <div className="pagina pagina-frota">
      <header className="pagina-header pagina-header--frota">
        <div><p className="pagina-kicker">Central de frota</p><h1>Maquinas monitoradas</h1></div>
        <div className="pagina-header__chip">{maquinas.length} ativos</div>
      </header>
      {carregando && <p className="estado-vazio">Carregando maquinas monitoradas...</p>}
      {erro && <p className="estado-vazio">{erro}</p>}
      {!carregando && !erro && maquinas.length === 0 && <p className="estado-vazio">Nenhuma maquina cadastrada na API.</p>}
      <section className="frota-grid" aria-label="Lista de maquinas monitoradas">
        {maquinas.map((maquina) => {
          const resumo = getResumoMaquina(maquina.pneus);
          return (
            <button key={maquina.id} type="button" className="maquina-card" onClick={() => navigate(`/maquinas/${maquina.id}/dashboard`)}>
              <div className="maquina-card__topo"><div><p className="maquina-card__label">Maquina</p><h2>{maquina.nome}</h2></div><span className="maquina-card__modelo">{maquina.modelo}</span></div>
              <div className="maquina-card__resumo"><span>{resumo.criticos} critico(s)</span><span>{resumo.medios} medio(s)</span><span>{resumo.normais} normal(is)</span></div>
              <div className="maquina-card__footer"><span className="maquina-card__status">Ultima leitura: {maquina.ultimaLeitura ?? "sem leitura"}</span><span className="maquina-card__acessar">Abrir painel</span></div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
