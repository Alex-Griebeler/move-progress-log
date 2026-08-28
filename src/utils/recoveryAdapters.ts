/**
 * Adapters puros: fonte crua → contrato normalizado do motor (R3).
 *
 * O adapter converte nomes, unidades e DISPONIBILIDADE — nunca política.
 * Campo ausente fica `undefined` (a regra correspondente vira not_evaluated
 * no motor); nenhum zero é fabricado.
 */

import type { OuraMetrics } from "@/hooks/useOuraMetrics";
import type { OuraBaseline } from "@/hooks/useOuraBaseline";
import type { OuraAcuteMetrics } from "@/hooks/useOuraAcuteMetrics";
import type { WhoopMetrics } from "@/hooks/useWhoopMetrics";
import type {
  RecoveryBaselineInput,
  RecoveryDayInput,
  RecoveryHistoryDay,
} from "@/utils/recoveryEngine";

const num = (v: number | null | undefined): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

// ── OURA ────────────────────────────────────────────────────────────────────

/** Dia Oura → input do motor. null quando não há score fechado. */
export const ouraToRecoveryInput = (
  metrics: OuraMetrics,
  acuteMetrics?: OuraAcuteMetrics | null,
): RecoveryDayInput | null => {
  if (metrics.readiness_score == null) return null;

  const acute =
    acuteMetrics &&
    (acuteMetrics.samples_count_hrv > 0 || acuteMetrics.samples_count_hr_day > 0)
      ? {
          hrvNightLastMs:
            acuteMetrics.samples_count_hrv > 0 ? num(acuteMetrics.hrv_night_last) : undefined,
          hrvNightMinMs:
            acuteMetrics.samples_count_hrv > 0 ? num(acuteMetrics.hrv_night_min) : undefined,
          hrDayMaxBpm:
            acuteMetrics.samples_count_hr_day > 0 ? num(acuteMetrics.hr_day_max) : undefined,
          hrDayAvgBpm:
            acuteMetrics.samples_count_hr_day > 0 ? num(acuteMetrics.hr_day_avg) : undefined,
        }
      : undefined;

  return {
    source: "oura",
    date: metrics.date,
    score: metrics.readiness_score,
    sleepScore: num(metrics.sleep_score),
    sleepDurationSeconds: num(metrics.total_sleep_duration),
    sleepEfficiencyPercent: num(metrics.sleep_efficiency),
    hrvRmssdMs: num(metrics.average_sleep_hrv),
    restingHeartRateBpm: num(metrics.resting_heart_rate),
    stressHighSeconds: num(metrics.stress_high_time),
    acute,
  };
};

/**
 * Histórico Oura → dias do histórico. TODOS os dias entram (dia sem
 * readiness ainda soma calorias na fadiga); `scoreClosed` marca os que
 * contam pro histórico mínimo.
 */
export const ouraHistoryToRecoveryDays = (recent: OuraMetrics[]): RecoveryHistoryDay[] =>
  recent.map((m) => ({
    date: m.date,
    scoreClosed: m.readiness_score != null,
    activeCaloriesKcal: m.active_calories ?? 0,
  }));

/** Baseline Oura → contrato. Preserva o fallback populacional histórico. */
export const ouraBaselineToRecoveryBaseline = (
  baseline?: OuraBaseline,
): RecoveryBaselineInput => {
  if (!baseline || !baseline.hasMinimumData) {
    return {
      source: "oura",
      avgHrv: 65,
      avgRhr: 60,
      avgSleepScore: 75,
      dataPoints: baseline?.dataPoints ?? 0,
      usingPopulationDefaults: true,
    };
  }
  return {
    source: "oura",
    avgHrv: baseline.avgHRV,
    avgRhr: baseline.avgRHR,
    avgSleepScore: baseline.avgSleepScore,
    dataPoints: baseline.dataPoints,
    usingPopulationDefaults: false,
  };
};

// ── WHOOP ───────────────────────────────────────────────────────────────────

const WHOOP_MIN_BASELINE_SAMPLES = 7;

/** Dia Whoop → input do motor. null sem recovery SCORED. */
export const whoopToRecoveryInput = (w: WhoopMetrics): RecoveryDayInput | null => {
  if (w.recovery_score == null) return null;
  if (w.score_state && w.score_state !== "SCORED") return null;

  return {
    source: "whoop",
    date: w.date,
    score: w.recovery_score,
    nativeBand: w.recovery_score >= 67 ? "green" : w.recovery_score >= 34 ? "yellow" : "red",
    sleepScore: num(w.sleep_performance),
    sleepDurationSeconds: num(w.total_sleep_duration),
    sleepEfficiencyPercent: num(w.sleep_efficiency),
    hrvRmssdMs: num(w.hrv_rmssd),
    restingHeartRateBpm: num(w.resting_heart_rate),
    // stressHighSeconds: inexistente no Whoop → regra not_evaluated
    // activeCaloriesKcal: o kilojoule do Whoop inclui gasto BASAL e não
    // equivale às calorias ativas do Oura → fadiga not_evaluated
    // acute: pipeline intra-noite/intra-dia é Oura-only
  };
};

export const whoopHistoryToRecoveryDays = (rows: WhoopMetrics[]): RecoveryHistoryDay[] =>
  rows.map((w) => ({
    date: w.date,
    scoreClosed: w.recovery_score != null && (!w.score_state || w.score_state === "SCORED"),
    // sem calorias ativas equivalentes no Whoop → fadiga not_evaluated
  }));

/**
 * Baseline Whoop calculado client-side: média de 30 dias de CALENDÁRIO
 * anteriores ao dia avaliado (o próprio dia fica de fora — ele é o que está
 * sendo comparado). Sem defaults populacionais: métrica com menos de 7
 * amostras vira null e a regra correspondente pula.
 */
export const buildWhoopBaseline = (
  rows: WhoopMetrics[],
  asOfDate: string,
  lookbackDays = 30,
): RecoveryBaselineInput => {
  const start = (() => {
    const d = new Date(`${asOfDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - lookbackDays);
    return d.toISOString().slice(0, 10);
  })();

  const window = rows.filter(
    (w) =>
      w.date >= start &&
      w.date < asOfDate &&
      (!w.score_state || w.score_state === "SCORED"),
  );

  const metric = (pick: (w: WhoopMetrics) => number | null | undefined) => {
    const values = window
      .map(pick)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (values.length < WHOOP_MIN_BASELINE_SAMPLES) return { avg: null, count: values.length };
    return { avg: values.reduce((s, v) => s + v, 0) / values.length, count: values.length };
  };

  const hrv = metric((w) => w.hrv_rmssd);
  const rhr = metric((w) => w.resting_heart_rate);
  const sleep = metric((w) => w.sleep_performance);

  return {
    source: "whoop",
    avgHrv: hrv.avg,
    avgRhr: rhr.avg,
    avgSleepScore: sleep.avg,
    dataPoints: Math.max(hrv.count, rhr.count, sleep.count),
    usingPopulationDefaults: false,
  };
};
