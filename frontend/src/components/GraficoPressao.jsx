import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from "recharts";
import "./GraficoPressao.css";

function calcularTendencia(dados) {
  if (dados.length < 2) return { texto: "Dados insuficientes", caindo: false };

  const primeiro = dados[0].pressao;
  const ultimo = dados[dados.length - 1].pressao;
  const diferenca = ultimo - primeiro;
  const horas = dados.length - 1;
  const taxaPorHora = Math.abs(diferenca / horas).toFixed(1);

  if (diferenca < -1) {
    return { texto: `Queda de ${taxaPorHora} PSI/h — tendência detectada pela IA`, caindo: true };
  }
  if (diferenca > 1) {
    return { texto: `Subida de ${taxaPorHora} PSI/h nas últimas leituras`, caindo: false };
  }
  return { texto: "Pressão estável nas últimas leituras", caindo: false };
}

function TooltipCustomizado({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="grafico-tooltip">
        <p className="tooltip-hora">{label}</p>
        <p className="tooltip-valor">{payload[0].value} PSI</p>
      </div>
    );
  }
  return null;
}

export default function GraficoPressao({ posicao, dados }) {
  const tendencia = calcularTendencia(dados);
  const corLinha = tendencia.caindo ? "var(--red)" : "var(--accent)";

  return (
    <div>
      <h3 className="grafico-titulo">Tendência de pressão — {posicao}</h3>
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={dados}>
          <defs>
            <linearGradient id="gradienteGrafico" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={corLinha} stopOpacity={0.3} />
              <stop offset="100%" stopColor={corLinha} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
          <XAxis dataKey="hora" stroke="var(--text-dim)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis stroke="var(--text-dim)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipCustomizado />} />
          <ReferenceLine y={30} stroke="var(--red)" strokeDasharray="4 4" label={{ value: "30 PSI mín", fill: "var(--red)", fontSize: 11, position: "insideTopLeft" }} />
          <Area
            type="monotone"
            dataKey="pressao"
            stroke={corLinha}
            strokeWidth={2.5}
            fill="url(#gradienteGrafico)"
            dot={{ fill: corLinha, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="grafico-legenda">{tendencia.texto}</p>
    </div>
  );
}