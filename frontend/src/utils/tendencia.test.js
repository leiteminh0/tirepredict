// Testes dos textos de tendência. A conta (inclinação, projeção) é do backend
// em backend/tendencia.py; o que se testa aqui é o contrato de exibição: o card
// e o gráfico nunca podem dizer coisas diferentes para o mesmo objeto.
import { describe, expect, it } from "vitest";
import { descreverTendencia, formatarHoras, resumirTendencia, valorNaReta } from "./tendencia";

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

// Janela de 3 h em queda: reta ancorada em 30,4 PSI no início e 28,0 PSI no fim.
const janelaQueda = {
  direcao: "queda",
  reta: { em_inicio: 30.4, em_fim: 28 },
  janela_inicio: "2026-11-05T12:00:00Z",
  janela_fim: "2026-11-05T15:00:00Z",
};

describe("valorNaReta", () => {
  it("devolve exatamente os extremos ancorados pelo backend", () => {
    expect(valorNaReta("2026-11-05T12:00:00Z", janelaQueda)).toBe(30.4);
    expect(valorNaReta("2026-11-05T15:00:00Z", janelaQueda)).toBe(28);
  });

  it("interpola linearmente dentro da janela", () => {
    // Um terço da janela: 30,4 - (2,4 / 3) = 29,6.
    expect(valorNaReta("2026-11-05T13:00:00Z", janelaQueda)).toBe(29.6);
    // Metade: 30,4 - 1,2 = 29,2.
    expect(valorNaReta("2026-11-05T13:30:00Z", janelaQueda)).toBe(29.2);
  });

  it("arredonda o valor interpolado em duas casas", () => {
    const reta = {
      reta: { em_inicio: 30, em_fim: 28 },
      janela_inicio: "2026-11-05T12:00:00Z",
      janela_fim: "2026-11-05T15:00:00Z",
    };
    // 30 - 2/3 = 29,3333... -> 29.33
    expect(valorNaReta("2026-11-05T13:00:00Z", reta)).toBe(29.33);
  });

  it("não projeta a reta fora da janela do ajuste", () => {
    expect(valorNaReta("2026-11-05T11:59:00Z", janelaQueda)).toBeNull();
    expect(valorNaReta("2026-11-05T15:01:00Z", janelaQueda)).toBeNull();
  });

  it("acompanha o sentido da tendência", () => {
    const subida = { ...janelaQueda, reta: { em_inicio: 28, em_fim: 30.4 } };
    const inicioQueda = valorNaReta("2026-11-05T12:00:00Z", janelaQueda);
    const fimQueda = valorNaReta("2026-11-05T15:00:00Z", janelaQueda);
    const inicioSubida = valorNaReta("2026-11-05T12:00:00Z", subida);
    const fimSubida = valorNaReta("2026-11-05T15:00:00Z", subida);

    expect(fimQueda).toBeLessThan(inicioQueda);
    expect(fimSubida).toBeGreaterThan(inicioSubida);
  });

  it("devolve null quando a janela é degenerada ou inválida", () => {
    const invertida = {
      ...janelaQueda,
      janela_inicio: "2026-11-05T15:00:00Z",
      janela_fim: "2026-11-05T12:00:00Z",
    };
    expect(valorNaReta("2026-11-05T13:00:00Z", invertida)).toBeNull();

    const semInicio = { ...janelaQueda, janela_inicio: null };
    expect(valorNaReta("2026-11-05T13:00:00Z", semInicio)).toBeNull();
  });

  it("devolve null sem reta, sem instante ou com instante inválido", () => {
    expect(valorNaReta(null, janelaQueda)).toBeNull();
    expect(valorNaReta("2026-11-05T13:00:00Z", null)).toBeNull();
    expect(valorNaReta("2026-11-05T13:00:00Z", { direcao: "estavel" })).toBeNull();
    expect(valorNaReta("nao e uma data", janelaQueda)).toBeNull();
  });
});
