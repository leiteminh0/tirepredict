import {
  Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Line, ComposedChart
} from "recharts";
import "./GraficoPressao.css";

/**
 * Regressão linear simples — retorna coeficiente angular (slope) e intercepto.
 * Usado para calcular a linha de tendência e projetar leituras futuras.
 */
function regressaoLinear(dados) {
  const n = dados.length;
  if (n < 2) return null;
  const xs = dados.map((_, i) => i);
  const ys = dados.map((d) => d.pressao);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function calcularTendencia(dados) {
  if (!dados || dados.length < 2) return { texto: "Dados insuficientes", caindo: false, slope: 0 };
  const reg = regressaoLinear(dados);
  if (!reg) return { texto: "Dados insuficientes", caindo: false, slope: 0 };

  const { slope } = reg;
  const taxaStr = Math.abs(slope).toFixed(2);

  if (slope < -0.5) return { texto: `Queda de ${taxaStr} PSI/leitura`, caindo: true, slope };
  if (slope > 0.5)  return { texto: `Subida de ${taxaStr} PSI/leitura`, caindo: false, slope };
  return { texto: "Pressão estável", caindo: false, slope };
}

/**
 * Projeta N pontos futuros usando a reta de regressão.
 * Retorna dados com campo `tendencia` (linha tracejada) sem dados de `pressao`.
 */
function projetarTendencia(dados, reg, nProjecao = 4) {
  if (!reg) return dados;
  return dados.map((d, i) => ({
    ...d,
    tendencia: parseFloat((reg.intercept + reg.slope * i).toFixed(2)),
  })).concat(
    Array.from({ length: nProjecao }, (_, k) => {
      const i = dados.length + k;
      return {
        hora: `+${k + 1}`,
        pressao: null,
        tendencia: parseFloat((reg.intercept + reg.slope * i).toFixed(2)),
      };
    })
  );
}

function PremiumTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const pressao = payload.find((p) => p.dataKey === "pressao");
  const tendencia = payload.find((p) => p.dataKey === "tendencia");
  return (
    <div className="tp-chart-tooltip">
      <span className="tp-chart-tooltip__label">{label}</span>
      {pressao?.value != null && (
        <span className="tp-chart-tooltip__value">
          {pressao.value} <span className="tp-chart-tooltip__unit">PSI</span>
        </span>
      )}
      {tendencia?.value != null && (
        <span className="tp-chart-tooltip__trend">
          Tendência: {tendencia.value} PSI
        </span>
      )}
    </div>
  );
}

export default function GraficoPressao({ posicao, dados }) {
  const tendencia = calcularTendencia(dados ?? []);
  const reg = regressaoLinear(dados ?? []);
  const dadosComTendencia = projetarTendencia(dados ?? [], reg, 3);

  const corLinha = tendencia.caindo ? "var(--tp-danger)" : "var(--tp-success)";
  const gradId = `grad-${posicao?.replace(/\s+/g, "-") ?? "default"}`;

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
        <>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={dadosComTendencia} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={corLinha} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={corLinha} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke="rgba(238,240,232,0.05)" vertical={false} />
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
              {/* Área de pressão real */}
              <Area
                type="monotone"
                dataKey="pressao"
                stroke={corLinha}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 4, fill: corLinha, stroke: "var(--tp-bg-base)", strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls={false}
              />
              {/* Linha de tendência (regressão linear + projeção) */}
              {reg && (
                <Line
                  type="linear"
                  dataKey="tendencia"
                  stroke={tendencia.caindo ? "var(--tp-danger)" : "var(--tp-accent)"}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  strokeOpacity={0.65}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          {reg && (
            <p className="tp-chart-projection">
              {tendencia.caindo
                ? `Projeção: pressão pode atingir ${Math.max(0, Math.round(reg.intercept + reg.slope * (dados.length + 5)))} PSI em 5 leituras`
                : `Projeção: tendência estável em ~${Math.round(reg.intercept + reg.slope * (dados.length + 5))} PSI`
              }
            </p>
          )}
        </>
      )}
    </div>
  );
}
