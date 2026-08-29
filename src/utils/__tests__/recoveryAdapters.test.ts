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
  it("converte dia SCORED sem duplicar a derivação de banda (vive só no motor)", () => {
    const input = whoopToRecoveryInput(whoopRow({ recovery_score: 67 }))!;
    expect(input.score).toBe(67);
    // a banda NÃO é campo do contrato: {score: 20, band: "green"} seria uma
    // contradição sem dono — o motor deriva do score em um único lugar
    expect("nativeBand" in input).toBe(false);
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

describe("fronteiras exatas da janela do baseline", () => {
  it("lower bound asOf−30 entra; asOf−31 e o próprio asOf ficam fora", () => {
    const rows = [
      whoopRow({ id: "fora-velho", date: "2026-07-28", hrv_rmssd: 999 }), // asOf-31
      whoopRow({ id: "borda", date: "2026-07-29", hrv_rmssd: 10 }),       // asOf-30 (entra)
      ...Array.from({ length: 6 }, (_, i) =>
        whoopRow({ id: `w${i}`, date: `2026-08-${String(i + 10).padStart(2, "0")}`, hrv_rmssd: 60 })),
      whoopRow({ id: "avaliado", date: "2026-08-28", hrv_rmssd: 999 }),   // asOf (fora)
    ];
    const b = buildWhoopBaseline(rows, "2026-08-28");
    // 7 amostras: 10 + 6×60 = 370/7
    expect(b.avgHrv).toBeCloseTo(370 / 7, 5);
  });

  it("cruza mês/ano corretamente (janela de janeiro pega dezembro)", () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      whoopRow({ id: `d${i}`, date: `2025-12-${String(24 + i).padStart(2, "0")}`, hrv_rmssd: 50 }));
    const b = buildWhoopBaseline(rows, "2026-01-05");
    expect(b.avgHrv).toBe(50); // dezembro está dentro dos 30 dias
  });
});

describe("score_state null (legado) tem UMA semântica nos 3 caminhos", () => {
  it("dia: null é fechado só com recovery presente", () => {
    expect(whoopToRecoveryInput(whoopRow({ score_state: null }))).not.toBeNull();
    expect(whoopToRecoveryInput(whoopRow({ score_state: null, recovery_score: null }))).toBeNull();
  });

  it("baseline: mesma regra — linha null sem recovery fica fora da média", () => {
    const rows = [
      ...Array.from({ length: 7 }, (_, i) =>
        whoopRow({ id: `ok${i}`, date: `2026-08-${String(i + 1).padStart(2, "0")}`, hrv_rmssd: 60, score_state: null })),
      whoopRow({ id: "meio", date: "2026-08-08", hrv_rmssd: 999, score_state: null, recovery_score: null }),
    ];
    const b = buildWhoopBaseline(rows, "2026-08-20");
    expect(b.avgHrv).toBe(60); // a linha meio-processada com 999 não entra
  });
});

describe("integração adapter → engine (fatia vertical Whoop)", () => {
  it("linha crua do banco vira recomendação com a política ratificada", async () => {
    const { computeRecoveryRecommendation } = await import("../recoveryEngine");
    const { whoopHistoryToRecoveryDays } = await import("../recoveryAdapters");
    const rows = Array.from({ length: 10 }, (_, i) =>
      whoopRow({ id: `h${i}`, date: `2026-08-${String(i + 10).padStart(2, "0")}` }));
    const today = whoopRow({ date: "2026-08-28", recovery_score: 45 }); // amarelo
    const input = whoopToRecoveryInput(today)!;
    const rec = computeRecoveryRecommendation(
      input,
      whoopHistoryToRecoveryDays(rows),
      buildWhoopBaseline([...rows, today], "2026-08-28"),
    );
    expect(rec.source).toBe("whoop");
    expect(rec.zone).toBe("yellow");
    expect(rec.loadDecision).toBe("reduce");
    expect(rec.trainingType).toBe("Treino Reduzido 20%");
  });
});

describe("agudas só do MESMO dia (R4)", () => {
  it("acute com data divergente é ignorada — regras agudas viram not_evaluated", async () => {
    const { ouraToRecoveryInput } = await import("../recoveryAdapters");
    const metrics = {
      date: "2026-08-28", readiness_score: 80, resting_heart_rate: 55,
    } as never;
    const acuteOntem = {
      date: "2026-08-27", samples_count_hrv: 10, samples_count_hr_day: 10,
      hrv_night_last: 20, hrv_night_min: 15, hr_day_max: 190, hr_day_avg: 120,
    } as never;
    const input = ouraToRecoveryInput(metrics, acuteOntem)!;
    expect(input.acute).toBeUndefined(); // as agudas de ontem não vazam pra hoje

    const acuteHoje = { ...(acuteOntem as object), date: "2026-08-28" } as never;
    const inputHoje = ouraToRecoveryInput(metrics, acuteHoje)!;
    expect(inputHoje.acute?.hrDayMaxBpm).toBe(190);
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
