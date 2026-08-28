import { describe, expect, it } from "vitest";
import {
  buildWhoopBaseline,
  ouraHistoryToRecoveryDays,
  whoopToRecoveryInput,
} from "../recoveryAdapters";
import type { WhoopMetrics } from "@/hooks/useWhoopMetrics";

const whoopRow = (overrides: Partial<WhoopMetrics> = {}): WhoopMetrics => ({
  id: "w1",
  student_id: "s1",
  date: "2026-08-28",
  cycle_id: 1,
  recovery_score: 70,
  hrv_rmssd: 60,
  resting_heart_rate: 55,
  spo2: 97,
  skin_temp: 33,
  day_strain: 10,
  kilojoules: 9000,
  sleep_performance: 80,
  sleep_efficiency: 90,
  respiratory_rate: 14,
  total_sleep_duration: 27000,
  deep_sleep_duration: 6000,
  rem_sleep_duration: 6000,
  light_sleep_duration: 12000,
  awake_time: 1500,
  disturbance_count: 5,
  score_state: "SCORED",
  created_at: "2026-08-28T08:00:00Z",
  ...overrides,
});

describe("whoopToRecoveryInput", () => {
  it("converte dia SCORED com a banda nativa correta", () => {
    expect(whoopToRecoveryInput(whoopRow({ recovery_score: 67 }))!.nativeBand).toBe("green");
    expect(whoopToRecoveryInput(whoopRow({ recovery_score: 66 }))!.nativeBand).toBe("yellow");
    expect(whoopToRecoveryInput(whoopRow({ recovery_score: 34 }))!.nativeBand).toBe("yellow");
    expect(whoopToRecoveryInput(whoopRow({ recovery_score: 33 }))!.nativeBand).toBe("red");
  });

  it("dia pendente ou inscorável NÃO vira input", () => {
    expect(whoopToRecoveryInput(whoopRow({ score_state: "PENDING_SCORE" }))).toBeNull();
    expect(whoopToRecoveryInput(whoopRow({ score_state: "UNSCORABLE" }))).toBeNull();
    expect(whoopToRecoveryInput(whoopRow({ recovery_score: null }))).toBeNull();
  });

  it("NÃO expõe estresse, calorias nem agudas (fonte não tem equivalente)", () => {
    const input = whoopToRecoveryInput(whoopRow())!;
    expect(input.stressHighSeconds).toBeUndefined();
    expect(input.acute).toBeUndefined();
    expect("activeCaloriesKcal" in input).toBe(false);
  });

  it("campo nulo vira undefined, nunca zero fabricado", () => {
    const input = whoopToRecoveryInput(whoopRow({ hrv_rmssd: null, sleep_efficiency: null }))!;
    expect(input.hrvRmssdMs).toBeUndefined();
    expect(input.sleepEfficiencyPercent).toBeUndefined();
  });
});

describe("buildWhoopBaseline", () => {
  const series = (n: number, overrides: (i: number) => Partial<WhoopMetrics> = () => ({})) =>
    Array.from({ length: n }, (_, i) =>
      whoopRow({
        id: `w${i}`,
        date: `2026-08-${String(i + 1).padStart(2, "0")}`,
        ...overrides(i),
      }),
    );

  it("média das amostras da janela, EXCLUINDO o próprio dia avaliado", () => {
    const rows = series(10, (i) => ({ hrv_rmssd: i === 9 ? 999 : 60 })); // dia 10 = avaliado
    const b = buildWhoopBaseline(rows, "2026-08-10");
    expect(b.avgHrv).toBe(60); // o 999 do dia avaliado fica de fora
    expect(b.source).toBe("whoop");
  });

  it("métrica com menos de 7 amostras vira null (sem default populacional)", () => {
    const rows = series(10, (i) => ({ hrv_rmssd: i < 5 ? 60 : null }));
    const b = buildWhoopBaseline(rows, "2026-08-11");
    expect(b.avgHrv).toBeNull(); // só 5 amostras de HRV
    expect(b.avgRhr).not.toBeNull(); // FC tem 10
    expect(b.usingPopulationDefaults).toBe(false);
  });

  it("dias PENDING/UNSCORABLE ficam fora do baseline", () => {
    // 10 linhas, 4 pendentes → 6 amostras SCORED < 7 → todas as métricas null
    const poucos = buildWhoopBaseline(
      series(10, (i) => ({ score_state: i < 4 ? "PENDING_SCORE" : "SCORED" })),
      "2026-08-11",
    );
    expect(poucos.avgHrv).toBeNull();
    expect(poucos.avgRhr).toBeNull();

    // 3 pendentes → 7 SCORED = mínimo atingido
    const suficientes = buildWhoopBaseline(
      series(10, (i) => ({ score_state: i < 3 ? "PENDING_SCORE" : "SCORED" })),
      "2026-08-11",
    );
    expect(suficientes.avgHrv).toBe(60);
  });

  it("janela respeita o lookback (30 dias por padrão)", () => {
    const oldRow = whoopRow({ id: "old", date: "2026-06-01", hrv_rmssd: 999 });
    const recent = series(8);
    const b = buildWhoopBaseline([oldRow, ...recent], "2026-08-09");
    expect(b.avgHrv).toBe(60); // 999 de junho não entra
  });
});

describe("ouraHistoryToRecoveryDays", () => {
  it("dia sem readiness ainda carrega calorias (fadiga), mas não conta score", () => {
    const days = ouraHistoryToRecoveryDays([
      { date: "2026-08-27", readiness_score: 80, active_calories: 400 } as never,
      { date: "2026-08-28", readiness_score: null, active_calories: 500 } as never,
    ]);
    expect(days[0]).toEqual({ date: "2026-08-27", scoreClosed: true, activeCaloriesKcal: 400 });
    expect(days[1]).toEqual({ date: "2026-08-28", scoreClosed: false, activeCaloriesKcal: 500 });
  });
});
