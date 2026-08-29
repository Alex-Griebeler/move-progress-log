import { describe, expect, it } from "vitest";
import { hasPainSignal, hasTechniqueSignal } from "@/hooks/useLoadSuggestions";

describe("sinais de guardrail com negação (auditoria 29/08)", () => {
  it("menção negada NÃO dispara o guardrail", () => {
    expect(hasPainSignal("Sem dor, executou completo")).toBe(false);
    expect(hasPainSignal("Nenhum desconforto relatado")).toBe(false);
    expect(hasPainSignal("Não sentiu dor hoje")).toBe(false);
    expect(hasPainSignal("Dor resolvida desde a semana passada")).toBe(false);
    expect(hasTechniqueSignal("sem compensação lombar")).toBe(false);
    // Menção NEUTRA/positiva a técnica não é sinal (R7): "técnica
    // excelente" bloqueava progressão.
    expect(hasTechniqueSignal("Técnica sem instabilidade")).toBe(false);
    expect(hasTechniqueSignal("Técnica excelente hoje")).toBe(false);
  });

  it("menção afirmativa dispara", () => {
    expect(hasPainSignal("Relatou dor no ombro na 3ª série")).toBe(true);
    expect(hasPainSignal("desconforto no punho")).toBe(true);
    expect(hasTechniqueSignal("compensação de tronco no agachamento")).toBe(true);
    expect(hasTechniqueSignal("técnica ruim nas últimas séries")).toBe(true);
    expect(hasTechniqueSignal("quebra de técnica na 3ª série")).toBe(true);
  });

  it("frase mista mantém o sinal (direção segura)", () => {
    // "sem dor no joelho, mas dor no quadril" — a parte negada some, a
    // afirmativa fica.
    expect(hasPainSignal("Sem dor no joelho, mas dor leve no quadril")).toBe(true);
  });

  it("vazio/null não dispara", () => {
    expect(hasPainSignal(null)).toBe(false);
    expect(hasPainSignal("")).toBe(false);
  });
});
