import { describe, expect, it } from "vitest";
import {
  computeLoadSuggestions,
  type AssignmentRowLite,
  type LibraryRowLite,
  type LoadSuggestionDeps,
  type PlanRowLite,
  type SessionRowLite,
} from "@/hooks/useLoadSuggestions";
import type { TrainingRecommendation } from "@/hooks/useTrainingRecommendation";

const rec = (overrides: Partial<TrainingRecommendation> = {}): TrainingRecommendation =>
  ({
    trainingType: "Treino Normal Completo", intensity: "x", duration: "x",
    recoveryScore: 80, zone: "green", fatigueLevel: "low",
    loadDecision: "maintain", loadAdjustmentPercent: 0, overrideApplied: false,
    reason: "", alerts: [], confidence: 80, emoji: "🟢",
    evaluatedRules: [], skippedRules: [],
    ...overrides,
  }) as TrainingRecommendation;

const today = new Date().toISOString().slice(0, 10);

const vigente = (id: string, name = `Plano ${id}`, adaptations: unknown = null): AssignmentRowLite => ({
  prescription_id: id,
  start_date: "2020-01-01",
  end_date: null,
  custom_adaptations: adaptations,
  prescription: { name },
});

const libRow = (id: string, overrides: Partial<LibraryRowLite> = {}): LibraryRowLite => ({
  id, name: `Exercício ${id}`, category: "forca", equipment_required: ["barra"],
  min_increment_kg: null, ...overrides,
});

const sessionRow = (exercises: Array<Record<string, unknown>>): SessionRowLite => ({
  id: "s1", date: today, created_at: `${today}T10:00:00Z`, prescription_id: null, exercises,
});

const deps = (over: Partial<{
  assignments: { data: AssignmentRowLite[] | null; error: unknown };
  plan: { data: PlanRowLite[] | null; error: unknown };
  sessions: { data: SessionRowLite[] | null; error: unknown };
  library: { data: LibraryRowLite[] | null; error: unknown };
}> = {}): LoadSuggestionDeps => ({
  fetchAssignments: async () => over.assignments ?? { data: [], error: null },
  fetchPlan: async () => over.plan ?? { data: [], error: null },
  fetchSessions: async () => over.sessions ?? { data: [], error: null },
  fetchLibrary: async () => over.library ?? { data: [], error: null },
});

describe("máquina de modos (R8c — comportamental, fetchers injetados)", () => {
  it("erro nas atribuições → suspended ANTES de tudo (nunca fallback)", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: { data: null, error: { message: "boom" } },
    }));
    expect(r.mode).toBe("suspended");
    expect(r.items).toHaveLength(0);
  });

  it("zero vigentes → fallback_recent com motivo visível", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps());
    expect(r.mode).toBe("fallback_recent");
    expect(r.fallbackReason).toMatch(/sem prescrição vigente/);
  });

  it("1 vigente → modo prescription automático, com nome e id", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: { data: [vigente("p1", "Força A")], error: null },
      plan: { data: [{ exercise_library_id: "e1", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e1")], error: null },
    }));
    expect(r.mode).toBe("prescription");
    expect(r.prescriptionId).toBe("p1");
    expect(r.prescriptionName).toBe("Força A");
  });

  it("2 vigentes sem escolha → selection_required (sem escolha silenciosa)", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: { data: [vigente("p1"), vigente("p2")], error: null },
    }));
    expect(r.mode).toBe("selection_required");
    expect(r.availablePrescriptions.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(r.items).toHaveLength(0);
  });

  it("2 vigentes com escolha VÁLIDA → prescription; escolha INVÁLIDA → selection_required", async () => {
    const base = {
      assignments: { data: [vigente("p1"), vigente("p2")], error: null },
      plan: { data: [{ exercise_library_id: "e1", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e1")], error: null },
    };
    const ok = await computeLoadSuggestions("a1", rec(), "p2", deps(base));
    expect(ok.mode).toBe("prescription");
    expect(ok.prescriptionId).toBe("p2");
    const stale = await computeLoadSuggestions("a1", rec(), "p-de-outra-aluna", deps(base));
    expect(stale.mode).toBe("selection_required");
  });

  it("duas vigentes da MESMA prescrição não são escolha real (dedupe)", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: {
        data: [vigente("p1"), { ...vigente("p1"), start_date: "2021-01-01" }],
        error: null,
      },
      plan: { data: [{ exercise_library_id: "e1", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e1")], error: null },
    }));
    expect(r.mode).toBe("prescription");
    expect(r.prescriptionId).toBe("p1");
  });

  it("atribuição expirada/futura NÃO é vigente", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: {
        data: [
          { ...vigente("p1"), end_date: "2020-02-01" },
          { ...vigente("p2"), start_date: "2099-01-01" },
        ],
        error: null,
      },
    }));
    expect(r.mode).toBe("fallback_recent");
  });

  it("erro no PLANO → suspended (não fallback)", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: { data: [vigente("p1")], error: null },
      plan: { data: null, error: { message: "boom" } },
    }));
    expect(r.mode).toBe("suspended");
  });

  it("plano: ordem preservada, should_track=false fora, repetido 1ª ocorrência, mobilidade fora", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: { data: [vigente("p1")], error: null },
      plan: {
        data: [
          { exercise_library_id: "e2", order_index: 1, should_track: true },
          { exercise_library_id: "e1", order_index: 2, should_track: true },
          { exercise_library_id: "e3", order_index: 3, should_track: false },
          { exercise_library_id: "e2", order_index: 4, should_track: true },
          { exercise_library_id: "e4", order_index: 5, should_track: true },
        ],
        error: null,
      },
      library: {
        data: [libRow("e1"), libRow("e2"), libRow("e3"), libRow("e4", { category: "mobilidade" })],
        error: null,
      },
    }));
    expect(r.items.map((i) => i.key)).toEqual(["id:e2", "id:e1"]);
  });

  it("exercício do plano sem histórico → 'Primeira execução' (insufficient, sem número)", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: { data: [vigente("p1")], error: null },
      plan: { data: [{ exercise_library_id: "e1", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e1")], error: null },
    }));
    expect(r.items[0].status).toBe("insufficient");
    expect(r.items[0].ruleApplied).toMatch(/Primeira execução/);
    expect(r.items[0].suggestedLoadKg).toBeNull();
  });

  it("histórico alimenta a referência e o incremento CADASTRADO vence a heurística", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: { data: [vigente("p1")], error: null },
      plan: { data: [{ exercise_library_id: "e1", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e1", { min_increment_kg: 4 })], error: null },
      sessions: {
        data: [sessionRow([{ exercise_library_id: "e1", exercise_name: "Ex 1", load_kg: 40, reps: 8, observations: null }])],
        error: null,
      },
    }));
    expect(r.items[0].referenceLoadKg).toBe(40);
    expect(r.items[0].incrementKg).toBe(4);
    expect(r.items[0].incrementSource).toBe("cadastrado");
    // sem cadastro, "barra" → 2.5 inferido
    const inferred = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: { data: [vigente("p1")], error: null },
      plan: { data: [{ exercise_library_id: "e1", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e1")], error: null },
    }));
    expect(inferred.items[0].incrementSource).toBe("inferido");
    expect(inferred.items[0].incrementKg).toBe(2.5);
  });

  it("adaptação SEM campos interpretáveis → item explícito sem carga (nunca a do exercício-base)", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: {
        data: [vigente("p1", "Plano", [{ exercise_library_id: "e1", adaptation_type: "substituicao" }])],
        error: null,
      },
      plan: { data: [{ exercise_library_id: "e1", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e1")], error: null },
      sessions: {
        data: [sessionRow([{ exercise_library_id: "e1", exercise_name: "Ex 1", load_kg: 40, reps: 8, observations: null }])],
        error: null,
      },
    }));
    expect(r.items[0].suggestedLoadKg).toBeNull();
    expect(r.items[0].status).toBe("suspended");
    expect(r.items[0].ruleApplied).toMatch(/substituíd/);
  });

  it("substituição COM reps preenchidas AINDA suspende (carga do base não vale pro trocado)", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: {
        data: [vigente("p1", "Plano", [{ exercise_library_id: "e1", adaptation_type: "Substituição", reps: "10" }])],
        error: null,
      },
      plan: { data: [{ exercise_library_id: "e1", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e1")], error: null },
      sessions: {
        data: [sessionRow([{ exercise_library_id: "e1", exercise_name: "Ex 1", load_kg: 40, reps: 8, observations: null }])],
        error: null,
      },
    }));
    expect(r.items[0].suggestedLoadKg).toBeNull();
    expect(r.items[0].status).toBe("suspended");
  });

  it("adaptação com strings VAZIAS não conta como interpretável → suspende", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: {
        data: [vigente("p1", "Plano", [{ exercise_library_id: "e1", adaptation_type: "ajuste", reps: "", sets: "  " }])],
        error: null,
      },
      plan: { data: [{ exercise_library_id: "e1", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e1")], error: null },
      sessions: {
        data: [sessionRow([{ exercise_library_id: "e1", exercise_name: "Ex 1", load_kg: 40, reps: 8, observations: null }])],
        error: null,
      },
    }));
    expect(r.items[0].status).toBe("suspended");
    expect(r.items[0].suggestedLoadKg).toBeNull();
  });

  it("adaptação COM campos (reps ajustadas) → sugere normalmente com nota", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: {
        data: [vigente("p1", "Plano", [{ exercise_library_id: "e1", adaptation_type: "ajuste", reps: "10-12" }])],
        error: null,
      },
      plan: { data: [{ exercise_library_id: "e1", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e1")], error: null },
      sessions: {
        data: [sessionRow([{ exercise_library_id: "e1", exercise_name: "Ex 1", load_kg: 40, reps: 8, observations: null }])],
        error: null,
      },
    }));
    expect(r.items[0].suggestedLoadKg).toBe(40);
    expect(r.items[0].guardrails.join(" ")).toMatch(/Adaptação individual/);
  });

  it("agenda adaptada (objeto) → nota no nível do plano", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: {
        data: [vigente("p1", "Plano", { weekdays: ["monday"], time: "08:00" })],
        error: null,
      },
      plan: { data: [{ exercise_library_id: "e1", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e1")], error: null },
      sessions: {
        data: [sessionRow([{ exercise_library_id: "e1", exercise_name: "Ex 1", load_kg: 40, reps: 8, observations: null }])],
        error: null,
      },
    }));
    expect(r.fallbackReason).toMatch(/agenda adaptada/);
  });

  it("plano vigente sem exercício de força rastreável → motivo específico (não 'sem histórico')", async () => {
    const r = await computeLoadSuggestions("a1", rec(), null, deps({
      assignments: { data: [vigente("p1")], error: null },
      plan: { data: [{ exercise_library_id: "e4", order_index: 1, should_track: true }], error: null },
      library: { data: [libRow("e4", { category: "mobilidade" })], error: null },
    }));
    expect(r.mode).toBe("prescription");
    expect(r.items).toHaveLength(0);
    expect(r.fallbackReason).toMatch(/força rastreável/);
  });
});
