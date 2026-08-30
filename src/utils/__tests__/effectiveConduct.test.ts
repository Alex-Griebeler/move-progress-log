import { describe, expect, it } from "vitest";
import type { TrainingRecommendation } from "@/utils/recoveryEngine";
import {
  computeEffectiveConduct,
  isNumericFloor,
  PRESCRIPTION_BY_ZONE,
  ZONE_FROM_LABEL,
  type ConductAlternative,
  type ConductInput,
  type Perception,
} from "@/utils/effectiveConduct";
import { getTrainingAlternativesForZone } from "@/utils/trainingAlternatives";

const baseRec = (
  zone: TrainingRecommendation["zone"],
  overrides: Partial<TrainingRecommendation> = {},
): TrainingRecommendation => {
  const z = ZONE_FROM_LABEL[zone];
  const p = PRESCRIPTION_BY_ZONE[z];
  return {
    trainingType: p.trainingType,
    intensity: p.intensity,
    duration: p.duration,
    recoveryScore: 70,
    zone,
    fatigueLevel: "low",
    loadDecision: z === 4 ? "increase" : z === 3 ? "maintain" : z === 2 ? "reduce" : "block",
    loadAdjustmentPercent: z === 4 ? 5 : z === 3 ? 0 : z === 2 ? -20 : null,
    overrideApplied: false,
    reason: "",
    alerts: [],
    confidence: 70,
    emoji: p.emoji,
    evaluatedRules: [],
    skippedRules: [],
    ...overrides,
  } as TrainingRecommendation;
};

const input = (overrides: Partial<ConductInput> = {}): ConductInput => ({
  base: baseRec("green"),
  source: "oura",
  score: 70,
  perception: "nao_informada",
  symptoms: null,
  symptomsAcknowledged: false,
  alternative: null,
  whoopContext: null,
  hasPartialError: false,
  ...overrides,
});

const alt = (
  targetZone: 0 | 1 | 2 | 3 | 4,
  extra: Partial<ConductAlternative> = {},
): ConductAlternative => ({
  type: `alt-z${targetZone}`,
  description: "",
  targetZone,
  targetLoadDecision: targetZone >= 3 ? "maintain" : targetZone === 2 ? "reduce" : "block",
  targetAdjustmentPercent: targetZone >= 3 ? 0 : targetZone === 2 ? -20 : null,
  ...extra,
});

describe("ordem geradora: erro → sintomas → base → percepção → alternativa → block", () => {
  it("caso 12/erro: erro parcial suspende tudo, antes de qualquer modulação", () => {
    const c = computeEffectiveConduct(input({ hasPartialError: true, perception: "pior" }));
    expect(c.suspended).toBe("error");
    expect(c.modulated).toBe(false);
  });

  it("caso 2: condizente + sintomas SIM (não avaliados) → suspende carga/CTA, sem conversão em zona", () => {
    const c = computeEffectiveConduct(input({ perception: "condizente", symptoms: true }));
    expect(c.suspended).toBe("symptoms");
    expect(c.effectiveZone).toBe(3); // conduta exibida = base, mas suspensa
    expect(c.appliedVetoes.join(" ")).toMatch(/suspensos até avaliação/);
  });

  it("sintomas avaliados e liberados → conduta capada no caminho conservador", () => {
    const c = computeEffectiveConduct(
      input({ symptoms: true, symptomsAcknowledged: true, perception: "condizente" }),
    );
    expect(c.suspended).toBeNull();
    expect(c.effectiveZone).toBe(2); // min(3−1, 2)
  });
});

describe("percepção — pisos e clamps (casos 1, 3, 4 da matriz)", () => {
  it("caso 1: 'pior' em todas as zonas → max(0, min(base−1, 2))", () => {
    const expected: Record<TrainingRecommendation["zone"], number> = {
      green_high: 2,
      green: 2,
      yellow: 1,
      orange: 0,
      red: 0,
    };
    for (const [zone, want] of Object.entries(expected)) {
      const c = computeEffectiveConduct(
        input({ base: baseRec(zone as TrainingRecommendation["zone"]), perception: "pior", symptoms: false }),
      );
      expect(c.effectiveZone, zone).toBe(want);
    }
  });

  it("caso 4: 'não informada' → conduta = base, sem modulação", () => {
    const c = computeEffectiveConduct(input({ perception: "nao_informada" }));
    expect(c.modulated).toBe(false);
    expect(c.effectiveZone).toBe(3);
  });

  it("caso 3: 'melhor' com sintomas NULL (não perguntado) → elevação bloqueada", () => {
    const c = computeEffectiveConduct(input({ base: baseRec("yellow"), perception: "melhor", symptoms: null }));
    expect(c.effectiveZone).toBe(2);
    expect(c.appliedVetoes.join(" ")).toMatch(/sintomas não descartados/);
  });

  it("'melhor' com gates limpos: amarelo→treino normal, carga capada em maintain", () => {
    const c = computeEffectiveConduct(input({ base: baseRec("yellow"), score: 50, perception: "melhor", symptoms: false }));
    expect(c.effectiveZone).toBe(3);
    expect(c.effectiveLoadDecision).toBe("maintain");
  });

  it("'melhor' NUNCA cria zona 4 (base verde fica em 3)", () => {
    const c = computeEffectiveConduct(input({ base: baseRec("green"), perception: "melhor", symptoms: false }));
    expect(c.effectiveZone).toBe(3);
  });

  it("piso: Whoop ≤33 / Oura <45 / CRITICAL bloqueiam SÓ a subida; descer continua", () => {
    expect(isNumericFloor({ base: baseRec("red"), source: "whoop", score: 33 })).toBe(true);
    expect(isNumericFloor({ base: baseRec("yellow"), source: "whoop", score: 34 })).toBe(false);
    expect(isNumericFloor({ base: baseRec("orange"), source: "oura", score: 44 })).toBe(true);
    expect(isNumericFloor({ base: baseRec("yellow"), source: "oura", score: 45 })).toBe(false);
    const critical = baseRec("green", {
      alerts: [{ kind: "fisiologico", metric: "sono", shortLabel: "x", level: "CRITICAL", message: "x" }],
    });
    // caso 14: CRITICAL sem mudança de zona ainda ativa o piso
    const up = computeEffectiveConduct(input({ base: critical, perception: "melhor", symptoms: false }));
    expect(up.effectiveZone).toBe(3); // não sobe
    expect(up.appliedVetoes.join(" ")).toMatch(/piso numérico/);
    const down = computeEffectiveConduct(input({ base: critical, perception: "pior", symptoms: false }));
    expect(down.effectiveZone).toBe(2); // descer sempre pode
  });

  it("Whoop: elevação exige freshness fresh E strain non_high (casos 10/11 — unavailable = veto)", () => {
    const blocked = computeEffectiveConduct(
      input({ base: baseRec("yellow"), source: "whoop", score: 50, perception: "melhor", symptoms: false,
        whoopContext: { freshness: "unavailable", strain: "unavailable" } }),
    );
    expect(blocked.effectiveZone).toBe(2);
    const ok = computeEffectiveConduct(
      input({ base: baseRec("yellow"), source: "whoop", score: 50, perception: "melhor", symptoms: false,
        whoopContext: { freshness: "fresh", strain: "non_high" } }),
    );
    expect(ok.effectiveZone).toBe(3);
    const highStrain = computeEffectiveConduct(
      input({ base: baseRec("yellow"), source: "whoop", score: 50, perception: "melhor", symptoms: false,
        whoopContext: { freshness: "fresh", strain: "high" } }),
    );
    expect(highStrain.effectiveZone).toBe(2);
  });
});

describe("alternativas — 7 regras de composição (casos 5-8 da matriz)", () => {
  it("caso 5: alternativa zona 4 com base 3 → ignorada (zona 4 nunca nasce de ação humana)", () => {
    const c = computeEffectiveConduct(input({ base: baseRec("green"), alternative: alt(4, { targetLoadDecision: "increase", targetAdjustmentPercent: 5 }) }));
    expect(c.effectiveZone).toBe(3);
    expect(c.appliedAlternative).toBeNull();
    expect(c.appliedVetoes.join(" ")).toMatch(/zona 4 nunca nasce/);
  });

  it("caso 6: alternativa zona 4 com base 4 válida → aplicada", () => {
    const c = computeEffectiveConduct(input({ base: baseRec("green_high"), score: 90, alternative: alt(4, { targetLoadDecision: "increase", targetAdjustmentPercent: 5 }) }));
    expect(c.effectiveZone).toBe(4);
    expect(c.appliedAlternative).toBe("alt-z4");
  });

  it("caso 7: percepção 'pior' (teto 2) + alternativa zona 3 → alternativa NÃO desfaz a percepção", () => {
    const c = computeEffectiveConduct(
      input({ base: baseRec("green"), perception: "pior", symptoms: false, alternative: alt(3) }),
    );
    expect(c.effectiveZone).toBe(2);
    expect(c.appliedAlternative).toBeNull();
  });

  it("caso 8: percepção 'melhor' em amarelo + alternativa zona 0 (descer) → sempre aceita", () => {
    const c = computeEffectiveConduct(
      input({ base: baseRec("yellow"), score: 50, perception: "melhor", symptoms: false, alternative: alt(0) }),
    );
    expect(c.effectiveZone).toBe(0);
    expect(c.appliedAlternative).toBe("alt-z0");
    expect(c.effectiveLoadDecision).toBe("block");
  });

  it("carga da alternativa nunca mais agressiva que o teto (reduce −10 ≤ maintain ok; increase capado)", () => {
    const c = computeEffectiveConduct(
      input({ base: baseRec("green"), alternative: alt(2, { targetLoadDecision: "reduce", targetAdjustmentPercent: -10 }) }),
    );
    expect(c.effectiveLoadDecision).toBe("reduce");
    expect(c.effectiveLoadAdjustmentPercent).toBe(-10);
  });

  it("caso 21/block: block da BASE sobrevive a percepção, alternativa e tudo", () => {
    const blocked = baseRec("yellow", { loadDecision: "block", loadAdjustmentPercent: null });
    const c = computeEffectiveConduct(
      input({ base: blocked, perception: "melhor", symptoms: false, alternative: alt(3) }),
    );
    expect(c.effectiveLoadDecision).toBe("block");
    expect(c.effectiveLoadAdjustmentPercent).toBeNull();
  });
});

describe("integridade dos dados de alternativas e do espelho de prescrições", () => {
  it("mapa estático: nenhuma alternativa é mais agressiva que a zona que a oferece", () => {
    const zones: Array<[TrainingRecommendation["zone"], number]> = [
      ["green_high", 4], ["green", 3], ["yellow", 2], ["orange", 1], ["red", 0],
    ];
    for (const [label, z] of zones) {
      for (const a of getTrainingAlternativesForZone(label, 0)) {
        expect(a.targetZone, `${label}/${a.type}`).toBeLessThanOrEqual(z);
      }
    }
  });

  it("PRESCRIPTION_BY_ZONE espelha o motor (tipo de treino por zona)", () => {
    expect(PRESCRIPTION_BY_ZONE[4].trainingType).toBe("Máxima Performance / Desafio");
    expect(PRESCRIPTION_BY_ZONE[3].trainingType).toBe("Treino Normal Completo");
    expect(PRESCRIPTION_BY_ZONE[2].trainingType).toBe("Treino Reduzido 20%");
    expect(PRESCRIPTION_BY_ZONE[1].trainingType).toBe("Recuperação Ativa / Muito Leve");
    expect(PRESCRIPTION_BY_ZONE[0].trainingType).toBe("Descanso Completo / Repouso");
  });

  it("fronteiras do piso numérico: Whoop 33/34, Oura 44/45 (casos nomeados)", () => {
    const perceptions: Perception[] = ["melhor"];
    for (const p of perceptions) {
      const w33 = computeEffectiveConduct(input({ base: baseRec("red"), source: "whoop", score: 33, perception: p, symptoms: false, whoopContext: { freshness: "fresh", strain: "non_high" } }));
      expect(w33.effectiveZone).toBe(0);
      const w34 = computeEffectiveConduct(input({ base: baseRec("yellow"), source: "whoop", score: 34, perception: p, symptoms: false, whoopContext: { freshness: "fresh", strain: "non_high" } }));
      expect(w34.effectiveZone).toBe(3);
    }
  });
});
