/**
 * E5.5 — Testes do mapping `CoachConsoleQuestionnaire` →
 * `Precision12EvidenceInput`.
 */

import { describe, expect, it } from "vitest";

import {
  ADHERENCE_RISK_MIN_FLAGS,
  type CoachConsoleQuestionnaire,
} from "../precision12CoachConsole";
import { deriveEvidenceClaims } from "../precision12EvidenceDerivation";
import {
  LIMITATIONS_NOT_COVERED_YET,
  deriveAdherenceFlagsFromResponse,
  indexResponsesByAssessmentId,
  mapQuestionnaireResponseToEvidenceInput,
} from "../precision12EvidenceMapping";

function makeResponse(
  overrides: Partial<CoachConsoleQuestionnaire> = {},
): CoachConsoleQuestionnaire {
  return {
    assessment_id: "a1",
    parq_blocked: false,
    primary_adherence_barrier: null,
    sleep_quality: 5,
    stress_level: 1,
    energy_level: 5,
    consistency_self_rating: "very_consistent",
    life_stability: "stable_organized",
    pain_status: "none",
    uses_medications: false,
    has_medical_condition: false,
    injury_surgery_history: null,
    ...overrides,
  };
}

// ── deriveAdherenceFlagsFromResponse ────────────────────────────────────────

describe("deriveAdherenceFlagsFromResponse", () => {
  it("resposta limpa → todas as flags false e count 0", () => {
    const flags = deriveAdherenceFlagsFromResponse(makeResponse());
    expect(flags).toEqual({
      sleepFlag: false,
      stressFlag: false,
      energyFlag: false,
      barrierFlag: false,
      riskFlagCount: 0,
    });
  });

  it("sleep_quality <= 2 dispara sleepFlag", () => {
    expect(deriveAdherenceFlagsFromResponse(makeResponse({ sleep_quality: 2 })).sleepFlag).toBe(true);
    expect(deriveAdherenceFlagsFromResponse(makeResponse({ sleep_quality: 3 })).sleepFlag).toBe(false);
  });

  it("stress_level >= 4 dispara stressFlag", () => {
    expect(deriveAdherenceFlagsFromResponse(makeResponse({ stress_level: 4 })).stressFlag).toBe(true);
    expect(deriveAdherenceFlagsFromResponse(makeResponse({ stress_level: 3 })).stressFlag).toBe(false);
  });

  it("energy_level <= 2 dispara energyFlag", () => {
    expect(deriveAdherenceFlagsFromResponse(makeResponse({ energy_level: 2 })).energyFlag).toBe(true);
    expect(deriveAdherenceFlagsFromResponse(makeResponse({ energy_level: 3 })).energyFlag).toBe(false);
  });

  it("barreira em ADHERENCE_RISK_BARRIERS dispara barrierFlag", () => {
    expect(
      deriveAdherenceFlagsFromResponse(
        makeResponse({ primary_adherence_barrier: "time" }),
      ).barrierFlag,
    ).toBe(true);
    // Barreiras NÃO listadas (financial_cost, other) não disparam.
    expect(
      deriveAdherenceFlagsFromResponse(
        makeResponse({ primary_adherence_barrier: "financial_cost" }),
      ).barrierFlag,
    ).toBe(false);
  });

  it("riskFlagCount é a soma das 4 flags (0..4)", () => {
    const all = deriveAdherenceFlagsFromResponse(
      makeResponse({
        sleep_quality: 1,
        stress_level: 5,
        energy_level: 1,
        primary_adherence_barrier: "motivation",
      }),
    );
    expect(all.riskFlagCount).toBe(4);
  });

  it("valores null em scores não disparam flag", () => {
    const flags = deriveAdherenceFlagsFromResponse(
      makeResponse({
        sleep_quality: null,
        stress_level: null,
        energy_level: null,
      }),
    );
    expect(flags.sleepFlag).toBe(false);
    expect(flags.stressFlag).toBe(false);
    expect(flags.energyFlag).toBe(false);
  });
});

// ── mapQuestionnaireResponseToEvidenceInput ─────────────────────────────────

describe("mapQuestionnaireResponseToEvidenceInput", () => {
  it("response null → input vazio", () => {
    expect(mapQuestionnaireResponseToEvidenceInput(null)).toEqual({});
  });

  it("response undefined → input vazio", () => {
    expect(mapQuestionnaireResponseToEvidenceInput(undefined)).toEqual({});
  });

  it("parq_blocked === null → não inclui blocked no parq subobject", () => {
    const input = mapQuestionnaireResponseToEvidenceInput(
      makeResponse({ parq_blocked: null }),
    );
    expect(input.parq).toEqual({});
  });

  it("parq_blocked === true é propagado", () => {
    const input = mapQuestionnaireResponseToEvidenceInput(
      makeResponse({ parq_blocked: true }),
    );
    expect(input.parq).toEqual({ blocked: true });
  });

  it("parq_blocked === false é propagado", () => {
    const input = mapQuestionnaireResponseToEvidenceInput(
      makeResponse({ parq_blocked: false }),
    );
    expect(input.parq).toEqual({ blocked: false });
  });

  it("resposta limpa NÃO emite riskFlagCount (abaixo do mínimo agregado)", () => {
    expect(ADHERENCE_RISK_MIN_FLAGS).toBe(2);
    const input = mapQuestionnaireResponseToEvidenceInput(makeResponse());
    expect(input.adherence?.riskFlagCount).toBeUndefined();
    expect(input.adherence?.sleepFlag).toBe(false);
    expect(input.adherence?.stressFlag).toBe(false);
    expect(input.adherence?.energyFlag).toBe(false);
    expect(input.adherence?.barrierFlag).toBe(false);
  });

  it("1 flag isolada → emite a flag mas NÃO emite riskFlagCount", () => {
    const input = mapQuestionnaireResponseToEvidenceInput(
      makeResponse({ sleep_quality: 1 }),
    );
    expect(input.adherence?.sleepFlag).toBe(true);
    expect(input.adherence?.riskFlagCount).toBeUndefined();
  });

  it(">= 2 flags → emite riskFlagCount agregado", () => {
    const input = mapQuestionnaireResponseToEvidenceInput(
      makeResponse({ sleep_quality: 1, stress_level: 5 }),
    );
    expect(input.adherence?.sleepFlag).toBe(true);
    expect(input.adherence?.stressFlag).toBe(true);
    expect(input.adherence?.riskFlagCount).toBe(2);
  });

  it("integra com deriveEvidenceClaims — resposta com 2 flags gera claims agregada + individuais", () => {
    const input = mapQuestionnaireResponseToEvidenceInput(
      makeResponse({
        parq_blocked: true,
        sleep_quality: 1,
        stress_level: 5,
      }),
    );
    const claims = deriveEvidenceClaims(input);
    const labels = claims.map((c) => c.classification);
    expect(labels).toContain("PAR-Q positivo (blocked)");
    expect(labels).toContain("Sono insuficiente");
    expect(labels).toContain("Estresse alto");
    expect(labels).toContain("Risco de adesão (≥ 2 flags)");
  });

  it("integra com deriveEvidenceClaims — resposta limpa + parq cleared → 1 claim de PAR-Q cleared", () => {
    const input = mapQuestionnaireResponseToEvidenceInput(makeResponse());
    const claims = deriveEvidenceClaims(input);
    const labels = claims.map((c) => c.classification);
    expect(labels).toContain("PAR-Q sem sinalizações");
    // Nenhuma claim de adesão (flags false e count abaixo do mínimo)
    expect(labels.filter((l) => l.includes("Sono"))).toEqual([]);
    expect(labels.filter((l) => l.includes("Estresse"))).toEqual([]);
  });
});

// ── indexResponsesByAssessmentId ────────────────────────────────────────────

describe("indexResponsesByAssessmentId", () => {
  it("array vazio → Map vazio", () => {
    expect(indexResponsesByAssessmentId([]).size).toBe(0);
  });

  it("indexa por assessment_id", () => {
    const r1 = makeResponse({ assessment_id: "a1" });
    const r2 = makeResponse({ assessment_id: "a2" });
    const idx = indexResponsesByAssessmentId([r1, r2]);
    expect(idx.size).toBe(2);
    expect(idx.get("a1")).toBe(r1);
    expect(idx.get("a2")).toBe(r2);
  });

  it("response sem assessment_id é ignorada (defensivo)", () => {
    const r1 = makeResponse({ assessment_id: "" });
    const idx = indexResponsesByAssessmentId([r1]);
    expect(idx.size).toBe(0);
  });
});

// ── LIMITATIONS_NOT_COVERED_YET ─────────────────────────────────────────────

describe("LIMITATIONS_NOT_COVERED_YET", () => {
  it("documenta os 5 domínios ainda não cobertos por mappers", () => {
    const domains = LIMITATIONS_NOT_COVERED_YET.map((l) => l.domain);
    expect(domains).toContain("vo2_max");
    expect(domains).toContain("fc_recovery_1min");
    expect(domains).toContain("handgrip");
    expect(domains).toContain("sit_to_stand");
    expect(domains).toContain("dexa");
  });

  it("cada item tem reason não-vazio explicando o motivo", () => {
    for (const item of LIMITATIONS_NOT_COVERED_YET) {
      expect(item.reason.trim().length).toBeGreaterThan(0);
    }
  });
});
