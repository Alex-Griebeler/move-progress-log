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
});
