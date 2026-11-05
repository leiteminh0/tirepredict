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

/**
 * Idade em rótulo curto: "45 s", "12 min", "3 h", "34 d".
 *
 * Acima de 48 h a contagem em horas deixa de ser legível ("818 h"), então
 * passa para dias — mesmo limite usado para considerar o dado antigo.
 */
export function formatarIdade(segundos) {
  if (segundos == null) return null;
  const total = Math.max(0, Math.floor(segundos));
  if (total < 60) return `${total} s`;
  const minutos = Math.floor(total / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 48) return `${horas} h`;
  return `${Math.floor(horas / 24)} d`;
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

/** Rótulo do eixo do gráfico: "15:58" ou, quando a série cruza dias, "02/10 15:58". */
export function formatarRotuloEixo(timestamp, comData = false) {
  const ms = paraMilissegundos(timestamp);
  if (!Number.isFinite(ms)) return "";

  const momento = new Date(ms);
  const hora = momento.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (!comData) return hora;

  const dia = momento.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${dia} ${hora}`;
}

/** True quando primeiro e último instante caem em dias locais diferentes. */
export function cruzaDias(inicio, fim) {
  const a = paraMilissegundos(inicio);
  const b = paraMilissegundos(fim);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return new Date(a).toDateString() !== new Date(b).toDateString();
}
