import {
  Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Line, ComposedChart
} from "recharts";
import { formatarHoras, resumirTendencia } from "../utils/tendencia";
import "./GraficoPressao.css";

const CORES_TENDENCIA = {
  queda: "var(--tp-danger)",
  subida: "var(--tp-warning)",
  estavel: "var(--tp-success)",
  indisponivel: "var(--tp-success)",
};

/**
 * O backend grava em UTC, então `janela_inicio`/`janela_fim` chegam com offset
 * (+00:00) e os timestamps das leituras chegam sem offset. Sem normalizar, o
 * navegador interpretaria a leitura como hora local e a reta sairia deslocada.
 */
function paraMillis(instante) {
  if (!instante) return Number.NaN;
  const texto = String(instante);
  const comFuso = /[Zz]|[+-]\d{2}:\d{2}$/.test(texto) ? texto : `${texto}Z`;
  return new Date(comFuso).getTime();
}

/**
 * Avalia a reta do backend no instante de cada leitura.
 * O ajuste (inclinação e extremos) vem pronto de /frota — aqui não há
 * regressão, só interpolação linear entre os dois pontos ancorados.
 */
function valorNaReta(timestamp, tendencia) {
  const reta = tendencia?.reta;
  if (!reta || !timestamp) return null;

  const inicio = paraMillis(tendencia.janela_inicio);
  const fim = paraMillis(tendencia.janela_fim);
  const instante = paraMillis(timestamp);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || !Number.isFinite(instante)) return null;
  // A reta descreve apenas a janela usada no ajuste; fora dela não se aplica.
  if (fim <= inicio || instante < inicio || instante > fim) return null;

  const fracao = (instante - inicio) / (fim - inicio);
  return Number((reta.em_inicio + (reta.em_fim - reta.em_inicio) * fracao).toFixed(2));
}

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

export default function GraficoPressao({ posicao, dados, tendencia }) {
  const { texto: resumoTendencia, tom } = resumirTendencia(tendencia);
  const corLinha = CORES_TENDENCIA[tom] ?? CORES_TENDENCIA.indisponivel;
  const gradId = `grad-${posicao?.replace(/\s+/g, "-") ?? "default"}`;

  const pontos = (dados ?? []).map((ponto) => ({
    ...ponto,
    reta: valorNaReta(ponto.timestamp, tendencia),
  }));

  const horasLimite = formatarHoras(tendencia?.horas_ate_limite);
  const temProjecao = tendencia?.direcao === "queda" && tendencia?.horas_ate_limite > 0;
  const nota = temProjecao
    ? `Projeção: limite de alerta em ~${horasLimite} h (tendência linear das últimas ${tendencia.amostras} leituras).`
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
