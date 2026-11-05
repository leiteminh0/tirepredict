// Testes dos textos de tendência. A conta (inclinação, projeção) é do backend
// em backend/tendencia.py; o que se testa aqui é o contrato de exibição: o card
// e o gráfico nunca podem dizer coisas diferentes para o mesmo objeto.
import { describe, expect, it } from "vitest";
import { descreverTendencia, formatarHoras, resumirTendencia } from "./tendencia";

const queda = {
  direcao: "queda",
  psi_por_hora: -1.5,
  horas_ate_limite: 6,
  amostras: 10,
  mensagem: "Queda de 1.50 PSI/h; limite em ~6 h.",
};

describe("formatarHoras", () => {
  it("usa uma casa decimal com vírgula abaixo de 10 h", () => {
    expect(formatarHoras(3.5)).toBe("3,5");
    expect(formatarHoras(6)).toBe("6,0");
    expect(formatarHoras(9.94)).toBe("9,9");
  });

  it("arredonda para inteiro a partir de 10 h", () => {
    expect(formatarHoras(10)).toBe("10");
    expect(formatarHoras(42.2)).toBe("42");
    expect(formatarHoras(119.6)).toBe("120");
  });

  it("devolve null sem valor", () => {
    expect(formatarHoras(null)).toBeNull();
    expect(formatarHoras(undefined)).toBeNull();
  });
});

describe("descreverTendencia", () => {
  it("descreve queda com taxa e projeção do limite", () => {
    const { texto, tom } = descreverTendencia(queda);
    expect(texto).toBe("queda de 1,50 PSI/h — limite em ~6,0 h");
    expect(tom).toBe("queda");
  });

  it("prefixa com 'Tendência:' no card", () => {
    const { texto } = descreverTendencia(queda, { prefixo: true });
    expect(texto).toBe("Tendência: queda de 1,50 PSI/h — limite em ~6,0 h");
  });

  it("usa horasAteLimite do card quando a tendência não traz a projeção", () => {
    const semProjecao = { direcao: "queda", psi_por_hora: -2, horas_ate_limite: null };
    const { texto, tom } = descreverTendencia(semProjecao, { horasAteLimite: 12 });
    expect(texto).toBe("queda de 2,00 PSI/h — limite em ~12 h");
    expect(tom).toBe("queda");
  });

  it("cai na mensagem do backend quando a pressão já está abaixo do limite", () => {
    // horas_ate_limite zero significa "já abaixo": não há projeção a exibir.
    const { texto, tom } = descreverTendencia({ ...queda, horas_ate_limite: 0 });
    expect(texto).toBe(queda.mensagem);
    expect(tom).toBe("queda");
  });

  it("repassa a mensagem nos estados estável e de subida", () => {
    const estavel = { direcao: "estavel", psi_por_hora: 0.2, horas_ate_limite: null, mensagem: "Pressão estável nas últimas leituras." };
    expect(descreverTendencia(estavel)).toEqual({ texto: estavel.mensagem, tom: "estavel" });

    const subida = { direcao: "subida", psi_por_hora: 0.9, horas_ate_limite: null, mensagem: "Pressão em elevação." };
    expect(descreverTendencia(subida)).toEqual({ texto: subida.mensagem, tom: "subida" });
  });

  it("tem texto de fallback quando não há tendência", () => {
    expect(descreverTendencia(null)).toEqual({ texto: "Tendência indisponível.", tom: "indisponivel" });
  });
});

describe("resumirTendencia", () => {
  it("resume queda com a taxa em módulo", () => {
    expect(resumirTendencia(queda)).toEqual({ texto: "Queda de 1,50 PSI/h", tom: "queda" });
  });

  it("resume subida com a taxa em módulo", () => {
    const subida = { direcao: "subida", psi_por_hora: 0.84 };
    expect(resumirTendencia(subida)).toEqual({ texto: "Subida de 0,84 PSI/h", tom: "subida" });
  });

  it("resume estabilidade sem taxa", () => {
    expect(resumirTendencia({ direcao: "estavel", psi_por_hora: 0.1 })).toEqual({
      texto: "Pressão estável",
      tom: "estavel",
    });
  });

  it("resume indisponibilidade para dados ausentes ou insuficientes", () => {
    expect(resumirTendencia(null)).toEqual({ texto: "Tendência indisponível", tom: "indisponivel" });
    expect(resumirTendencia({ direcao: "indisponivel", mensagem: "Dados insuficientes." })).toEqual({
      texto: "Tendência indisponível",
      tom: "indisponivel",
    });
  });
});
