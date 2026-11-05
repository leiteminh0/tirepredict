// O atraso do polling é o que define por quanto tempo o painel fica
// desatualizado depois de uma falha. Um teto alto demais já custou 16 s de
// tela velha no teste de carga, por isso os limites são testados aqui.
import { describe, expect, it } from "vitest";
import {
  ATRASO_MAXIMO_MS,
  ATRASO_PRIMEIRA_FALHA_MS,
  INTERVALO_POLLING_MS,
  calcularAtraso,
} from "./polling";

describe("calcularAtraso", () => {
  it("usa o intervalo normal sem falhas", () => {
    expect(calcularAtraso(0)).toBe(INTERVALO_POLLING_MS);
    expect(INTERVALO_POLLING_MS).toBe(5000);
  });

  it("tenta de novo rapidamente na primeira falha", () => {
    expect(calcularAtraso(1)).toBe(ATRASO_PRIMEIRA_FALHA_MS);
    expect(ATRASO_PRIMEIRA_FALHA_MS).toBeLessThan(INTERVALO_POLLING_MS);
  });

  it("cresce a cada falha subsequente", () => {
    expect(calcularAtraso(2)).toBe(5000);
    expect(calcularAtraso(3)).toBe(10000);
  });

  it("respeita o teto a partir da quarta falha", () => {
    expect(calcularAtraso(4)).toBe(ATRASO_MAXIMO_MS);
    expect(calcularAtraso(10)).toBe(ATRASO_MAXIMO_MS);
    expect(calcularAtraso(999)).toBe(ATRASO_MAXIMO_MS);
  });

  it("nunca passa do teto — nem do antigo limite de 60 s", () => {
    for (let tentativas = 1; tentativas <= 30; tentativas += 1) {
      expect(calcularAtraso(tentativas)).toBeLessThanOrEqual(ATRASO_MAXIMO_MS);
    }
    expect(ATRASO_MAXIMO_MS).toBeLessThan(60000);
  });

  it("mantém a sequência sem retroceder", () => {
    const sequencia = [1, 2, 3, 4, 5, 6].map(calcularAtraso);
    for (let i = 1; i < sequencia.length; i += 1) {
      expect(sequencia[i]).toBeGreaterThanOrEqual(sequencia[i - 1]);
    }
  });

  it("cai no intervalo normal com entrada inválida", () => {
    expect(calcularAtraso(-1)).toBe(INTERVALO_POLLING_MS);
    expect(calcularAtraso(null)).toBe(INTERVALO_POLLING_MS);
    expect(calcularAtraso(undefined)).toBe(INTERVALO_POLLING_MS);
    expect(calcularAtraso(Number.NaN)).toBe(INTERVALO_POLLING_MS);
    expect(calcularAtraso(Number.POSITIVE_INFINITY)).toBe(INTERVALO_POLLING_MS);
  });
});
