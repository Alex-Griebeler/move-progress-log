/**
 * Funil de conduta efetiva v3 (PR-B2, spec v7+v7.2 ratificada 31/08).
 * REESCRITO citando a emenda: a máquina de sintomas MORREU ("o treino só
 * deverá ser suspenso se o treinador decidir" — sintoma é observação, sem
 * gate). Cada regra que PERMANECE tem teste próprio; os testes de sintoma
 * não foram afrouxados — o comportamento deixou de existir por decisão.
 */
import { describe, expect, it } from "vitest";
import {
  computeEffectiveConduct,
  isNumericFloor,
  PRESCRIPTION_BY_ZONE,
  ZONE_FROM_LABEL,
  type ConductInput,
} from "../effectiveConduct";
import type { TrainingRecommendation } from "@/utils/recoveryEngine";

const rec = (zone: TrainingRecommendation["zone"], overrides: Partial<TrainingRecommendation> = {}): TrainingRecommendation => {
  const z = ZONE_FROM_LABEL[zone];
  const p = PRESCRIPTION_BY_ZONE[z];
  const load = { 4: ["increase", 5], 3: ["maintain", 0], 2: ["reduce", -20], 1: ["block", null], 0: ["block", null] }[z] as [
    TrainingRecommendation["loadDecision"], number | null,
  ];
  return {
    trainingType: p.trainingType,
    intensity: p.intensity,
    duration: p.duration,
    recoveryScore: 70,
    zone,
    fatigueLevel: "low",
    loadDecision: load[0],
    loadAdjustmentPercent: load[1],
    overrideApplied: false,
    reason: "",
    alerts: [],
    confidence: 80,
    emoji: p.emoji,
    source: "whoop",
    evaluatedRules: [],
    skippedRules: [],
    ...overrides,
  };
};

const input = (overrides: Partial<ConductInput> = {}): ConductInput => ({
  base: rec("green"),
  source: "whoop",
  score: 70,
  perception: "nao_informada",
  alternative: null,
  whoopContext: { freshness: "fresh", strain: "non_high" },
  hasPartialError: false,
  ...overrides,
});

const critical = () => [{
  kind: "fisiologico" as const,
  metric: "fc_repouso" as const,
  level: "CRITICAL" as const,
  shortLabel: "FCR",
  message: "FC de repouso 21% acima do basal",
}];

describe("erro parcial precede tudo", () => {
  it("hasPartialError suspende com a base intacta", () => {
    const c = computeEffectiveConduct(input({ hasPartialError: true, perception: "pior" }));
    expect(c.suspended).toBe("error");
    expect(c.modulated).toBe(false);
    expect(c.effectiveZone).toBe(3);
  });
});

describe("a máquina de sintomas NÃO existe (v7 — decisão do dono)", () => {
  it("o input não tem campos de sintoma e nenhum estado 'symptoms' é emitível", () => {
    const c = computeEffectiveConduct(input());
    expect(c.suspended).toBe(null);
    expect("symptoms" in input()).toBe(false);
  });
});

describe("piso numérico (assimétrico: só bloqueia SUBIR)", () => {
  it("whoop ≤33, oura <45, CRITICAL", () => {
    expect(isNumericFloor({ base: rec("red"), source: "whoop", score: 33 })).toBe(true);
    expect(isNumericFloor({ base: rec("red"), source: "whoop", score: 34 })).toBe(false);
    expect(isNumericFloor({ base: rec("red"), source: "oura", score: 44 })).toBe(true);
    expect(isNumericFloor({ base: rec("red"), source: "oura", score: 45 })).toBe(false);
    expect(isNumericFloor({ base: rec("green", { alerts: critical() }), source: "whoop", score: 80 })).toBe(true);
  });

  it("piso bloqueia elevação por percepção, com veto visível", () => {
    const c = computeEffectiveConduct(input({ base: rec("yellow"), score: 30, perception: "melhor" }));
    expect(c.effectiveZone).toBe(2);
    expect(c.appliedVetoes.join(" ")).toContain("piso numérico");
  });

  it("piso NUNCA bloqueia reduzir (pior sempre pode)", () => {
    const c = computeEffectiveConduct(input({ base: rec("yellow"), score: 30, perception: "pior" }));
    expect(c.effectiveZone).toBe(1);
  });
});

describe("percepção via PSR (régua relativa consumida como categoria)", () => {
  it("nao_informada/condizente = base intocada", () => {
    expect(computeEffectiveConduct(input()).modulated).toBe(false);
    expect(computeEffectiveConduct(input({ perception: "condizente" })).modulated).toBe(false);
  });

  it("pior reduz pra min(base−1, 2), clampado em 0", () => {
    expect(computeEffectiveConduct(input({ base: rec("green_high"), perception: "pior" })).effectiveZone).toBe(2);
    expect(computeEffectiveConduct(input({ base: rec("green"), perception: "pior" })).effectiveZone).toBe(2);
    expect(computeEffectiveConduct(input({ base: rec("yellow"), perception: "pior" })).effectiveZone).toBe(1);
    expect(computeEffectiveConduct(input({ base: rec("red"), perception: "pior" })).effectiveZone).toBe(0);
  });

  it("melhor: só base ≤2 sobe (+1); zona 3 é teto humano; zona 4 não é desfeita", () => {
    expect(computeEffectiveConduct(input({ base: rec("yellow"), perception: "melhor" })).effectiveZone).toBe(3);
    expect(computeEffectiveConduct(input({ base: rec("orange"), perception: "melhor" })).effectiveZone).toBe(2);
    expect(computeEffectiveConduct(input({ base: rec("green"), perception: "melhor" })).effectiveZone).toBe(3);
    expect(computeEffectiveConduct(input({ base: rec("green_high"), perception: "melhor" })).effectiveZone).toBe(4);
  });

  it("melhor NUNCA gera increase (capMaintain)", () => {
    const c = computeEffectiveConduct(input({ base: rec("yellow"), perception: "melhor" }));
    expect(c.effectiveZone).toBe(3);
    expect(c.effectiveLoadDecision).toBe("maintain");
    expect(c.effectiveLoadAdjustmentPercent).toBe(0);
  });

  it("whoop: contexto UNAVAILABLE também bloqueia elevação (fail-closed)", () => {
    const c = computeEffectiveConduct(input({
      base: rec("yellow"), perception: "melhor",
      whoopContext: { freshness: "unavailable", strain: "unavailable" },
    }));
    expect(c.effectiveZone).toBe(2);
  });

  it("z4 objetiva preserva increase +5 mesmo com 'melhor' (progressão autorizada pelos gates numéricos)", () => {
    const c = computeEffectiveConduct(input({ base: rec("green_high"), perception: "melhor" }));
    expect(c.effectiveZone).toBe(4);
    expect(c.effectiveLoadDecision).toBe("increase");
    expect(c.effectiveLoadAdjustmentPercent).toBe(5);
  });

  it("whoop: elevação exige sync fresh E strain non_high", () => {
    const stale = computeEffectiveConduct(input({
      base: rec("yellow"), perception: "melhor",
      whoopContext: { freshness: "stale", strain: "non_high" },
    }));
    expect(stale.effectiveZone).toBe(2);
    expect(stale.appliedVetoes.join(" ")).toContain("sincronização");
    const high = computeEffectiveConduct(input({
      base: rec("yellow"), perception: "melhor",
      whoopContext: { freshness: "fresh", strain: "high" },
    }));
    expect(high.effectiveZone).toBe(2);
  });

  it("oura: elevação não depende de contexto whoop", () => {
    const c = computeEffectiveConduct(input({
      base: rec("yellow"), source: "oura", score: 60, perception: "melhor", whoopContext: null,
    }));
    expect(c.effectiveZone).toBe(3);
  });

  it("CRITICAL adiciona o veto de confirmação mesmo sem mudar zona", () => {
    const c = computeEffectiveConduct(input({ base: rec("green", { alerts: critical() }) }));
    expect(c.appliedVetoes.join(" ")).toContain("confirme com a aluna");
  });
});

describe("alternativas (o funil é o mesmo pra escolha do treinador)", () => {
  const alt = (targetZone: 0 | 1 | 2 | 3 | 4, load: ConductInput["alternative"] extends infer _ ? "increase" | "maintain" | "reduce" | "block" : never = "maintain", pct: number | null = 0) => ({
    type: "Alternativa X", description: "", targetZone, targetLoadDecision: load, targetAdjustmentPercent: pct,
  });

  it("zona 4 nunca nasce de alternativa (só base 4 mantém 4)", () => {
    const c = computeEffectiveConduct(input({ alternative: alt(4, "increase", 5) }));
    expect(c.effectiveZone).toBe(3);
    expect(c.appliedAlternative).toBe(null);
    const base4 = computeEffectiveConduct(input({ base: rec("green_high"), alternative: alt(4, "increase", 5) }));
    expect(base4.appliedAlternative).toBe("Alternativa X");
  });

  it("alternativa acima do teto (pós-percepção) não aplica, com veto", () => {
    const c = computeEffectiveConduct(input({ base: rec("green"), perception: "pior", alternative: alt(3) }));
    expect(c.effectiveZone).toBe(2);
    expect(c.appliedAlternative).toBe(null);
    expect(c.appliedVetoes.join(" ")).toContain("acima do teto");
  });

  it("carga da alternativa capada pela zona-teto — valor EXATO do teto (reduce −20)", () => {
    const c = computeEffectiveConduct(input({ base: rec("yellow"), alternative: alt(2, "increase", 10) }));
    expect(c.effectiveLoadDecision).toBe("reduce");
    expect(c.effectiveLoadAdjustmentPercent).toBe(-20);
    expect(c.appliedVetoes.join(" ")).toContain("limitada ao teto");
  });

  it("alternativa DESCENDENTE menos agressiva mantém a carga exata dela (reduce −10 sob base green)", () => {
    const c = computeEffectiveConduct(input({ base: rec("green"), alternative: alt(2, "reduce", -10) }));
    expect(c.appliedAlternative).toBe("Alternativa X");
    expect(c.effectiveZone).toBe(2);
    expect(c.effectiveLoadDecision).toBe("reduce");
    expect(c.effectiveLoadAdjustmentPercent).toBe(-10);
  });

  it("elevação por percepção + alternativa: teto continua maintain 0 EXATO", () => {
    const c = computeEffectiveConduct(input({ base: rec("yellow"), perception: "melhor", alternative: alt(3, "increase", 5) }));
    expect(c.effectiveLoadDecision).toBe("maintain");
    expect(c.effectiveLoadAdjustmentPercent).toBe(0);
  });
});

describe("block absoluto", () => {
  it("block da base sobrevive a percepção e alternativa", () => {
    const c = computeEffectiveConduct(input({
      base: rec("orange"), perception: "melhor",
      whoopContext: { freshness: "fresh", strain: "non_high" },
      alternative: { type: "A", description: "", targetZone: 2, targetLoadDecision: "maintain", targetAdjustmentPercent: 0 },
    }));
    expect(c.effectiveLoadDecision).toBe("block");
    expect(c.effectiveLoadAdjustmentPercent).toBe(null);
  });
});

describe("integridade do espelho de prescrições", () => {
  it("PRESCRIPTION_BY_ZONE espelha o motor (tipo de treino por zona)", () => {
    expect(PRESCRIPTION_BY_ZONE[4].trainingType).toBe("Máxima Performance / Desafio");
    expect(PRESCRIPTION_BY_ZONE[3].trainingType).toBe("Treino Normal Completo");
    expect(PRESCRIPTION_BY_ZONE[2].trainingType).toBe("Treino Reduzido 20%");
    expect(PRESCRIPTION_BY_ZONE[1].trainingType).toBe("Recuperação Ativa / Muito Leve");
    expect(PRESCRIPTION_BY_ZONE[0].trainingType).toBe("Descanso Completo / Repouso");
  });

  it("ZONE_FROM_LABEL cobre as 5 zonas", () => {
    expect(Object.keys(ZONE_FROM_LABEL).sort()).toEqual(
      ["green", "green_high", "orange", "red", "yellow"],
    );
  });
});
