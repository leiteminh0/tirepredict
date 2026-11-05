import axios from 'axios';
import { formatarIdade, formatarMomento, paraMilissegundos } from '../utils/tempo';

// VITE_API_URL é obrigatório. Sem ela o build falha explicitamente em vez de
// bater silenciosamente no servidor de produção a partir de ambientes de dev.
const _baseURL = import.meta.env.VITE_API_URL;
if (!_baseURL) {
  throw new Error(
    '[TirePredict] VITE_API_URL não está configurado.\n' +
    'Copie frontend/.env.example para frontend/.env.local e defina a variável.'
  );
}

const api = axios.create({
  baseURL: _baseURL,
  timeout: 10000,
});

export const listarMaquinas = () => api.get('/maquinas');
export const listarFrotaApi = () => api.get('/frota');
export const listarPneus = (maquinaId) => api.get(`/pneus/${maquinaId}`);
export const listarLeituras = (pneuId) => api.get(`/leituras/${pneuId}/recentes`);
// maquinaId opcional — quando fornecido o backend filtra no banco (F-08).
export const listarAlertas = (maquinaId) =>
  api.get('/alertas', { params: maquinaId != null ? { maquina_id: maquinaId } : undefined });
// Rotas de escrita exigem o header X-API-Token. O token é informado pelo operador
// na tela do simulador e mantido só em sessionStorage — nunca em variável VITE_*,
// porque tudo que é VITE_* é embutido no bundle público.
const opcoesToken = (token) => (token ? { headers: { 'X-API-Token': token } } : undefined);

export const criarLeitura = (dados, token) => api.post('/leituras', dados, opcoesToken(token));
export const preverRisco = (dados) => api.post('/prever', dados);
export const simular = (dados, token) => api.post('/simular', dados, opcoesToken(token));
export const verificarSaude = () => api.get('/health');

const formatarPosicao = (posicao) => posicao.replaceAll('_', ' ');

// Reaproveita formatarIdade para a unidade (s/min/h/d) ser a mesma do card e da
// topbar, e para o timestamp sem offset ser tratado como UTC.
export const formatarTempoRelativo = (timestamp) => {
  const ms = paraMilissegundos(timestamp);
  if (!Number.isFinite(ms)) return 'sem leitura';
  const diferencaSegundos = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diferencaSegundos < 60) return 'agora';
  return `ha ${formatarIdade(diferencaSegundos)}`;
};

export async function listarFrota() {
  const { data: maquinas } = await listarFrotaApi();
  return maquinas.map((maquina) => {
    const pneus = maquina.pneus.map((pneu) => {
      const leituras = pneu.historico ?? [];
      const ultimaLeitura = pneu.ultima_leitura;
      // O rótulo do eixo é derivado no gráfico, a partir do timestamp: só assim
      // ele inclui a data quando a série atravessa dias.
      const historico = leituras.map((leitura) => ({
        pressao: leitura.pressao,
        timestamp: leitura.timestamp,
      }));
      return {
        ...pneu,
        posicao: formatarPosicao(pneu.posicao),
        pressao: ultimaLeitura?.pressao ?? null,
        temperatura: ultimaLeitura?.temperatura ?? null,
        horasUso: ultimaLeitura?.horas_uso ?? null,
        nivel: pneu.risco?.nivel ?? 'INDISPONIVEL',
        acaoRecomendada: pneu.risco?.acao_recomendada,
        historico,
        ultimaLeitura: ultimaLeitura?.timestamp ?? null,
        // Idade já calculada pelo backend (None = nunca houve leitura).
        segundosDesdeUltimaLeitura: pneu.segundos_desde_ultima_leitura ?? null,
        // Tendência linear das últimas leituras (não é o modelo de ML).
        tendencia: pneu.tendencia ?? null,
        horasAteLimite: pneu.horas_ate_limite ?? null,
      };
    });
    const timestamps = pneus
      .map((pneu) => pneu.ultimaLeitura)
      .filter(Boolean)
      .sort();
    // Timestamp bruto da leitura mais recente da máquina: o Topbar precisa dele
    // para medir a idade real do sinal — a hora formatada não permite isso.
    const ultimoTimestamp = timestamps.at(-1) ?? null;
    return {
      ...maquina,
      pneus,
      // Com data quando a leitura não é de hoje — "Atualizado 15:58" só faz
      // sentido no mesmo dia.
      ultimaLeitura: formatarMomento(ultimoTimestamp),
      ultimaLeituraTs: ultimoTimestamp,
    };
  });
}

export default api;
