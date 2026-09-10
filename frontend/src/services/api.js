import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://tirepredict-production.up.railway.app',
});

export const listarMaquinas = () => api.get('/maquinas');
export const listarPneus = (maquinaId) => api.get(`/pneus/${maquinaId}`);
export const listarLeituras = (pneuId) => api.get(`/leituras/${pneuId}/recentes`);
export const listarAlertas = () => api.get('/alertas');
export const criarLeitura = (dados) => api.post('/leituras', dados);
export const preverRisco = (dados) => api.post('/prever', dados);

const formatarPosicao = (posicao) => posicao.replaceAll('_', ' ');

const classificarRisco = (pressao) => {
  if (pressao == null) return 'BAIXO';
  if (pressao < 25) return 'ALTO';
  if (pressao < 30) return 'MEDIO';
  return 'BAIXO';
};

const formatarHora = (timestamp) => {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export async function listarFrota() {
  const { data: maquinas } = await listarMaquinas();

  return Promise.all(maquinas.map(async (maquina) => {
    const { data: pneus } = await listarPneus(maquina.id);
    const pneusComLeituras = await Promise.all(pneus.map(async (pneu) => {
      const { data: leituras } = await listarLeituras(pneu.id);
      const historico = [...leituras].reverse().map((leitura) => ({
        hora: formatarHora(leitura.timestamp),
        pressao: leitura.pressao,
      }));
      const ultimaLeitura = leituras[0];

      return {
        ...pneu,
        posicao: formatarPosicao(pneu.posicao),
        pressao: ultimaLeitura?.pressao ?? null,
        temperatura: ultimaLeitura?.temperatura ?? null,
        nivel: classificarRisco(ultimaLeitura?.pressao),
        historico,
        ultimaLeitura: ultimaLeitura?.timestamp ?? null,
      };
    }));

    const leituras = pneusComLeituras
      .map((pneu) => pneu.ultimaLeitura)
      .filter(Boolean)
      .sort();

    return {
      ...maquina,
      pneus: pneusComLeituras,
      ultimaLeitura: formatarHora(leituras.at(-1)),
    };
  }));
}

export default api;