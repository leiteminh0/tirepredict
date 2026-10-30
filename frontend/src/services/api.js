import axios from 'axios';

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

const formatarHora = (timestamp) => {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatarTempoRelativo = (timestamp) => {
  if (!timestamp) return 'sem leitura';
  const diferencaSegundos = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (diferencaSegundos < 60) return 'agora';
  if (diferencaSegundos < 3600) return `ha ${Math.floor(diferencaSegundos / 60)} min`;
  return `ha ${Math.floor(diferencaSegundos / 3600)} h`;
};

export async function listarFrota() {
  const { data: maquinas } = await listarFrotaApi();
  return maquinas.map((maquina) => {
    const pneus = maquina.pneus.map((pneu) => {
      const leituras = pneu.historico ?? [];
      const ultimaLeitura = pneu.ultima_leitura;
      const historico = leituras.map((leitura) => ({
        hora: formatarHora(leitura.timestamp),
        pressao: leitura.pressao,
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
      ultimaLeitura: formatarHora(ultimoTimestamp),
      ultimaLeituraTs: ultimoTimestamp,
    };
  });
}

export default api;
