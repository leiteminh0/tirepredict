import {
  Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Line, ComposedChart
} from "recharts";
import { formatarHoras, resumirTendencia, valorNaReta } from "../utils/tendencia";
import { cruzaDias, formatarRotuloEixo } from "../utils/tempo";
import { LIMITE_PRESSAO_PADRAO } from "../constants";
import "./GraficoPressao.css";

const CORES_TENDENCIA = {
  queda: "var(--tp-danger)",
  subida: "var(--tp-warning)",
  estavel: "var(--tp-success)",
  indisponivel: "var(--tp-success)",
};

function IconeTendencia({ tom }) {
  if (tom === "indisponivel") return null;
  const desce = tom === "queda";
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d={desce ? "M2 3L6 9L10 3" : "M2 9L6 3L10 9"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PremiumTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const pressao = payload.find((p) => p.dataKey === "pressao");
  const reta = payload.find((p) => p.dataKey === "reta");
  return (
    <div className="tp-chart-tooltip">
      <span className="tp-chart-tooltip__label">{label}</span>
      {pressao?.value != null && (
        <span className="tp-chart-tooltip__value">
          {pressao.value} <span className="tp-chart-tooltip__unit">PSI</span>
        </span>
      )}
      {reta?.value != null && (
        <span className="tp-chart-tooltip__trend">Reta de tendência: {reta.value} PSI</span>
      )}
    </div>
  );
}

export default function GraficoPressao({
  posicao,
  dados,
  tendencia,
  limitePressao = LIMITE_PRESSAO_PADRAO,
}) {
  const { texto: resumoTendencia, tom } = resumirTendencia(tendencia);
  const corLinha = CORES_TENDENCIA[tom] ?? CORES_TENDENCIA.indisponivel;
  const gradId = `grad-${posicao?.replace(/\s+/g, "-") ?? "default"}`;

  // Série que atravessa dias precisa de data no eixo; no mesmo dia, hora basta.
  const comData = cruzaDias(dados?.[0]?.timestamp, dados?.[dados.length - 1]?.timestamp);
  const pontos = (dados ?? []).map((ponto) => ({
    ...ponto,
    rotulo: formatarRotuloEixo(ponto.timestamp, comData),
    reta: valorNaReta(ponto.timestamp, tendencia),
  }));

  // O limite vem de ALERT_PRESSURE_THRESHOLD via GET /health; o rótulo e o
  // topo do eixo acompanham para a linha de alerta nunca ficar fora de quadro.
  const limite = Number(limitePressao) || LIMITE_PRESSAO_PADRAO;
  const limiteTexto = limite.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const pressaoMaxima = pontos.reduce(
    (maior, ponto) => Math.max(maior, Number(ponto.pressao) || 0),
    0,
  );
  const topoEixo = Math.max(10, Math.ceil((Math.max(pressaoMaxima, limite) * 1.15) / 10) * 10);

  const horasLimite = formatarHoras(tendencia?.horas_ate_limite);
  const temProjecao = tendencia?.direcao === "queda" && tendencia?.horas_ate_limite > 0;
  const nota = temProjecao
    ? `Projeção: limite de alerta (${limiteTexto} PSI) em ~${horasLimite} h (tendência linear das últimas ${tendencia.amostras} leituras).`
    : tendencia?.direcao === "indisponivel"
      ? tendencia.mensagem
      : null;

  return (
    <div className="tp-chart-wrap">
      <div className="tp-chart-header">
        <div>
          <span className="tp-chart-kicker">Telemetria de pressão</span>
          <h3 className="tp-chart-title">{posicao}</h3>
        </div>
        <span className={`tp-chart-trend tp-chart-trend--${tom}`}>
          <IconeTendencia tom={tom} />
          {resumoTendencia}
        </span>
      </div>

      {pontos.length === 0 ? (
        <div className="tp-chart-empty">Nenhuma leitura disponível para este pneu.</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={pontos} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={corLinha} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={corLinha} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke="rgba(238,240,232,0.05)" vertical={false} />
              <XAxis
                dataKey="rotulo"
                stroke="transparent"
                tick={{ fill: "var(--tp-text-muted)", fontSize: 11, fontFamily: "var(--tp-font-mono)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                domain={[0, topoEixo]}
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
                y={limite}
                stroke="var(--tp-danger)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: `${limiteTexto} PSI`,
                  fill: "var(--tp-danger)",
                  fontSize: 10,
                  position: "insideTopLeft",
                  opacity: 0.7,
                }}
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
              {/* Reta de tendência calculada no backend */}
              {tendencia?.reta && (
                <Line
                  type="linear"
                  dataKey="reta"
                  stroke={corLinha}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  strokeOpacity={0.65}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          {nota && <p className="tp-chart-projection">{nota}</p>}
        </>
      )}
    </div>
  );
}
