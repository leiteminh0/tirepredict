// Cadência do polling das telas de operação.
//
// A regra anterior (5 s dobrando até 60 s) deixava o painel até um minuto
// desatualizado depois de uma falha passageira: no teste de carga, a
// recuperação após um 500 levou 16 s e poderia chegar a 60 s. Agora a primeira
// falha tenta de novo em 2 s — o bastante para atravessar um blip — e o teto é
// 15 s, que é o pior tempo que um operador espera olhando a tela.

/** Intervalo do ciclo normal, sem falhas. */
export const INTERVALO_POLLING_MS = 5000;

/** Primeira tentativa depois de uma falha: rápida, de propósito. */
export const ATRASO_PRIMEIRA_FALHA_MS = 2000;

/** Teto do backoff: nenhuma espera passa disso. */
export const ATRASO_MAXIMO_MS = 15000;

/**
 * Atraso até a próxima tentativa, em milissegundos.
 *
 * `tentativas` é o número de falhas consecutivas já ocorridas:
 * 0 → 5 s (ciclo normal), 1 → 2 s, 2 → 5 s, 3 → 10 s, 4 ou mais → 15 s.
 * Valores inválidos caem no intervalo normal, para nunca travar o polling.
 */
export function calcularAtraso(tentativas) {
  if (!Number.isFinite(tentativas) || tentativas <= 0) return INTERVALO_POLLING_MS;
  if (tentativas === 1) return ATRASO_PRIMEIRA_FALHA_MS;
  const dobrado = INTERVALO_POLLING_MS * Math.pow(2, tentativas - 2);
  return Math.min(dobrado, ATRASO_MAXIMO_MS);
}
