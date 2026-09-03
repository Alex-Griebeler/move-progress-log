/**
 * Funil de conduta efetiva — REGRA DE CONCORDÂNCIA (spec v9.2, 6 pontos
 * ratificados 03/09/2026). O oráculo é a matriz §3 (6 linhas × 5 colunas):
 * cada célula é um teste com zona, carga, modulated e perception completos.
 * A régua relativa ±2 MORREU (teste do comportamento antigo removido por
 * decisão, não afrouxado).
 */
import { describe, expect, it } from "vitest";
import {
  computeEffectiveConduct,
  isNumericFloor,
  PRESCRIPTION_BY_ZONE,
  ZONE_FROM_LABEL,
  type ConductInput,
  type EffectiveConduct,
  type PsrSignal,
} from "../effectiveConduct";
import { toPsrSignal } from "../checkin";
import type { TrainingRecommendation } from "@/utils/recoveryEngine";

const rec = (zone: TrainingRecommendation["zone"], overrides: Partial<TrainingRecommendation> = {}): TrainingRecommendation => {
  const z = ZONE_FROM_LABEL[zone];
  const p = PRESCRIPTION_BY_ZONE[z];
  const load = { 4: ["increase", 5], 3: ["maintain", 0], 2: ["reduce", -20], 1: ["block", null], 0: ["block", null] }[z] as [
    TrainingRecommendation["loadDecision"], number | null,
  ];
  return {
    trainingType: p.trainingType, intensity: p.intensity, duration: p.duration,
    recoveryScore: 70, zone, fatigueLevel: "low",
    loadDecision: load[0], loadAdjustmentPercent: load[1],
    overrideApplied: false, reason: "", alerts: [], confidence: 80, emoji: p.emoji,
    source: "whoop", evaluatedRules: [], skippedRules: [], ...overrides,
  };
};

const psr = (v: number | null): PsrSignal => toPsrSignal(v);

/** Score COERENTE com a zona Whoop (sem piso salvo orange/red). */
const SCORE_BY_ZONE: Record<TrainingRecommendation["zone"], number> = {
  green_high: 90, green: 75, yellow: 59, orange: 30, red: 20,
};

const input = (overrides: Partial<ConductInput> = {}): ConductInput => ({
  base: rec("green"),
  source: "whoop",
  score: 75,
  psr: psr(null),
  alternative: null,
  whoopContext: { freshness: "stale", strain: "unavailable" },
  hasPartialError: false,
  ...overrides,
});

const critical = () => [{
  kind: "fisiologico" as const, metric: "fc_repouso" as const, level: "CRITICAL" as const,
  shortLabel: "FCR", message: "FC de repouso 21% acima do basal",
}];

const run = (zone: TrainingRecommendation["zone"], p: number | null, extra: Partial<ConductInput> = {}) =>
  computeEffectiveConduct(input({ base: rec(zone), score: SCORE_BY_ZONE[zone], psr: psr(p), ...extra }));

type Cell = {
  zone: number; load: EffectiveConduct["effectiveLoadDecision"]; pct: number | null;
  modulated: boolean; agreement: string; outcome: string; veto: string | null;
};
const cell = (zone: number, load: Cell["load"], pct: number | null, modulated: boolean, agreement: string, outcome: string, veto: string | null = null): Cell =>
  ({ zone, load, pct, modulated, agreement, outcome, veto });

describe("ORÁCULO §3 — matriz base × PSR (6 × 5)", () => {
  // colunas: PSR 9 (z3) · PSR 5 (z2) · PSR 2 (z1) · PSR 0 (z0) · null
  it.each<[TrainingRecommendation["zone"], number | null, Cell]>([
    // base 4 green_high
    ["green_high", 9, cell(4, "increase", 5, false, "concordante", "unchanged")],
    ["green_high", 5, cell(3, "maintain", 0, true, "discordante_abaixo", "lowered_to_maintain")],
    ["green_high", 2, cell(1, "block", null, true, "discordante_abaixo", "lowered")],
    ["green_high", 0, cell(0, "block", null, true, "discordante_abaixo", "lowered")],
    ["green_high", null, cell(4, "increase", 5, false, "nao_informada", "unchanged")],
    // base 3 green
    ["green", 9, cell(3, "maintain", 0, false, "concordante", "unchanged")],
    ["green", 5, cell(3, "maintain", 0, false, "discordante_abaixo", "unchanged")],
    ["green", 2, cell(1, "block", null, true, "discordante_abaixo", "lowered")],
    ["green", 0, cell(0, "block", null, true, "discordante_abaixo", "lowered")],
    ["green", null, cell(3, "maintain", 0, false, "nao_informada", "unchanged")],
    // base 2 yellow SEM piso (59) — caso do Alex na 1ª célula
    ["yellow", 9, cell(3, "maintain", 0, true, "discordante_acima", "raised")],
    ["yellow", 5, cell(2, "reduce", -20, false, "concordante", "unchanged")],
    ["yellow", 2, cell(1, "block", null, true, "discordante_abaixo", "lowered")],
    ["yellow", 0, cell(0, "block", null, true, "discordante_abaixo", "lowered")],
    ["yellow", null, cell(2, "reduce", -20, false, "nao_informada", "unchanged")],
    // base 1 orange (sempre piso)
    ["orange", 9, cell(1, "block", null, false, "discordante_acima", "vetoed", "floor")],
    ["orange", 5, cell(1, "block", null, false, "discordante_acima", "vetoed", "floor")],
    ["orange", 2, cell(1, "block", null, false, "concordante", "unchanged")],
    ["orange", 0, cell(0, "block", null, true, "discordante_abaixo", "lowered")],
    ["orange", null, cell(1, "block", null, false, "nao_informada", "unchanged")],
    // base 0 red (sempre piso)
    ["red", 9, cell(0, "block", null, false, "discordante_acima", "vetoed", "floor")],
    ["red", 5, cell(0, "block", null, false, "discordante_acima", "vetoed", "floor")],
    ["red", 2, cell(0, "block", null, false, "discordante_acima", "vetoed", "floor")],
    ["red", 0, cell(0, "block", null, false, "concordante", "unchanged")],
    ["red", null, cell(0, "block", null, false, "nao_informada", "unchanged")],
  ])("base %s + PSR %s", (zone, p, expected) => {
    const c = run(zone, p);
    expect(c.effectiveZone).toBe(expected.zone);
    expect(c.effectiveLoadDecision).toBe(expected.load);
    expect(c.effectiveLoadAdjustmentPercent).toBe(expected.pct);
    expect(c.modulated).toBe(expected.modulated);
    expect(c.perception.agreement).toBe(expected.agreement);
    expect(c.perception.outcome).toBe(expected.outcome);
    expect(c.perception.vetoReason).toBe(expected.veto);
    expect(c.perception.psr).toBe(p);
    expect(c.perception.baseZone).toBe(ZONE_FROM_LABEL[zone]);
    expect(c.perception.zoneAfterPsr).toBe(expected.zone);
    expect(c.suspended).toBe(null);
    // veto de PERCEPÇÃO nunca vive em appliedVetoes (E4)
    expect(c.appliedVetoes.join(" ")).not.toMatch(/PSR|percepção|piso|strain/);
    expect(c.prescription.trainingType).toBe(PRESCRIPTION_BY_ZONE[expected.zone as 0 | 1 | 2 | 3 | 4].trainingType);
  });

  // 6ª linha do oráculo: yellow COM piso por CRITICAL (score alto, Whoop e Oura)
  const runCritical = (p: number | null, source: "whoop" | "oura" = "whoop") =>
    computeEffectiveConduct(input({
      base: rec("yellow", { alerts: critical(), source }), source, score: source === "whoop" ? 59 : 60,
      psr: psr(p), whoopContext: source === "whoop" ? { freshness: "fresh", strain: "non_high" } : null,
    }));
  const assertCell = (c: EffectiveConduct, p: number | null, expected: Cell) => {
    expect(c.effectiveZone).toBe(expected.zone);
    expect(c.effectiveLoadDecision).toBe(expected.load);
    expect(c.effectiveLoadAdjustmentPercent).toBe(expected.pct);
    expect(c.modulated).toBe(expected.modulated);
    expect(c.perception).toEqual({
      agreement: expected.agreement, outcome: expected.outcome, vetoReason: expected.veto,
      psr: p, baseZone: 2, zoneAfterPsr: expected.zone,
    });
    expect(c.suspended).toBe(null);
    expect(c.prescription.trainingType).toBe(PRESCRIPTION_BY_ZONE[expected.zone as 0 | 1 | 2 | 3 | 4].trainingType);
    expect(c.appliedVetoes.join(" ")).not.toMatch(/PSR|percepção|piso|strain/);
    // o veto de confirmação do CRITICAL continua em appliedVetoes (não é veto de percepção)
    expect(c.appliedVetoes.join(" ")).toContain("Sinal fisiológico crítico presente.");
  };
  it.each<[number | null, Cell]>([
    [9, cell(2, "reduce", -20, false, "discordante_acima", "vetoed", "floor")],
    [5, cell(2, "reduce", -20, false, "concordante", "unchanged")],
    [2, cell(1, "block", null, true, "discordante_abaixo", "lowered")],
    [0, cell(0, "block", null, true, "discordante_abaixo", "lowered")],
    [null, cell(2, "reduce", -20, false, "nao_informada", "unchanged")],
  ])("base yellow COM CRITICAL + PSR %s (Whoop e Oura)", (p, expected) => {
    assertCell(runCritical(p, "whoop"), p, expected);
    assertCell(runCritical(p, "oura"), p, expected);
  });

  it("variante strain conhecido/alto na célula (yellow, PSR 9): pacote completo de outputs", () => {
    const c = run("yellow", 9, { whoopContext: { freshness: "stale", strain: "high", strainValue: 15 } });
    expect(c.effectiveZone).toBe(2);
    expect(c.effectiveLoadDecision).toBe("reduce");
    expect(c.effectiveLoadAdjustmentPercent).toBe(-20);
    expect(c.modulated).toBe(false);
    expect(c.perception).toEqual({
      agreement: "discordante_acima", outcome: "vetoed", vetoReason: "strain", psr: 9, baseZone: 2, zoneAfterPsr: 2,
    });
    expect(c.suspended).toBe(null);
    expect(c.prescription.trainingType).toBe(PRESCRIPTION_BY_ZONE[2].trainingType);
    expect(c.appliedVetoes).toEqual([]);
  });
});

describe("gates da elevação 2→3 (ponto 5: só strain conhecido e alto veta)", () => {
  it("caso do Alex: 59 + PSR 9 + sync stale/strain unavailable → Manter (regressão)", () => {
    const c = run("yellow", 9, { whoopContext: { freshness: "stale", strain: "unavailable" } });
    expect(c.effectiveZone).toBe(3);
    expect(c.effectiveLoadDecision).toBe("maintain");
    expect(c.perception.outcome).toBe("raised");
  });
  it.each([
    [{ freshness: "fresh", strain: "non_high" }, 3],
    [{ freshness: "stale", strain: "non_high" }, 3],
    [{ freshness: "unavailable", strain: "unavailable" }, 3],
    [{ freshness: "fresh", strain: "high" }, 2],
    [{ freshness: "stale", strain: "high" }, 2],
  ] as Array<[ConductInput["whoopContext"], number]>)("contexto %j → zona %s", (ctx, zone) => {
    const c = run("yellow", 9, { whoopContext: ctx });
    expect(c.effectiveZone).toBe(zone);
    if (zone === 2) expect(c.perception).toMatchObject({ outcome: "vetoed", vetoReason: "strain" });
  });
  it("whoopContext null (sem contexto) não veta", () => {
    expect(run("yellow", 9, { whoopContext: null }).effectiveZone).toBe(3);
  });
  it("strain alto NÃO afeta nada além da elevação 2→3", () => {
    const high = { freshness: "fresh" as const, strain: "high" as const };
    expect(run("green", 9, { whoopContext: high }).effectiveZone).toBe(3);
    expect(run("green_high", 9, { whoopContext: high }).effectiveLoadDecision).toBe("increase");
    expect(run("green", 2, { whoopContext: high }).effectiveZone).toBe(1);
    expect(run("yellow", 5, { whoopContext: high }).perception.outcome).toBe("unchanged");
  });
  it("Oura ignora qualquer contexto Whoop (inclusive high)", () => {
    const c = computeEffectiveConduct(input({
      base: rec("yellow", { source: "oura" }), source: "oura", score: 60, psr: psr(9),
      whoopContext: { freshness: "fresh", strain: "high" },
    }));
    expect(c.effectiveZone).toBe(3);
    expect(c.perception.outcome).toBe("raised");
  });
});

describe("piso numérico (assimétrico: só bloqueia SUBIR) — fronteiras", () => {
  it("whoop ≤33, oura <45, CRITICAL", () => {
    expect(isNumericFloor({ base: rec("red"), source: "whoop", score: 33 })).toBe(true);
    expect(isNumericFloor({ base: rec("red"), source: "whoop", score: 34 })).toBe(false);
    expect(isNumericFloor({ base: rec("red"), source: "oura", score: 44 })).toBe(true);
    expect(isNumericFloor({ base: rec("red"), source: "oura", score: 45 })).toBe(false);
    expect(isNumericFloor({ base: rec("green", { alerts: critical() }), source: "whoop", score: 80 })).toBe(true);
  });
  it("piso NUNCA bloqueia reduzir (PSR baixa sempre pode)", () => {
    const c = computeEffectiveConduct(input({ base: rec("yellow"), score: 30, psr: psr(2) }));
    expect(c.effectiveZone).toBe(1);
    expect(c.perception.outcome).toBe("lowered");
  });
});

describe("erro parcial precede tudo (A2: PerceptionResult definido)", () => {
  it("hasPartialError suspende com a base intacta e PSR semanticamente ignorada", () => {
    const c = computeEffectiveConduct(input({ base: rec("yellow"), hasPartialError: true, psr: psr(9) }));
    expect(c.suspended).toBe("error");
    expect(c.modulated).toBe(false);
    expect(c.effectiveZone).toBe(2);
    expect(c.perception).toEqual({
      agreement: "nao_informada", outcome: "unchanged", vetoReason: null, psr: null, baseZone: 2, zoneAfterPsr: 2,
    });
  });
});

describe("PSR null preserva a base integralmente (sem aviso), inclusive com CRITICAL + strain alto", () => {
  it("nada de outcome ≠ unchanged", () => {
    const c = computeEffectiveConduct(input({
      base: rec("green", { alerts: critical() }), psr: psr(null),
      whoopContext: { freshness: "fresh", strain: "high" },
    }));
    expect(c.perception).toMatchObject({ agreement: "nao_informada", outcome: "unchanged", vetoReason: null, psr: null });
    expect(c.effectiveZone).toBe(3);
    expect(c.appliedVetoes.join(" ")).toContain("Sinal fisiológico crítico presente. Confirme a conduta antes do treino.");
  });
});

describe("a máquina de sintomas NÃO existe (v7 — decisão do dono)", () => {
  it("o input não tem campos de sintoma e nenhum estado 'symptoms' é emitível", () => {
    expect(computeEffectiveConduct(input()).suspended).toBe(null);
    expect("symptoms" in input()).toBe(false);
  });
});

describe("alternativas após cada classe de resultado (o funil é o mesmo pra escolha do treinador)", () => {
  const alt = (targetZone: 0 | 1 | 2 | 3 | 4, load: "increase" | "maintain" | "reduce" | "block" = "maintain", pct: number | null = 0) => ({
    type: "Alternativa X", description: "", targetZone, targetLoadDecision: load, targetAdjustmentPercent: pct,
  });

  it("zona 4 nunca nasce de alternativa (só base 4 concordante mantém 4)", () => {
    const c = computeEffectiveConduct(input({ alternative: alt(4, "increase", 5) }));
    expect(c.effectiveZone).toBe(3);
    expect(c.appliedAlternative).toBe(null);
    const base4 = run("green_high", 9, { alternative: alt(4, "increase", 5) });
    expect(base4.appliedAlternative).toBe("Alternativa X");
  });

  it("concordância: alternativa descendente aplica; acima do teto não", () => {
    const down = run("green", 9, { alternative: alt(2, "reduce", -10) });
    expect(down).toMatchObject({ effectiveZone: 2, appliedAlternative: "Alternativa X", effectiveLoadDecision: "reduce", effectiveLoadAdjustmentPercent: -10 });
    const up = run("yellow", 5, { alternative: alt(3) });
    expect(up.appliedAlternative).toBe(null);
    expect(up.appliedVetoes.join(" ")).toContain("acima do teto");
  });

  it("raised (2→3): teto 3 com carga maintain 0 EXATO; alternativa 3/increase é capada", () => {
    const c = run("yellow", 9, { alternative: alt(3, "increase", 5) });
    expect(c.effectiveZone).toBe(3);
    expect(c.effectiveLoadDecision).toBe("maintain");
    expect(c.effectiveLoadAdjustmentPercent).toBe(0);
  });

  it("lowered (PSR baixa): teto vira a zona da PSR — alternativa acima é vetada, descendente aplica", () => {
    const up = run("green", 2, { alternative: alt(3) });
    expect(up.effectiveZone).toBe(1);
    expect(up.appliedAlternative).toBe(null);
    const down = run("green", 2, { alternative: alt(0, "block", null) });
    expect(down.effectiveZone).toBe(0);
    expect(down.appliedAlternative).toBe("Alternativa X");
  });

  it("vetoed (piso/strain): teto continua a base; alternativa descendente aplica e nunca destrava carga", () => {
    const c = run("yellow", 9, { whoopContext: { freshness: "fresh", strain: "high" }, alternative: alt(1, "block", null) });
    expect(c.effectiveZone).toBe(1);
    expect(c.perception.vetoReason).toBe("strain");
    const floorAlt = run("orange", 9, { alternative: alt(2, "maintain", 0) });
    expect(floorAlt.appliedAlternative).toBe(null);
    expect(floorAlt.effectiveLoadDecision).toBe("block");
  });

  it("carga da alternativa capada pela zona-teto — valor EXATO do teto (reduce −20)", () => {
    const c = computeEffectiveConduct(input({ base: rec("yellow"), score: 59, alternative: alt(2, "increase", 10) }));
    expect(c.effectiveLoadDecision).toBe("reduce");
    expect(c.effectiveLoadAdjustmentPercent).toBe(-20);
    expect(c.appliedVetoes.join(" ")).toContain("limitada ao teto");
  });
});

describe("block absoluto", () => {
  it("block da base sobrevive a PSR alta (vetada) e alternativa", () => {
    const c = run("orange", 9, {
      whoopContext: { freshness: "fresh", strain: "non_high" },
      alternative: { type: "A", description: "", targetZone: 2, targetLoadDecision: "maintain", targetAdjustmentPercent: 0 },
    });
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
    expect(Object.keys(ZONE_FROM_LABEL).sort()).toEqual(["green", "green_high", "orange", "red", "yellow"]);
  });
});
