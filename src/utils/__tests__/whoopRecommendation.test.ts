import { describe, expect, it } from "vitest";
import type { WhoopMetrics } from "@/hooks/useWhoopMetrics";
import { buildWhoopRecommendation } from "@/utils/whoopRecommendation";

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

  it("invariantes das bandas nativas: verde nunca aumenta, amarelo reduz, vermelho bloqueia número", () => {
    const cases: Array<[number, string[], number | null | "any"]> = [
      [80, ["maintain", "reduce", "block"], "any"], // verde: nunca "increase"
      [50, ["reduce", "block"], "any"],             // amarelo: reduz (ou pior)
      [20, ["block"], null],                         // vermelho: sem sugestão numérica
    ];
    for (const [score, allowed, pct] of cases) {
      const rows = window35(() => ({ recovery_score: score }));
      const rec = buildWhoopRecommendation(rows, "2026-08-27").recommendation!;
      expect(rec).not.toBeNull();
      expect(allowed).toContain(rec.loadDecision);
      expect(rec.loadDecision).not.toBe("increase");
      if (pct === null) expect(rec.loadAdjustmentPercent).toBeNull();
    }
  });

  it("dias POSTERIORES ao selecionado não contaminam histórico nem baseline", () => {
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
});
