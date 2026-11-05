// Formatação de idade de leitura usada pelo card do pneu e pela topbar.
// Recebe segundos e devolve rótulo curto: "45 s", "12 min", "3 h".

export function formatarIdade(segundos) {
  if (segundos == null) return null;
  const total = Math.max(0, Math.floor(segundos));
  if (total < 60) return `${total} s`;
  const minutos = Math.floor(total / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `${horas} h`;
}
