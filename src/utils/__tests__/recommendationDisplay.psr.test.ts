/**
 * Copy canônica da PSR (spec v9.2 Q6/A3) sobre saídas REAIS do funil —
 * cenários (a)–(d) da §5. O dashboard não é montado aqui (dívida H1
 * registrada: teste de componente com Supabase mockado); a frase e o
 * eyebrow nascem destes helpers e o dashboard só os renderiza.
 */
import { describe, expect, it } from "vitest";
import { perceptionCausalLine, perceptionEyebrow, VERDICT_BY_ZONE } from "../recommendationDisplay";
import { computeEffectiveConduct, PRESCRIPTION_BY_ZONE, ZONE_FROM_LABEL, type ConductInput } from "../effectiveConduct";
import { toPsrSignal } from "../checkin";
import { formatStrainDisplay } from "../whoopRecommendation";
import type { TrainingRecommendation } from "@/utils/recoveryEngine";

const rec = (zone: TrainingRecommendation["zone"]): TrainingRecommendation => {
  const z = ZONE_FROM_LABEL[zone];
  const p = PRESCRIPTION_BY_ZONE[z];
  const load = { 4: ["increase", 5], 3: ["maintain", 0], 2: ["reduce", -20], 1: ["block", null], 0: ["block", null] }[z] as [
    TrainingRecommendation["loadDecision"], number | null,
  ];
  return {
    trainingType: p.trainingType, intensity: p.intensity, duration: p.duration, recoveryScore: 70, zone,
    fatigueLevel: "low", loadDecision: load[0], loadAdjustmentPercent: load[1], overrideApplied: false, reason: "",
    alerts: [], confidence: 80, emoji: p.emoji, source: "whoop", evaluatedRules: [], skippedRules: [],
  };
};
const conduct = (zone: TrainingRecommendation["zone"], score: number, psr: number | null, ctx: ConductInput["whoopContext"]) =>
  computeEffectiveConduct({ base: rec(zone), source: "whoop", score, psr: toPsrSignal(psr), alternative: null, whoopContext: ctx, hasPartialError: false });

describe("frase causal e eyebrow (fonte única: conduct.perception)", () => {
  it("(a) 59 + PSR 9 + stale/unavailable → Manter, frase 'Aparelho: reduzir… PSR 9: manter…'", () => {
    const c = conduct("yellow", 59, 9, { freshness: "stale", strain: "unavailable", strainValue: 8 });
    expect(VERDICT_BY_ZONE[c.effectiveZone]).toBe("Manter o treino planejado");
    expect(perceptionCausalLine(c.perception, formatStrainDisplay(8))).toBe(
      "Aparelho: reduzir o treino em 20%. PSR 9: manter o treino planejado.",
    );
    expect(perceptionEyebrow(c.perception)).toBe("Ajuste por PSR");
  });
  it("(b) 59 + PSR 9 + strain 15 → Reduzir, veto com valor canônico 15,0/21", () => {
    const c = conduct("yellow", 59, 9, { freshness: "fresh", strain: "high", strainValue: 15 });
    expect(VERDICT_BY_ZONE[c.effectiveZone]).toBe("Reduzir o treino em 20%");
    expect(perceptionCausalLine(c.perception, formatStrainDisplay(15))).toBe(
      "PSR 9 não altera a conduta: strain do dia alto (15,0/21).",
    );
    expect(perceptionEyebrow(c.perception)).toBe("Ajuste por PSR não aplicado");
    // valor indisponível: frase sem o número
    expect(perceptionCausalLine(c.perception, null)).toBe("PSR 9 não altera a conduta: strain do dia alto.");
  });
  it("(c) 90 green_high + PSR 5 → Manter, frase 'Aparelho: aumentar a carga em 5%…'", () => {
    const c = conduct("green_high", 90, 5, { freshness: "fresh", strain: "non_high" });
    expect(VERDICT_BY_ZONE[c.effectiveZone]).toBe("Manter o treino planejado");
    expect(perceptionCausalLine(c.perception, null)).toBe("Aparelho: aumentar a carga em 5%. PSR 5: manter o treino planejado.");
  });
  it("(d) 90 + PSR 2 → Apenas recuperação ativa, frase de rebaixamento", () => {
    const c = conduct("green", 90, 2, { freshness: "fresh", strain: "non_high" });
    expect(VERDICT_BY_ZONE[c.effectiveZone]).toBe("Apenas recuperação ativa");
    expect(perceptionCausalLine(c.perception, null)).toBe("Aparelho: manter o treino planejado. PSR 2: apenas recuperação ativa.");
  });
  it("piso: orange 30 + PSR 8 → veto de piso; base 3 + PSR 5 (discordante sem mudança) → SEM frase; PSR null → SEM frase", () => {
    const floor = conduct("orange", 30, 8, { freshness: "fresh", strain: "non_high" });
    expect(perceptionCausalLine(floor.perception, null)).toBe("PSR 8 não altera a conduta: sinais objetivos no piso de segurança.");
    expect(perceptionCausalLine(conduct("green", 75, 5, null).perception, null)).toBeNull();
    expect(perceptionEyebrow(conduct("green", 75, 5, null).perception)).toBeNull();
    expect(perceptionCausalLine(conduct("yellow", 59, null, null).perception, null)).toBeNull();
  });
  it("copy sem gênero e sem '!'", () => {
    const samples = [
      conduct("yellow", 59, 9, { freshness: "stale", strain: "unavailable" }),
      conduct("yellow", 59, 9, { freshness: "fresh", strain: "high", strainValue: 15 }),
      conduct("green_high", 90, 5, null), conduct("green", 90, 1, null), conduct("red", 20, 6, null),
    ].map((c) => perceptionCausalLine(c.perception, "15,0") ?? "");
    for (const t of samples) {
      expect(t).not.toMatch(/!/);
      expect(t).not.toMatch(/\b(a|o) aluna?\b|\bela\b|\bele\b/i);
    }
  });
});
