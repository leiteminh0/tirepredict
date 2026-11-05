// Formatação de tempo compartilhada pelo card do pneu, pela topbar e pelas listas.

/**
 * Converte um timestamp da API em milissegundos.
 *
 * O backend grava em UTC; quando a string chega sem offset (por exemplo em
 * registros antigos), ela é tratada como UTC em vez de hora local — senão o
 * navegador desloca todas as idades exibidas.
 */
export function paraMilissegundos(instante) {
  if (!instante) return Number.NaN;
  const texto = String(instante).trim().replace(" ", "T");
  const comFuso = /[Zz]$|[+-]\d{2}:\d{2}$/.test(texto) ? texto : `${texto}Z`;
  return new Date(comFuso).getTime();
}

/** Idade em rótulo curto: "45 s", "12 min", "3 h". */
export function formatarIdade(segundos) {
  if (segundos == null) return null;
  const total = Math.max(0, Math.floor(segundos));
  if (total < 60) return `${total} s`;
  const minutos = Math.floor(total / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `${horas} h`;
}

/**
 * Momento da leitura com data quando não for de hoje: "15:58" hoje,
 * "02/10 15:58" em outro dia do mesmo ano, "02/10/2025 15:58" em outro ano.
 */
export function formatarMomento(timestamp, agora = new Date()) {
  const ms = paraMilissegundos(timestamp);
  if (!Number.isFinite(ms)) return null;

  const momento = new Date(ms);
  const hora = momento.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (momento.toDateString() === agora.toDateString()) return hora;

  const dia = momento.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  if (momento.getFullYear() === agora.getFullYear()) return `${dia} ${hora}`;
  return `${dia}/${momento.getFullYear()} ${hora}`;
}
