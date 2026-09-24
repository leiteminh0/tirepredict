import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from "recharts";
import "./GraficoPressao.css";

function calcularTendencia(dados) {
  if (!dados || dados.length < 2) return { texto: "Dados insuficientes para calcular tendência", caindo: false };
  const primeiro = dados[0].pressao;
  const ultimo = dados[dados.length - 1].pressao;
  const diferenca = ultimo - primeiro;
  const taxa = Math.abs(diferenca / (dados.length - 1)).toFixed(1);
  if (diferenca < -1) return { texto: `Queda de ${taxa} PSI por leitura`, caindo: true };
  if (diferenca > 1)  return { texto: `Subida de ${taxa} PSI por leitura`, caindo: false };
  return { texto: "Pressão estável nas leituras recentes", caindo: false };
}

function PremiumTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tp-chart-tooltip">
      <span className="tp-chart-tooltip__label">{label}</span>
      <span className="tp-chart-tooltip__value">
        {payload[0].value} <span className="tp-chart-tooltip__unit">PSI</span>
      </span>
    </div>
  );
}

export default function GraficoPressao({ posicao, dados }) {
  const tendencia = calcularTendencia(dados ?? []);
  const corLinha = tendencia.caindo ? "var(--tp-danger)" : "var(--tp-green)";
  const gradId = `grad-${posicao?.replace(/\s+/g, "-")}`;

  return (
    <div className="tp-chart-wrap">
      <div className="tp-chart-header">
        <div>
          <span className="tp-chart-kicker">Telemetria de pressão</span>
          <h3 className="tp-chart-title">{posicao}</h3>
        </div>
        <span className={`tp-chart-trend${tendencia.caindo ? " tp-chart-trend--down" : " tp-chart-trend--stable"}`}>
          {tendencia.caindo
            ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 3L6 9L10 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 9L6 3L10 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
          {tendencia.texto}
        </span>
      </div>

      {(!dados || dados.length === 0) ? (
        <div className="tp-chart-empty">Nenhuma leitura disponível para este pneu.</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dados} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={corLinha} stopOpacity={0.25} />
                <stop offset="100%" stopColor={corLinha} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="2 6"
              stroke="rgba(238,240,232,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="hora"
              stroke="transparent"
              tick={{ fill: "var(--tp-text-muted)", fontSize: 11, fontFamily: "var(--tp-font-mono)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="transparent"
              tick={{ fill: "var(--tp-text-muted)", fontSize: 11, fontFamily: "var(--tp-font-mono)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<PremiumTooltip />}
              cursor={{ stroke: "var(--tp-border-strong)", strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <ReferenceLine
              y={30}
              stroke="var(--tp-danger)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{ value: "30 PSI", fill: "var(--tp-danger)", fontSize: 10, position: "insideTopLeft", opacity: 0.7 }}
            />
            <Area
              type="monotone"
              dataKey="pressao"
              stroke={corLinha}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, fill: corLinha, stroke: "var(--tp-bg-base)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
