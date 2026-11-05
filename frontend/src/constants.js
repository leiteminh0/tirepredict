// Estimativa de vida útil de pneu agrícola em horas de uso.
// Fonte: referência técnica do fabricante (valor estimado para fins de monitoramento).
export const HORAS_VIDA_UTIL = 2000;

// Espelho do padrão de TELEMETRIA_VALIDADE_SEGUNDOS no backend. O valor real
// vem de GET /health (config.telemetria_validade_segundos); este é só o fallback
// enquanto a primeira resposta não chegou.
export const TELEMETRIA_VALIDADE_SEGUNDOS_PADRAO = 120;
