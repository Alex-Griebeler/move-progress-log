import { describe, expect, it } from "vitest";
import { attentionWeight, sortStudents, type AttentionSignals } from "@/utils/studentsAttention";

const none: AttentionSignals = { zone: null, inactive7d: false, highSeverityObservations: 0, openObservations: 0 };

describe("ordenação 'precisa de atenção' da lista de alunos", () => {
  const students = [
    { id: "a", name: "Ana" },
    { id: "b", name: "Bruna" },
    { id: "c", name: "Célia" },
    { id: "d", name: "Débora" },
  ];
  const signals: Record<string, AttentionSignals> = {
    a: { ...none, zone: "alta" },
    b: { ...none, inactive7d: true },
    c: { ...none, zone: "baixa" },
    d: { ...none, zone: "media" },
  };

  it("leitura baixa de hoje vem antes de tudo; depois 7+ dias sem treino; depois faixa média", () => {
    const sorted = sortStudents(students, "attention", (s) => signals[s.id]);
    expect(sorted.map((s) => s.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("modo A–Z ignora os sinais e usa ordem alfabética pt-BR", () => {
    const sorted = sortStudents([...students].reverse(), "alpha", (s) => signals[s.id]);
    expect(sorted.map((s) => s.name)).toEqual(["Ana", "Bruna", "Célia", "Débora"]);
  });

  it("empate de peso desempata por nome, sem acento pesar", () => {
    const sorted = sortStudents(
      [{ id: "1", name: "Érica" }, { id: "2", name: "Eduarda" }],
      "attention",
      () => none,
    );
    expect(sorted.map((s) => s.name)).toEqual(["Eduarda", "Érica"]);
  });

  it("observação de severidade alta pesa mais que faixa média", () => {
    expect(attentionWeight({ ...none, highSeverityObservations: 1 })).toBeGreaterThan(
      attentionWeight({ ...none, zone: "media" }),
    );
  });

  it("não muta a lista original", () => {
    const original = [...students];
    sortStudents(students, "attention", (s) => signals[s.id]);
    expect(students).toEqual(original);
  });
});
