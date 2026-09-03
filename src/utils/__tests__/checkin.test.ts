/**
 * Check-in v3 — tradutores e adapter (spec v7+v7.2 com GO; PR-B1).
 * Bandas PSR ratificadas pelo Alex em 31/08; régua ±2 MORTA na v9.2 (03/09):
 * o único tradutor é toPsrSignal.
 */
import { describe, expect, it } from "vitest";
import {
  buildPsrOnlyRecommendation,
  deriveZoneFromPsrOnly,
  normalizePsr,
  toPsrSignal,
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

describe("toPsrSignal — sinal indivisível {value, zone} (v9.2 E3)", () => {
  it.each([
    [null, null, null], [undefined, null, null], [NaN, null, null], [-1, null, null], [11, null, null], [5.5, null, null], ["7", null, null],
    [0, 0, 0], [1, 1, 0], [2, 2, 1], [3, 3, 1], [4, 4, 2], [6, 6, 2], [7, 7, 3], [10, 10, 3],
  ] as Array<[unknown, number | null, number | null]>)("%s → value %s / zone %s", (raw, value, zone) => {
    expect(toPsrSignal(raw)).toEqual({ value, zone });
  });
  it("PSR 0 é resposta VÁLIDA (zona 0), nunca 'não informado'", () => {
    expect(toPsrSignal(0)).toEqual({ value: 0, zone: 0 });
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
