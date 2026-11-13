// Testes das mensagens da tela de login. O que se garante aqui é que cada falha
// do /auth/verificar produz uma mensagem diferente: o sintoma que originou tudo
// foi justamente uma causa (CORS) escondida atrás de "não foi possível conectar".
import { describe, expect, it } from "vitest";
import { mensagemDeErroLogin, sessaoDeveSerEncerrada } from "./login";

const comStatus = (status) => ({ response: { status } });

describe("mensagemDeErroLogin", () => {
  it("explica token recusado", () => {
    expect(mensagemDeErroLogin(comStatus(401))).toBe(
      "Token inválido. Confira o valor e tente novamente."
    );
  });

  it("explica servidor sem token configurado", () => {
    const mensagem = mensagemDeErroLogin(comStatus(503));
    expect(mensagem).toContain("WRITE_API_TOKEN");
    expect(mensagem).not.toContain("conectar");
  });

  it("avisa quando o endpoint de verificação não existe", () => {
    expect(mensagemDeErroLogin(comStatus(404))).toContain("Atualize o backend");
  });

  it("trata estouro de tempo da requisição", () => {
    expect(mensagemDeErroLogin({ code: "ECONNABORTED" })).toContain("demorou demais");
  });

  it("usa a mensagem de conexão quando não há resposta", () => {
    const esperada = "Não foi possível conectar à API. Verifique se o backend está rodando.";
    expect(mensagemDeErroLogin(new Error("Network Error"))).toBe(esperada);
    expect(mensagemDeErroLogin(null)).toBe(esperada);
    expect(mensagemDeErroLogin(undefined)).toBe(esperada);
  });

  it("não confunde erro 500 com token inválido", () => {
    const mensagem = mensagemDeErroLogin(comStatus(500));
    expect(mensagem).not.toContain("Token inválido");
    expect(mensagem).toContain("Não foi possível conectar");
  });
});

describe("sessaoDeveSerEncerrada", () => {
  it("encerra quando o token é recusado", () => {
    expect(sessaoDeveSerEncerrada(comStatus(401))).toBe(true);
  });

  it("encerra quando o servidor está sem token configurado", () => {
    expect(sessaoDeveSerEncerrada(comStatus(503))).toBe(true);
  });

  it("preserva a sessão em falha de rede", () => {
    expect(sessaoDeveSerEncerrada(new Error("Network Error"))).toBe(false);
    expect(sessaoDeveSerEncerrada({ code: "ECONNABORTED" })).toBe(false);
    expect(sessaoDeveSerEncerrada(null)).toBe(false);
  });

  it("preserva a sessão em erro de servidor", () => {
    // 500 é falha do backend, não recusa do token: derrubar a sessão aqui
    // obrigaria o operador a digitar de novo por nada.
    expect(sessaoDeveSerEncerrada(comStatus(500))).toBe(false);
  });
});
