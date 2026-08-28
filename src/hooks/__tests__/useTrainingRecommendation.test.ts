import { describe, expect, it } from "vitest";
import { calculateTrainingRecommendation } from "../useTrainingRecommendation";
import type { OuraMetrics } from "../useOuraMetrics";
import type { OuraBaseline } from "../useOuraBaseline";
import type { OuraAcuteMetrics } from "../useOuraAcuteMetrics";

const baseline: OuraBaseline = {
  avgHRV: 65,
  avgRHR: 60,
  avgSleepScore: 75,
  dataPoints: 14,
  hasMinimumData: true,
};

function buildMetrics(overrides: Partial<OuraMetrics> = {}): OuraMetrics {
  return {
    id: "metric-1",
    student_id: "student-1",
    date: "2026-04-12",
    readiness_score: 70,
    sleep_score: 78,
    hrv_balance: 90,
    resting_heart_rate: 60,
    temperature_deviation: 0,
    activity_balance: 0,
    activity_score: 80,
    steps: 9000,
    active_calories: 500,
    total_calories: 2200,
    met_minutes: 45,
    high_activity_time: 1200,
    medium_activity_time: 2400,
    low_activity_time: 3600,
    sedentary_time: 18000,
    training_volume: 1,
    training_frequency: 1,
    total_sleep_duration: 25200,
    deep_sleep_duration: 5400,
    rem_sleep_duration: 4500,
    light_sleep_duration: 12600,
    awake_time: 700,
    sleep_efficiency: 90,
    sleep_latency: 600,
    lowest_heart_rate: 50,
    average_sleep_hrv: 70,
    average_breath: 14,
    stress_high_time: 1200,
    recovery_high_time: 3600,
    day_summary: "normal",
    spo2_average: 97,
    breathing_disturbance_index: 1,
    vo2_max: 40,
    resilience_level: "normal",
    created_at: "2026-04-12T10:00:00.000Z",
    ...overrides,
  };
}

function buildAcuteMetrics(overrides: Partial<OuraAcuteMetrics> = {}): OuraAcuteMetrics {
  return {
    id: "acute-1",
    student_id: "student-1",
    date: "2026-04-12",
    sleep_hrv_series: null,
    sleep_hr_series: null,
    day_hr_series: null,
    sleep_phase_5min: null,
    movement_30_sec: null,
    stress_samples: null,
    hrv_night_min: 50,
    hrv_night_max: 80,
    hrv_night_last: 70,
    hrv_night_stddev: 8,
    hr_night_min: 50,
    hr_night_max: 72,
    hr_night_last: 58,
    hr_day_min: 58,
    hr_day_max: 102,
    hr_day_avg: 74,
    samples_count_hrv: 0,
    samples_count_hr_day: 0,
    created_at: "2026-04-12T10:00:00.000Z",
    updated_at: "2026-04-12T10:00:00.000Z",
    ...overrides,
  };
}

function buildRecentMetrics(days: number, activeCalories = 500): OuraMetrics[] {
  return Array.from({ length: days }, (_, index) =>
    buildMetrics({
      id: `recent-${index}`,
      date: `2026-04-${String(index + 1).padStart(2, "0")}`,
      active_calories: activeCalories,
      created_at: `2026-04-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
    })
  );
}

describe("R2 — bugs do motor corrigidos", () => {
  it("(c) sem score de prontidão fechado → SEM recomendação, não um 50 inventado", () => {
    const rec = calculateTrainingRecommendation(
      buildMetrics({ readiness_score: null }),
      buildRecentMetrics(10),
      baseline,
    );
    expect(rec).toBeNull();
  });

  it("(b) fadiga 'semanal' soma só 7 dias de calendário do dia avaliado", () => {
    // 30 dias com 500 kcal/dia: janela de 7 dias = 3500 (fadiga LOW, <7000).
    // A soma antiga de 30 dias daria 15000 (HIGH) e rebaixaria a zona.
    const recent = buildRecentMetrics(30, 500);
    // fixture gera datas ASCENDENTES — o dia avaliado é o último
    const metrics = buildMetrics({ readiness_score: 90, date: recent[recent.length - 1].date });
    const rec = calculateTrainingRecommendation(metrics, recent, baseline);
    expect(rec!.fatigueLevel).toBe("low");
    expect(rec!.zone).toBe("green_high"); // 90 + fadiga low = zona 4
  });

  it("(b) fadiga alta REAL na semana continua detectada", () => {
    const recent = buildRecentMetrics(7, 1600); // 7×1600 = 11200 > 10000
    const metrics = buildMetrics({ readiness_score: 90, date: recent[recent.length - 1].date });
    const rec = calculateTrainingRecommendation(metrics, recent, baseline);
    expect(rec!.fatigueLevel).toBe("high");
    expect(rec!.zone).not.toBe("green_high"); // fadiga alta veta zona 4
  });

  it("(b) fronteira da janela: weekStart entra, weekStart−1 fica de fora", () => {
    const mk = (date: string, kcal: number) =>
      buildMetrics({ id: date, date, active_calories: kcal });
    const recent = [
      mk("2026-04-03", 5000), // weekStart-1 (fora)
      mk("2026-04-04", 5000), // weekStart (dentro)
      mk("2026-04-10", 5000), // dia avaliado (dentro)
    ];
    const rec = calculateTrainingRecommendation(
      buildMetrics({ readiness_score: 90, date: "2026-04-10" }),
      recent,
      baseline,
    );
    // 2×5000 = 10000 → NÃO passa o corte high (>10000); com o dia de fora
    // incluído seriam 15000 → high. fatigueLevel moderate prova a fronteira.
    expect(rec!.fatigueLevel).toBe("moderate");
  });

  it("(f) linha sem readiness não conta como 'dia de dado' no histórico mínimo", () => {
    const recent = [
      ...buildRecentMetrics(5),
      ...buildRecentMetrics(4).map((m, i) => ({ ...m, date: `2025-12-0${i + 1}`, readiness_score: null })),
    ];
    const rec = calculateTrainingRecommendation(buildMetrics(), recent, baseline);
    // 5 válidas + 4 nulas = histórico ainda em construção (< 7 válidas)
    const onboarding = rec!.alerts.find((a) => a.kind === "onboarding");
    expect(onboarding).toBeTruthy();
    expect(onboarding!.message).toContain("Coletamos 5 dias");
  });
});

describe("alertas estruturados (R1) — metric/kind/shortLabel na saída real", () => {
  it("FC repouso elevada sai com metric fc_repouso e rótulo específico", () => {
    const rec = calculateTrainingRecommendation(
      buildMetrics({ resting_heart_rate: baseline.avgRHR + 7 }),
      buildRecentMetrics(10),
      baseline,
    );
    const alert = rec!.alerts.find((a) => a.metric === "fc_repouso");
    expect(alert).toBeTruthy();
    expect(alert!.kind).toBe("fisiologico");
    expect(alert!.shortLabel).toBe("Acima do basal");
  });

  it("histórico em construção é onboarding sem métrica", () => {
    const rec = calculateTrainingRecommendation(
      buildMetrics(),
      buildRecentMetrics(3), // < 7 dias
      baseline,
    );
    const alert = rec!.alerts.find((a) => a.kind === "onboarding");
    expect(alert).toBeTruthy();
    expect(alert!.metric).toBeNull();
  });

  it("todo alerta emitido carrega os 3 campos estruturais", () => {
    const rec = calculateTrainingRecommendation(
      buildMetrics({
        resting_heart_rate: baseline.avgRHR + 15,
        total_sleep_duration: 20000,
        stress_high_time: 8000,
      }),
      buildRecentMetrics(10),
      baseline,
    );
    expect(rec!.alerts.length).toBeGreaterThan(0);
    for (const a of rec!.alerts) {
      expect(["fisiologico", "onboarding", "override"]).toContain(a.kind);
      expect("metric" in a).toBe(true);
      expect("shortLabel" in a).toBe(true);
    }
  });
});

describe("calculateTrainingRecommendation", () => {
  it("returns green_high with increase when readiness is high and no override", () => {
    const recommendation = calculateTrainingRecommendation(
      buildMetrics({ readiness_score: 90, resting_heart_rate: 61 }),
      buildRecentMetrics(7, 500),
      baseline
    );

    expect(recommendation?.zone).toBe("green_high");
    expect(recommendation?.loadDecision).toBe("increase");
    expect(recommendation?.overrideApplied).toBe(false);
  });

  it("applies override and downgrades one zone when RHR is significantly elevated", () => {
    const recommendation = calculateTrainingRecommendation(
      buildMetrics({ readiness_score: 72, resting_heart_rate: 69 }),
      buildRecentMetrics(7, 500),
      baseline
    );

    expect(recommendation?.overrideApplied).toBe(true);
    expect(recommendation?.zone).toBe("yellow");
    expect(recommendation?.loadDecision).toBe("reduce");
  });

  it("adds CRITICAL alert when RHR exceeds baseline by more than 10 bpm", () => {
    const recommendation = calculateTrainingRecommendation(
      buildMetrics({ readiness_score: 72, resting_heart_rate: 71 }),
      buildRecentMetrics(7, 500),
      baseline
    );

    const criticalAlert = recommendation?.alerts.find(
      (alert) => alert.level === "CRITICAL" && alert.message.includes("muito elevada")
    );

    expect(criticalAlert).toBeDefined();
  });

  it("does not apply override when history is below 7 days", () => {
    const recommendation = calculateTrainingRecommendation(
      buildMetrics({ readiness_score: 72, resting_heart_rate: 80 }),
      buildRecentMetrics(3, 500),
      baseline
    );

    expect(recommendation?.overrideApplied).toBe(false);
    expect(recommendation?.zone).toBe("green");
  });

  it("applies acute HRV override when last night block is very low", () => {
    const recommendation = calculateTrainingRecommendation(
      buildMetrics({ readiness_score: 90, resting_heart_rate: 60 }),
      buildRecentMetrics(7, 500),
      baseline,
      undefined,
      buildAcuteMetrics({ samples_count_hrv: 4, hrv_night_last: 40 })
    );

    expect(recommendation?.overrideApplied).toBe(true);
    expect(recommendation?.zone).toBe("green");
  });

  it("blocks load on red zone", () => {
    const recommendation = calculateTrainingRecommendation(
      buildMetrics({ readiness_score: 20 }),
      buildRecentMetrics(7, 500),
      baseline
    );

    expect(recommendation?.zone).toBe("red");
    expect(recommendation?.loadDecision).toBe("block");
  });

  it("applies one-zone override when sleep is insufficient and stress is high", () => {
    const recommendation = calculateTrainingRecommendation(
      buildMetrics({
        readiness_score: 72,
        total_sleep_duration: 20000,
        stress_high_time: 9000,
        resting_heart_rate: 60,
      }),
      buildRecentMetrics(7, 500),
      baseline
    );

    expect(recommendation?.overrideApplied).toBe(true);
    expect(recommendation?.zone).toBe("yellow");
    expect(recommendation?.alerts.some((alert) => alert.message.includes("Override agudo"))).toBe(
      true
    );
  });

  it("does not apply downgrade override when already in red zone", () => {
    const recommendation = calculateTrainingRecommendation(
      buildMetrics({
        readiness_score: 18,
        resting_heart_rate: 75,
        total_sleep_duration: 18000,
        stress_high_time: 10000,
      }),
      buildRecentMetrics(7, 500),
      baseline,
      undefined,
      buildAcuteMetrics({ samples_count_hrv: 4, hrv_night_last: 35 })
    );

    expect(recommendation?.zone).toBe("red");
    expect(recommendation?.overrideApplied).toBe(false);
    expect(recommendation?.loadDecision).toBe("block");
  });

  it("does not apply acute HRV override when there are no acute HRV samples", () => {
    const recommendation = calculateTrainingRecommendation(
      buildMetrics({ readiness_score: 90, resting_heart_rate: 60 }),
      buildRecentMetrics(7, 500),
      baseline,
      undefined,
      buildAcuteMetrics({ samples_count_hrv: 0, hrv_night_last: 35 })
    );

    expect(recommendation?.overrideApplied).toBe(false);
    expect(recommendation?.zone).toBe("green_high");
    expect(recommendation?.loadDecision).toBe("increase");
  });

  it("maps expected adjustment percentages per final zone", () => {
    const green = calculateTrainingRecommendation(
      buildMetrics({ readiness_score: 72, resting_heart_rate: 60 }),
      buildRecentMetrics(7, 500),
      baseline
    );
    const yellow = calculateTrainingRecommendation(
      buildMetrics({ readiness_score: 52, resting_heart_rate: 60 }),
      buildRecentMetrics(7, 500),
      baseline
    );

    expect(green?.zone).toBe("green");
    expect(green?.loadAdjustmentPercent).toBe(0);
    expect(yellow?.zone).toBe("yellow");
    expect(yellow?.loadAdjustmentPercent).toBe(-20);
  });
});
