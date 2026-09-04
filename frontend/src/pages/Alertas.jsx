import { useParams } from "react-router-dom";
import CardAlerta from "../components/CardAlerta";
import Topbar from "../components/Topbar";
import { getMaquinaById } from "../services/mockData";
import "./Dashboard.css";

export default function Alertas() {
  const { maquinaId } = useParams();
  const maquina = getMaquinaById(maquinaId);
  const alertasExemplo = [
    {
      id: 1,
      nome: "Pneu dianteiro esquerdo",
      pressao: 18,
      temperatura: 48,
      acaoRecomendada: "Reduzir carga e verificar a válvula do pneu antes da próxima operação.",
      severidade: "critico",
    },
    {
      id: 2,
      nome: "Pneu dianteiro direito",
      pressao: 26,
      temperatura: 41,
      acaoRecomendada: "Aumentar pressão para a faixa de operação e confirmar leitura em 15 minutos.",
      severidade: "medio",
    },
    {
      id: 3,
      nome: "Pneu traseiro esquerdo",
      pressao: 34,
      temperatura: 33,
      acaoRecomendada: "Monitorar variação da temperatura durante o próximo trecho do plantio.",
      severidade: "informativo",
    },
  ];

  return (
    <div className="pagina">
      <Topbar
        trator={maquina.nome}
        modelo={maquina.modelo}
        ultimaLeitura={maquina.ultimaLeitura}
        voltarPara="/frota"
      />

      <header className="pagina-header">
        <div>
          <p className="pagina-kicker">Operação em andamento</p>
          <h1>Alertas da máquina</h1>
        </div>
        <div className="pagina-header__chip">3 itens ativos</div>
      </header>

      <section className="alertas-lista" aria-label="Lista de alertas da máquina selecionada">
        {alertasExemplo.map((alerta) => (
          <CardAlerta key={alerta.id} {...alerta} />
        ))}
      </section>
    </div>
  );
}