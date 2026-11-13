// Tradução da falha de validação do token em mensagem para a tela de login.
//
// Fica fora do componente de propósito: o Vitest do projeto roda em ambiente Node,
// sem DOM, então a regra precisa ser uma função pura para ser testada. Antes disto
// o Login engolia qualquer erro em "não foi possível conectar", inclusive o 401 de
// token inválido — foi assim que a causa real do problema de CORS ficou escondida.

/** Status HTTP devolvido pela API, quando houve resposta. */
const statusDaResposta = (erro) => erro?.response?.status;

/**
 * Mensagem exibida abaixo do campo quando o login falha.
 * Sempre devolve texto: a tela nunca fica muda depois de um erro.
 */
export function mensagemDeErroLogin(erro) {
  const status = statusDaResposta(erro);

  if (status === 401) return "Token inválido. Confira o valor e tente novamente.";
  if (status === 503) return "Servidor sem token de escrita configurado (WRITE_API_TOKEN).";
  if (status === 404) return "Endpoint de verificação indisponível. Atualize o backend.";
  if (erro?.code === "ECONNABORTED") return "A API demorou demais para responder. Tente de novo.";
  return "Não foi possível conectar à API. Verifique se o backend está rodando.";
}

/**
 * A sessão guardada deve ser encerrada quando o app revalida o token?
 *
 * Sim para 401 (token recusado) e 503 (servidor sem token configurado): nos dois
 * casos o token guardado não serve para escrever nada. Não para falha de rede ou
 * timeout — perder a sessão por um blip obrigaria o operador a digitar o token de
 * novo sem que ele tenha mudado.
 */
export function sessaoDeveSerEncerrada(erro) {
  const status = statusDaResposta(erro);
  return status === 401 || status === 503;
}
