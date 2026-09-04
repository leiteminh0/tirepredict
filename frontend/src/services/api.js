import axios from 'axios';

const api = axios.create({
  baseURL: 'https://tirepredict-production.up.railway.app',
});

export const listarMaquinas = () => api.get('/maquinas');
export const listarPneus = (maquinaId) => api.get(`/pneus/${maquinaId}`);
export const listarLeituras = (pneuId) => api.get(`/leituras/${pneuId}/recentes`);
export const listarAlertas = () => api.get('/alertas');
export const preverRisco = (dados) => api.post('/prever', dados);

export default api;