import { describe, expect, it } from "vitest";
import type { WhoopMetrics } from "@/hooks/useWhoopMetrics";
import {
  buildWhoopRecommendation,
  isBaselineWindowTruncated,
  newerUnscoredWhoopDay,
  WHOOP_RECOMMENDATION_WINDOW_DAYS,
} from "@/utils/whoopRecommendation";

const row = (overrides: Partial<WhoopMetrics> = {}): WhoopMetrics => ({
  id: "w1",
  student_id: "s1",
  date: "2026-08-27",
  cycle_id: 1,
  recovery_score: 72,
  hrv_rmssd: 58,
  resting_heart_rate: 52,
  spo2: 97,
  skin_temp: 33.1,
  day_strain: 10,
  kilojoules: 8000,
  sleep_performance: 85,
  sleep_efficiency: 90,
  respiratory_rate: 14,
  total_sleep_duration: 27000,
  deep_sleep_duration: 5400,
  rem_sleep_duration: 5400,
  light_sleep_duration: 14400,
  awake_time: 1800,
  disturbance_count: 8,
  score_state: "SCORED",
  created_at: "2026-08-27T08:00:00Z",
  ...overrides,
});

/** i dias antes de 2026-08-27 (aritmética UTC, padrão do projeto). */
const daysBefore = (i: number) => {
  const d = new Date("2026-08-27T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - i);
  return d.toISOString().slice(0, 10);
};

const window35 = (overrides: (i: number) => Partial<WhoopMetrics> = () => ({})) =>
  Array.from({ length: 35 }, (_, i) =>
    row({ id: `w${i}`, date: daysBefore(i), ...overrides(i) }),
  );

describe("buildWhoopRecommendation (R5 — fiação pura)", () => {
  it("sem linha do dia → null e dayNotScored=false (estado 'sem dado')", () => {
    const out = buildWhoopRecommendation(window35(), "2026-08-28");
    expect(out.recommendation).toBeNull();
    expect(out.dayNotScored).toBe(false);
  });

  it("dia PENDING/UNSCORABLE → dayNotScored=true (estado 'processando')", () => {
    for (const state of ["PENDING_SCORE", "UNSCORABLE"]) {
      const rows = window35((i) => (i === 0 ? { score_state: state } : {}));
      const out = buildWhoopRecommendation(rows, "2026-08-27");
      expect(out.recommendation).toBeNull();
      expect(out.dayNotScored).toBe(true);
    }
  });

  it("dia SCORED com janela cheia → recomendação com o score do dia", () => {
    const out = buildWhoopRecommendation(window35(), "2026-08-27");
    expect(out.recommendation).not.toBeNull();
    expect(out.recommendation!.recoveryScore).toBe(72);
    expect(out.dayNotScored).toBe(false);
  });

  it("bandas nativas EXATAS: verde mantém (0%), amarelo reduz (−20%), vermelho bloqueia (null)", () => {
    // Sem overrides no Whoop (banda final, R4), o mapeamento é determinístico
    // — asserts frouxos ("reduce ou pior") esconderiam reclassificação.
    const cases: Array<[number, string, number | null]> = [
      [80, "maintain", 0],
      [67, "maintain", 0],
      [66, "reduce", -20],
      [50, "reduce", -20],
      [34, "reduce", -20],
      [33, "block", null],
      [20, "block", null],
    ];
    for (const [score, decision, pct] of cases) {
      const rows = window35(() => ({ recovery_score: score }));
      const rec = buildWhoopRecommendation(rows, "2026-08-27").recommendation!;
      expect(rec, `score ${score}`).not.toBeNull();
      expect(rec.loadDecision, `score ${score}`).toBe(decision);
      expect(rec.loadAdjustmentPercent, `score ${score}`).toBe(pct);
      expect(rec.loadDecision).not.toBe("increase"); // Whoop nunca progride (fase 1)
    }
  });

  it("dias POSTERIORES ao selecionado não afetam a recomendação (seleção do dia é exata)", () => {
    // Nota (revisão fria R6): com HRV/FCR fora do Whoop, baseline e
    // histórico ficaram inertes — o que este teste garante HOJE é que a
    // seleção da linha do dia não pega linha futura (scores aberrantes de 5
    // mudariam recoveryScore/banda se vazassem). Quando alguma calibração
    // por aparelho voltar a consumir baseline, reforçar com observável.
    // Snapshot de 3 dias atrás: as 3 linhas mais novas são FUTURO relativo.
    const target = daysBefore(3);
    const rows = window35((i) =>
      i < 3 ? { recovery_score: 5, hrv_rmssd: 5, resting_heart_rate: 90 } : {},
    );
    const withFuture = buildWhoopRecommendation(rows, target).recommendation!;
    const withoutFuture = buildWhoopRecommendation(rows.slice(3), target).recommendation!;
    // Mesmo resultado com ou sem as linhas futuras aberrantes = não vazaram.
    expect(withFuture).toEqual(withoutFuture);
  });

  it("guard de truncamento: fronteiras exatas de 59/60 dias de defasagem", () => {
    // Desde 29/08 (limiares por aparelho) nenhuma regra Whoop consome o
    // baseline — o observável de alerta sumiu de propósito. O guard segue
    // testado direto no predicado, pras calibrações futuras herdarem.
    const anchorPlus = (days: number): string => {
      const d = new Date("2026-08-27T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    // anchor = date → cobertura total
    expect(isBaselineWindowTruncated("2026-08-27", "2026-08-27")).toBe(false);
    // snapshot 59 dias atrás do anchor: janela ainda coberta (anchor−89 = date−30)
    expect(isBaselineWindowTruncated("2026-08-27", anchorPlus(WHOOP_RECOMMENDATION_WINDOW_DAYS - 31))).toBe(false);
    // 60 dias: primeiro dia da janela já ficou fora da consulta
    expect(isBaselineWindowTruncated("2026-08-27", anchorPlus(WHOOP_RECOMMENDATION_WINDOW_DAYS - 30))).toBe(true);
    // caso extremo usado na R5 (70 dias)
    expect(isBaselineWindowTruncated("2026-08-27", anchorPlus(70))).toBe(true);
  });
});

describe("newerUnscoredWhoopDay (dia sem score pulado pelo snapshot)", () => {
  it("hoje pendente + ontem fechado → aponta hoje como PENDING (cenário sem isStale)", () => {
    const rows = [
      row({ id: "hoje", date: "2026-08-27", score_state: "PENDING_SCORE" }),
      row({ id: "ontem", date: "2026-08-26" }),
    ];
    // snapshot teria escolhido ontem (último fechado)
    expect(newerUnscoredWhoopDay(rows, "2026-08-26")).toEqual({
      date: "2026-08-27",
      state: "pending",
    });
  });

  it("UNSCORABLE é estado TERMINAL, distinto de pendente (não promete que vai fechar)", () => {
    const rows = [
      row({ id: "hoje", date: "2026-08-27", score_state: "UNSCORABLE" }),
      row({ id: "ontem", date: "2026-08-26" }),
    ];
    expect(newerUnscoredWhoopDay(rows, "2026-08-26")).toEqual({
      date: "2026-08-27",
      state: "unscorable",
    });
  });

  it("dia sem score IGUAL ou ANTERIOR ao exibido não gera aviso", () => {
    const rows = [
      row({ id: "a", date: "2026-08-27" }),
      row({ id: "b", date: "2026-08-26", score_state: "UNSCORABLE" }),
    ];
    expect(newerUnscoredWhoopDay(rows, "2026-08-27")).toBeNull();
  });

  it("sem NENHUM dia fechado (sinceDate null) → aponta o mais novo com seu estado", () => {
    const rows = [
      row({ id: "a", date: "2026-08-26", score_state: "PENDING_SCORE" }),
      row({ id: "b", date: "2026-08-27", score_state: "UNSCORABLE" }),
    ];
    expect(newerUnscoredWhoopDay(rows, null)).toEqual({ date: "2026-08-27", state: "unscorable" });
  });

  it("score_state null legado NÃO é pendente (é fechado, semântica dos adapters)", () => {
    expect(newerUnscoredWhoopDay([row({ score_state: null })], null)).toBeNull();
    expect(newerUnscoredWhoopDay([], null)).toBeNull();
  });
});

import { computeWhoopContext, WHOOP_HIGH_STRAIN_THRESHOLD } from "@/utils/whoopRecommendation";

describe("computeWhoopContext (R8d — estados fechados)", () => {
  const NOW = new Date("2026-08-29T18:00:00Z").getTime(); // 15:00 SP
  const syncAt = (hoursAgo: number) => new Date(NOW - hoursAgo * 3_600_000).toISOString();
  const base = { connectionUnavailable: false, dayStrain: 10, snapshotIsToday: true, nowMs: NOW };

  it("fresh ≤3h; stale >3h; unavailable sem sync/conexão (corte OPERACIONAL declarado)", () => {
    expect(computeWhoopContext({ ...base, lastSyncAt: syncAt(2) }).freshness).toBe("fresh");
    expect(computeWhoopContext({ ...base, lastSyncAt: syncAt(4) }).freshness).toBe("stale");
    expect(computeWhoopContext({ ...base, lastSyncAt: null }).freshness).toBe("unavailable");
    expect(
      computeWhoopContext({ ...base, lastSyncAt: syncAt(1), connectionUnavailable: true }).freshness,
    ).toBe("unavailable");
  });

  it("strain <14 só é non_high com sync FRESCO (valor velho não certifica)", () => {
    expect(computeWhoopContext({ ...base, lastSyncAt: syncAt(1) }).strain).toBe("non_high");
    expect(computeWhoopContext({ ...base, lastSyncAt: syncAt(5) }).strain).toBe("unavailable");
    expect(computeWhoopContext({ ...base, lastSyncAt: syncAt(1), dayStrain: null }).strain).toBe("unavailable");
    expect(
      computeWhoopContext({ ...base, lastSyncAt: syncAt(5), dayStrain: 15 }).strain,
    ).toBe("high"); // alto de horas atrás continua alto (veto se sustenta)
  });

  it("alerta de strain: só HOJE + sync conhecido + ≥14, com horário na copy", () => {
    const alerting = computeWhoopContext({ ...base, lastSyncAt: syncAt(1), dayStrain: 14.6 });
    expect(alerting.strainAlert?.level).toBe("WARNING");
    expect(alerting.strainAlert?.kind).toBe("contextual");
    expect(alerting.strainAlert?.message).toContain("14.6/21");
    expect(alerting.strainAlert?.message).toContain("na sincronização das");
    expect(alerting.strainAlert?.message).toMatch(/≥14/);
    // snapshot de ONTEM nunca gera "strain antes da sessão" de hoje
    expect(
      computeWhoopContext({ ...base, lastSyncAt: syncAt(1), dayStrain: 15, snapshotIsToday: false }).strainAlert,
    ).toBeNull();
    // sem sync conhecido, nada de alerta
    expect(
      computeWhoopContext({ ...base, lastSyncAt: null, dayStrain: 15 }).strainAlert,
    ).toBeNull();
    expect(WHOOP_HIGH_STRAIN_THRESHOLD).toBe(14);
  });

  it("conexão indisponível zera TUDO — até strain ≥14 vira unavailable", () => {
    const ctx = computeWhoopContext({ ...base, lastSyncAt: syncAt(1), connectionUnavailable: true, dayStrain: 18 });
    expect(ctx.freshness).toBe("unavailable");
    expect(ctx.strain).toBe("unavailable");
    expect(ctx.strainAlert).toBeNull();
  });

  it("snapshot de ONTEM: strain da conduta é unavailable (baixo de ontem não libera hoje)", () => {
    const low = computeWhoopContext({ ...base, lastSyncAt: syncAt(1), dayStrain: 5, snapshotIsToday: false });
    expect(low.strain).toBe("unavailable");
    const high = computeWhoopContext({ ...base, lastSyncAt: syncAt(1), dayStrain: 16, snapshotIsToday: false });
    expect(high.strain).toBe("unavailable");
    expect(high.strainAlert).toBeNull();
  });

  it("fronteiras exatas: 3h ainda fresh, 3h+ε stale; 13.99 non_high, 14 high", () => {
    expect(computeWhoopContext({ ...base, lastSyncAt: syncAt(3) }).freshness).toBe("fresh");
    expect(computeWhoopContext({ ...base, lastSyncAt: syncAt(3.01) }).freshness).toBe("stale");
    expect(computeWhoopContext({ ...base, lastSyncAt: syncAt(1), dayStrain: 13.99 }).strain).toBe("non_high");
    expect(computeWhoopContext({ ...base, lastSyncAt: syncAt(1), dayStrain: 14 }).strain).toBe("high");
  });

  it("syncDisplay em HH:mm no fuso SP", () => {
    const ctx = computeWhoopContext({ ...base, lastSyncAt: "2026-08-29T13:20:00Z" });
    expect(ctx.syncDisplay).toBe("10:20");
  });
});
