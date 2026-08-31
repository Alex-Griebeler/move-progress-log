/**
 * Check-in v3 — tradutores e adapter (spec v7+v7.2 com GO; PR-B1).
 * Régua ±2 e bandas PSR ratificadas pelo Alex em 31/08.
 */
import { describe, expect, it } from "vitest";
import {
  buildPsrOnlyRecommendation,
  derivePerceptionFromPsr,
  deriveZoneFromPsrOnly,
  normalizePsr,
} from "../checkin";

describe("normalizePsr — domínio 0..10 inteiro (v6.1-M7)", () => {
  it("aceita 0 e 10 (0 é resposta válida, NUNCA confundir com ausente)", () => {
    expect(normalizePsr(0)).toBe(0);
    expect(normalizePsr(10)).toBe(10);
  });
  it.each([[-1], [11], [5.5], [NaN], [Infinity], [null], [undefined], ["7"]])(
    "rejeita %s como null",
    (v) => {
      expect(normalizePsr(v)).toBe(null);
    },
  );
});

describe("derivePerceptionFromPsr — régua ±2 sobre score/10 (ratificada)", () => {
  it("null é o ÚNICO caminho pra nao_informada; psr 0 responde", () => {
    expect(derivePerceptionFromPsr(null, 70)).toBe("nao_informada");
    expect(derivePerceptionFromPsr(0, 70)).toBe("pior");
  });
  it("limites EXATOS ±2 entram em pior/melhor", () => {
    // score 50 → esperado 5.
    expect(derivePerceptionFromPsr(3, 50)).toBe("pior"); // diff exatamente −2
    expect(derivePerceptionFromPsr(7, 50)).toBe("melhor"); // diff exatamente +2
    expect(derivePerceptionFromPsr(4, 50)).toBe("condizente");
    expect(derivePerceptionFromPsr(6, 50)).toBe("condizente");
  });
  it.each([
    // Degenerações CONHECIDAS (v7.2-M10) — fórmula ratificada, viram registro:
    [0, 18, "condizente"], // diff −1,8: dia péssimo + PSR 0 fica condizente (piso do funil protege)
    [0, 0, "condizente"],
    [10, 100, "condizente"],
    [10, 33, "melhor"],
    [1, 45, "pior"],
    [5, 34, "condizente"],
    [7, 44, "melhor"],
  ] as Array<[number, number, string]>)(
    "psr %s + score %s → %s",
    (psr, score, expected) => {
      expect(derivePerceptionFromPsr(psr, score)).toBe(expected);
    },
  );
  it("score fora de 0-100 é clampado defensivamente", () => {
    expect(derivePerceptionFromPsr(8, 250)).toBe("pior"); // clamp 100 → esperado 10 → diff −2
    expect(derivePerceptionFromPsr(2, -50)).toBe("melhor"); // clamp 0 → esperado 0 → diff +2
  });
});

describe("deriveZoneFromPsrOnly — bandas ratificadas (7-10/4-6/2-3/0-1)", () => {
  it.each([
    [10, 3], [7, 3],
    [6, 2], [4, 2],
    [3, 1], [2, 1],
    [1, 0], [0, 0],
  ] as Array<[number, number]>)("psr %s → zona %s", (psr, zone) => {
    expect(deriveZoneFromPsrOnly(psr)).toBe(zone);
  });
  it("zona 4 é INALCANÇÁVEL por PSR (progressão exige dado objetivo)", () => {
    for (let psr = 0; psr <= 10; psr++) {
      expect(deriveZoneFromPsrOnly(psr)).toBeLessThanOrEqual(3);
    }
  });
  it("PSR inválido lança (o chamador valida antes)", () => {
    expect(() => deriveZoneFromPsrOnly(11)).toThrow();
  });
});

describe("buildPsrOnlyRecommendation — adapter documentado (v7.2-B3)", () => {
  it("NUNCA emite increase; cargas por banda batem a tabela ratificada", () => {
    for (let psr = 0; psr <= 10; psr++) {
      expect(buildPsrOnlyRecommendation(psr).loadDecision).not.toBe("increase");
    }
    expect(buildPsrOnlyRecommendation(8)).toMatchObject({ loadDecision: "maintain", loadAdjustmentPercent: 0 });
    expect(buildPsrOnlyRecommendation(5)).toMatchObject({ loadDecision: "reduce", loadAdjustmentPercent: -20 });
    expect(buildPsrOnlyRecommendation(2)).toMatchObject({ loadDecision: "block", loadAdjustmentPercent: null });
    expect(buildPsrOnlyRecommendation(0)).toMatchObject({ loadDecision: "block", loadAdjustmentPercent: null });
  });
  it("alerts sempre vazio e SEM protocolos (zona 0 por PSR usa descanso sem protocolos)", () => {
    const rec = buildPsrOnlyRecommendation(0);
    expect(rec.alerts).toEqual([]);
    expect(rec.priorityProtocols).toBeUndefined();
    expect(rec.zone).toBe("red");
  });
  it("recoveryScore é o PRÓPRIO PSR (escala 0-10, nunca 0-100) e source é psr", () => {
    const rec = buildPsrOnlyRecommendation(7);
    expect(rec.recoveryScore).toBe(7);
    expect(rec.source).toBe("psr");
    expect(rec.zone).toBe("green");
    expect(rec.overrideApplied).toBe(false);
  });
  it("auditoria declara o motor fisiológico como pulado", () => {
    expect(buildPsrOnlyRecommendation(4).skippedRules).toEqual([
      { rule: "motor_fisiologico", reason: "sem dispositivo conectado" },
    ]);
  });
});
