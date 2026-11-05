// Texto e tom da tendência de pressão, compartilhados pelo card do pneu e pelo
// gráfico. A conta é sempre do backend (backend/tendencia.py): aqui só formatamos
// o que ele devolve, para os dois lugares nunca dizerem coisas diferentes.
import { paraMilissegundos } from "./tempo";

const formatarNumero = (valor, casas) => valor.toFixed(casas).replace(".", ",");

/** 3.5 -> "3,5"; 42.2 -> "42". */
export function formatarHoras(horas) {
  if (horas == null) return null;
  return horas < 10 ? formatarNumero(horas, 1) : String(Math.round(horas));
}

/**
 * Texto longo, usado no card do pneu.
 * `comPrefixo` mantém o "Tendência: " na frente.
 */
export function descreverTendencia(tendencia, { prefixo = false, horasAteLimite = null } = {}) {
  const horasLimite = tendencia?.horas_ate_limite ?? horasAteLimite;
  const direcao = tendencia?.direcao ?? "indisponivel";

  if (direcao === "queda" && horasLimite > 0) {
    const taxa = formatarNumero(Math.abs(tendencia.psi_por_hora ?? 0), 2);
    const texto = `queda de ${taxa} PSI/h — limite em ~${formatarHoras(horasLimite)} h`;
    return { texto: prefixo ? `Tendência: ${texto}` : texto, tom: "queda" };
  }

  return { texto: tendencia?.mensagem ?? "Tendência indisponível.", tom: direcao };
}

/** Texto curto e tom, usado no badge do gráfico. */
export function resumirTendencia(tendencia) {
  const taxa = formatarNumero(Math.abs(tendencia?.psi_por_hora ?? 0), 2);

  switch (tendencia?.direcao) {
    case "queda":
      return { texto: `Queda de ${taxa} PSI/h`, tom: "queda" };
    case "subida":
      return { texto: `Subida de ${taxa} PSI/h`, tom: "subida" };
    case "estavel":
      return { texto: "Pressão estável", tom: "estavel" };
    default:
      return { texto: "Tendência indisponível", tom: "indisponivel" };
  }
}

/**
 * Valor da reta de tendência em um instante, em PSI.
 *
 * O ajuste (inclinação e os dois extremos da janela) vem pronto de /frota; aqui
 * não há regressão, só interpolação linear entre `reta.em_inicio` e `reta.em_fim`.
 * A reta descreve apenas a janela usada no ajuste — fora dela devolve null, para
 * o gráfico não prolongar uma tendência que não foi calculada.
 */
export function valorNaReta(timestamp, tendencia) {
  const reta = tendencia?.reta;
  if (!reta || !timestamp) return null;

  const inicio = paraMilissegundos(tendencia.janela_inicio);
  const fim = paraMilissegundos(tendencia.janela_fim);
  const instante = paraMilissegundos(timestamp);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || !Number.isFinite(instante)) return null;
  if (fim <= inicio || instante < inicio || instante > fim) return null;

  const fracao = (instante - inicio) / (fim - inicio);
  return Number((reta.em_inicio + (reta.em_fim - reta.em_inicio) * fracao).toFixed(2));
}
