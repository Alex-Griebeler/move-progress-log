import { describe, expect, it } from "vitest";
import { computeAssessmentDeltas } from "../assessmentTrends";

const p = (id: string, date: string, value: number | null, createdAt?: string) => ({
  id,
  date,
  value,
  createdAt,
});

describe("computeAssessmentDeltas", () => {
  it("retorna da mais recente pra mais antiga", () => {
    const r = computeAssessmentDeltas([
      p("a", "2026-01-10", 40),
      p("c", "2026-07-10", 46),
      p("b", "2026-04-10", 43),
    ]);
    expect(r.map((x) => x.id)).toEqual(["c", "b", "a"]);
  });

  it("Δ absoluto e percentual contra a anterior", () => {
    const r = computeAssessmentDeltas([p("a", "2026-01-10", 40), p("b", "2026-04-10", 44)]);
    expect(r[0].delta).toBe(4);
    expect(r[0].deltaPercent).toBe(10);
    expect(r[0].comparedTo).toBe("2026-01-10");
  });

  it("a mais antiga não tem base → delta null", () => {
    const r = computeAssessmentDeltas([p("a", "2026-01-10", 40)]);
    expect(r[0].delta).toBeNull();
    expect(r[0].deltaPercent).toBeNull();
    expect(r[0].comparedTo).toBeNull();
  });

  it("avaliação SEM resultado é pulada como base (compara com a última válida)", () => {
    const r = computeAssessmentDeltas([
      p("a", "2026-01-10", 40),
      p("b", "2026-04-10", null), // teste abortado
      p("c", "2026-07-10", 44),
    ]);
    const c = r.find((x) => x.id === "c")!;
    expect(c.delta).toBe(4);
    expect(c.comparedTo).toBe("2026-01-10"); // NÃO a de abril
  });

  it("avaliação sem resultado não ganha delta próprio", () => {
    const r = computeAssessmentDeltas([p("a", "2026-01-10", 40), p("b", "2026-04-10", null)]);
    const b = r.find((x) => x.id === "b")!;
    expect(b.value).toBeNull();
    expect(b.delta).toBeNull();
  });

  it("queda vira delta negativo", () => {
    const r = computeAssessmentDeltas([p("a", "2026-01-10", 50), p("b", "2026-04-10", 45)]);
    expect(r[0].delta).toBe(-5);
    expect(r[0].deltaPercent).toBe(-10);
  });

  it("mesma data: desempata por created_at (ordem correta do Δ)", () => {
    const r = computeAssessmentDeltas([
      p("tarde", "2026-04-10", 44, "2026-04-10T18:00:00Z"),
      p("manha", "2026-04-10", 40, "2026-04-10T09:00:00Z"),
    ]);
    expect(r[0].id).toBe("tarde");
    expect(r[0].delta).toBe(4); // manhã → tarde, não o inverso
  });

  it("mesma data e mesmo created_at: desempata por id (determinístico)", () => {
    const a = computeAssessmentDeltas([p("z", "2026-04-10", 44), p("a", "2026-04-10", 40)]);
    const b = computeAssessmentDeltas([p("a", "2026-04-10", 40), p("z", "2026-04-10", 44)]);
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
  });

  it("base zero: Δ absoluto existe, percentual é null (nunca ∞%)", () => {
    const r = computeAssessmentDeltas([p("a", "2026-01-10", 0), p("b", "2026-04-10", 5)]);
    expect(r[0].delta).toBe(5);
    expect(r[0].deltaPercent).toBeNull();
  });

  it("valor não-finito é tratado como ausente", () => {
    const r = computeAssessmentDeltas([
      p("a", "2026-01-10", 40),
      p("b", "2026-04-10", Number.NaN),
      p("c", "2026-07-10", 42),
    ]);
    expect(r.find((x) => x.id === "b")!.value).toBeNull();
    expect(r.find((x) => x.id === "c")!.comparedTo).toBe("2026-01-10");
  });

  it("arredonda o Δ absoluto a 2 casas (evita 0.30000000000000004)", () => {
    const r = computeAssessmentDeltas([p("a", "2026-01-10", 40.1), p("b", "2026-04-10", 40.4)]);
    expect(r[0].delta).toBe(0.3);
  });

  it("avaliação ABORTADA com valor não vira base de comparação", () => {
    const r = computeAssessmentDeltas([
      { id: "a", date: "2026-01-10", value: 40, status: "completed" },
      { id: "b", date: "2026-04-10", value: 20, status: "aborted" },
      { id: "c", date: "2026-07-10", value: 44, status: "completed" },
    ]);
    const c = r.find((x) => x.id === "c")!;
    expect(c.delta).toBe(4); // vs a de janeiro, não +24 vs a abortada
    expect(c.comparedTo).toBe("2026-01-10");
  });

  it("avaliação em andamento também não é base nem ganha delta", () => {
    const r = computeAssessmentDeltas([
      { id: "a", date: "2026-01-10", value: 40, status: "completed" },
      { id: "b", date: "2026-04-10", value: 50, status: "in_progress" },
    ]);
    const b = r.find((x) => x.id === "b")!;
    expect(b.value).toBeNull();
    expect(b.delta).toBeNull();
  });

  it("sem status informado, o ponto conta (compatibilidade)", () => {
    const r = computeAssessmentDeltas([
      { id: "a", date: "2026-01-10", value: 40 },
      { id: "b", date: "2026-04-10", value: 44 },
    ]);
    expect(r[0].delta).toBe(4);
  });

  it("lista vazia não explode", () => {
    expect(computeAssessmentDeltas([])).toEqual([]);
  });

  it("não muta a lista de entrada", () => {
    const input = [p("b", "2026-04-10", 44), p("a", "2026-01-10", 40)];
    computeAssessmentDeltas(input);
    expect(input.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
