// Testes das regras de tempo compartilhadas pelo card, pela topbar, pelas listas
// e pelo eixo do gráfico. São exatamente as funções que já causaram deslocamento
// de fuso e rótulo errado ao cruzar dias, por isso a checagem é explícita.
//
// Os instantes são afirmados em epoch (UTC), então o resultado não depende do
// fuso da máquina: CI roda em UTC, o desenvolvimento aqui roda em UTC-3.
import { describe, expect, it } from "vitest";
import {
  cruzaDias,
  formatarIdade,
  formatarMomento,
  formatarRotuloEixo,
  paraMilissegundos,
} from "./tempo";

const horaLocal = (instante) =>
  new Date(instante).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const diaMesLocal = (instante) =>
  new Date(instante).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

describe("paraMilissegundos", () => {
  it("lê string com Z como UTC", () => {
    expect(paraMilissegundos("2026-11-05T13:22:09Z")).toBe(Date.UTC(2026, 10, 5, 13, 22, 9));
  });

  it("lê string sem fuso como UTC, e não como hora local", () => {
    // Este é o bug que deslocava toda idade exibida: sem o Z, o navegador
    // assumia hora local e a leitura parecia 3 h mais nova.
    expect(paraMilissegundos("2026-11-05T13:22:09")).toBe(Date.UTC(2026, 10, 5, 13, 22, 9));
  });

  it("aceita o separador de espaço devolvido pelo SQLite", () => {
    expect(paraMilissegundos("2026-11-05 13:22:09")).toBe(Date.UTC(2026, 10, 5, 13, 22, 9));
  });

  it("respeita offset explícito", () => {
    // 10:22:09 em UTC-3 é 13:22:09 UTC.
    expect(paraMilissegundos("2026-11-05T10:22:09-03:00")).toBe(Date.UTC(2026, 10, 5, 13, 22, 9));
  });

  it("devolve NaN quando não há instante válido", () => {
    expect(paraMilissegundos(null)).toBeNaN();
    expect(paraMilissegundos(undefined)).toBeNaN();
    expect(paraMilissegundos("")).toBeNaN();
    expect(paraMilissegundos("nao e uma data")).toBeNaN();
  });
});

describe("formatarIdade", () => {
  it("usa segundos abaixo de um minuto", () => {
    expect(formatarIdade(0)).toBe("0 s");
    expect(formatarIdade(45)).toBe("45 s");
    expect(formatarIdade(59)).toBe("59 s");
  });

  it("usa minutos entre um minuto e uma hora", () => {
    expect(formatarIdade(60)).toBe("1 min");
    expect(formatarIdade(3599)).toBe("59 min");
  });

  it("usa horas até 48 h", () => {
    expect(formatarIdade(3600)).toBe("1 h");
    expect(formatarIdade(172799)).toBe("47 h");
  });

  it("passa para dias a partir de 48 h", () => {
    // Sem isso o painel mostrava "818 h" para uma leitura de mês passado.
    expect(formatarIdade(172800)).toBe("2 d");
    expect(formatarIdade(86400 * 34)).toBe("34 d");
  });

  it("trata ausência e valores negativos", () => {
    expect(formatarIdade(null)).toBeNull();
    expect(formatarIdade(undefined)).toBeNull();
    expect(formatarIdade(-30)).toBe("0 s");
  });
});

describe("formatarMomento", () => {
  const instante = "2026-11-05T12:00:00Z";

  it("mostra só a hora quando é do mesmo dia", () => {
    const texto = formatarMomento(instante, new Date(instante));
    expect(texto).toMatch(/^\d{2}:\d{2}$/);
    expect(texto).toBe(horaLocal(instante));
  });

  it("mostra dia e mês quando é de outro dia do mesmo ano", () => {
    const texto = formatarMomento(instante, new Date("2026-11-08T12:00:00Z"));
    expect(texto).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/);
    expect(texto).toContain(diaMesLocal(instante));
    expect(texto).toContain(horaLocal(instante));
  });

  it("mostra o ano quando é de outro ano", () => {
    const texto = formatarMomento("2024-03-10T12:00:00Z", new Date(instante));
    expect(texto).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    expect(texto).toContain("2024");
    expect(texto).toContain(diaMesLocal("2024-03-10T12:00:00Z"));
  });

  it("devolve null para instante inválido", () => {
    expect(formatarMomento(null)).toBeNull();
    expect(formatarMomento("nao e uma data")).toBeNull();
  });
});

describe("formatarRotuloEixo", () => {
  const instante = "2026-11-05T12:00:00Z";

  it("usa só a hora quando a série está no mesmo dia", () => {
    expect(formatarRotuloEixo(instante)).toBe(horaLocal(instante));
  });

  it("inclui a data quando a série cruza dias", () => {
    const texto = formatarRotuloEixo(instante, true);
    expect(texto).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/);
    expect(texto).toContain(diaMesLocal(instante));
  });

  it("devolve string vazia para instante inválido", () => {
    expect(formatarRotuloEixo(null)).toBe("");
    expect(formatarRotuloEixo("nao e uma data", true)).toBe("");
  });
});

describe("cruzaDias", () => {
  it("é falso quando os dois instantes caem no mesmo dia", () => {
    expect(cruzaDias("2026-11-05T12:00:00Z", "2026-11-05T14:00:00Z")).toBe(false);
  });

  it("é verdadeiro quando os instantes estão em dias diferentes", () => {
    // 24 h de separação em relação a um horário de meio-dia UTC garante dias
    // distintos em qualquer fuso relevante.
    expect(cruzaDias("2026-11-05T12:00:00Z", "2026-11-06T12:00:00Z")).toBe(true);
    expect(cruzaDias("2026-10-02T12:00:00Z", "2026-11-05T12:00:00Z")).toBe(true);
  });

  it("é falso quando algum dos instantes é inválido", () => {
    expect(cruzaDias(null, "2026-11-06T12:00:00Z")).toBe(false);
    expect(cruzaDias("2026-11-05T12:00:00Z", "nao e uma data")).toBe(false);
  });
});
