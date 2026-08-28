import { describe, expect, it } from "vitest";
import {
  computeRecoveryRecommendation,
  initialZoneFor,
  type RecoveryDayInput,
  type RecoveryBaselineInput,
  type RecoveryHistoryDay,
} from "../recoveryEngine";

const whoopDay = (overrides: Partial<RecoveryDayInput> = {}): RecoveryDayInput => ({
  source: "whoop",
  date: "2026-08-28",
  score: 70,
  nativeBand: "green",
  sleepScore: 80,
  sleepDurationSeconds: 27000,
  sleepEfficiencyPercent: 90,
  hrvRmssdMs: 60,
  restingHeartRateBpm: 55,
  // sem stress, sem calorias, sem agudas — realidade do Whoop
  ...overrides,
});

const whoopBaseline = (overrides: Partial<RecoveryBaselineInput> = {}): RecoveryBaselineInput => ({
  source: "whoop",
  avgHrv: 65,
  avgRhr: 54,
  avgSleepScore: 78,
  dataPoints: 20,
  usingPopulationDefaults: false,
  ...overrides,
});

const historyDays = (n: number): RecoveryHistoryDay[] =>
  Array.from({ length: n }, (_, i) => ({
    date: `2026-08-${String(i + 1).padStart(2, "0")}`,
    scoreClosed: true,
  }));

describe("initialZoneFor — política ratificada por fonte", () => {
  it("Whoop usa as bandas nativas: verde→3, amarelo→2, vermelho→1", () => {
    expect(initialZoneFor("whoop", 67, "low", "green")).toBe(3);
    expect(initialZoneFor("whoop", 66, "low", "yellow")).toBe(2);
    expect(initialZoneFor("whoop", 34, "low", "yellow")).toBe(2);
    expect(initialZoneFor("whoop", 33, "low", "red")).toBe(1);
  });

  it("zona 4 (progressão +5%) é INALCANÇÁVEL pra Whoop, mesmo com recovery 99", () => {
    expect(initialZoneFor("whoop", 99, "low", "green")).toBe(3);
  });

  it("Whoop sem nativeBand deriva a banda do score", () => {
    expect(initialZoneFor("whoop", 80, "low")).toBe(3);
    expect(initialZoneFor("whoop", 50, "low")).toBe(2);
    expect(initialZoneFor("whoop", 10, "low")).toBe(1);
  });

  it("Oura mantém os cortes calibrados (85/65/45/25 + fadiga)", () => {
    expect(initialZoneFor("oura", 90, "low")).toBe(4);
    expect(initialZoneFor("oura", 90, "moderate")).toBe(3); // fadiga veta zona 4
    expect(initialZoneFor("oura", 70, "high")).toBe(2); // fadiga alta veta zona 3
    expect(initialZoneFor("oura", 50, "low")).toBe(2);
    expect(initialZoneFor("oura", 30, "low")).toBe(1);
    expect(initialZoneFor("oura", 10, "low")).toBe(0);
  });
});

describe("motor com fonte Whoop — recomendação e carga", () => {
  it("recovery verde → treino normal, manter carga (nunca 'increase')", () => {
    const rec = computeRecoveryRecommendation(whoopDay({ score: 95, nativeBand: "green" }), historyDays(10), whoopBaseline());
    expect(rec.zone).toBe("green");
    expect(rec.loadDecision).toBe("maintain");
    expect(rec.trainingType).toBe("Treino Normal Completo");
    expect(rec.source).toBe("whoop");
  });

  it("recovery amarelo → treino reduzido 20%", () => {
    const rec = computeRecoveryRecommendation(whoopDay({ score: 50, nativeBand: "yellow" }), historyDays(10), whoopBaseline());
    expect(rec.zone).toBe("yellow");
    expect(rec.loadDecision).toBe("reduce");
    expect(rec.loadAdjustmentPercent).toBe(-20);
  });

  it("recovery vermelho → recuperação ativa com sugestão numérica bloqueada", () => {
    const rec = computeRecoveryRecommendation(whoopDay({ score: 20, nativeBand: "red" }), historyDays(10), whoopBaseline());
    expect(rec.zone).toBe("orange"); // zona 1 do motor
    expect(rec.loadDecision).toBe("block");
    expect(rec.trainingType).toMatch(/Recuperação Ativa/);
  });
});

describe("motor com fonte Whoop — regras por disponibilidade de dado", () => {
  it("estresse, fadiga e agudas viram not_evaluated (nunca 'não disparou')", () => {
    const rec = computeRecoveryRecommendation(whoopDay(), historyDays(10), whoopBaseline());
    const skipped = rec.skippedRules.map((r) => r.rule);
    expect(skipped).toContain("estresse");
    expect(skipped).toContain("fadiga_semanal");
    expect(skipped).toContain("hrv_aguda");
    expect(skipped).toContain("fc_intradia");
    expect(skipped).toContain("override_sono_estresse");
    expect(skipped).toContain("override_hrv_aguda");
  });

  it("as 4 regras portáveis avaliam com dado presente", () => {
    const rec = computeRecoveryRecommendation(whoopDay(), historyDays(10), whoopBaseline());
    for (const rule of ["hrv_noturna", "fc_repouso", "sono_duracao", "sono_eficiencia"]) {
      expect(rec.evaluatedRules).toContain(rule);
    }
  });

  it("HRV Whoop abaixo do basal Whoop dispara o alerta portável", () => {
    const rec = computeRecoveryRecommendation(
      whoopDay({ hrvRmssdMs: 40 }), // baseline 65 → 40 < 0.70×65 = crítico
      historyDays(10),
      whoopBaseline(),
    );
    const alert = rec.alerts.find((a) => a.metric === "hrv_noturna");
    expect(alert?.level).toBe("CRITICAL");
  });

  it("FC repouso elevada rebaixa a zona via override (portável)", () => {
    const rec = computeRecoveryRecommendation(
      whoopDay({ score: 80, nativeBand: "green", restingHeartRateBpm: 65 }), // basal 54 → +11 > +8
      historyDays(10),
      whoopBaseline(),
    );
    expect(rec.overrideApplied).toBe(true);
    expect(rec.zone).toBe("yellow"); // 3 → 2
  });

  it("sem baseline Whoop suficiente, regras de baseline pulam — SEM default populacional", () => {
    const rec = computeRecoveryRecommendation(
      whoopDay({ hrvRmssdMs: 10 }), // seria crítico com baseline
      historyDays(10),
      whoopBaseline({ avgHrv: null, avgRhr: null }),
    );
    expect(rec.alerts.find((a) => a.metric === "hrv_noturna")).toBeUndefined();
    expect(rec.skippedRules.map((r) => r.rule)).toContain("hrv_noturna");
    expect(rec.skippedRules.map((r) => r.rule)).toContain("fc_repouso");
  });

  it("sono insuficiente SEM estresse não aciona o override de conjunção", () => {
    const rec = computeRecoveryRecommendation(
      whoopDay({ score: 80, nativeBand: "green", sleepDurationSeconds: 18000 }),
      historyDays(10),
      whoopBaseline(),
    );
    // alerta de sono dispara (regra portável)…
    expect(rec.alerts.find((a) => a.metric === "sono")).toBeTruthy();
    // …mas a conjunção sono+estresse não é avaliável sem estresse
    expect(rec.overrideApplied).toBe(false);
    expect(rec.skippedRules.map((r) => r.rule)).toContain("override_sono_estresse");
  });
});

describe("auditoria evaluated/skipped", () => {
  it("Oura completo avalia tudo e não pula nada", () => {
    const oura: RecoveryDayInput = {
      source: "oura",
      date: "2026-08-28",
      score: 80,
      sleepScore: 80,
      sleepDurationSeconds: 27000,
      sleepEfficiencyPercent: 90,
      hrvRmssdMs: 65,
      restingHeartRateBpm: 55,
      stressHighSeconds: 1000,
      acute: { hrvNightLastMs: 60, hrvNightMinMs: 50, hrDayMaxBpm: 120, hrDayAvgBpm: 70 },
    };
    const history: RecoveryHistoryDay[] = historyDays(10).map((h) => ({
      ...h,
      activeCaloriesKcal: 400,
    }));
    const rec = computeRecoveryRecommendation(oura, history, {
      source: "oura", avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 20, usingPopulationDefaults: false,
    });
    expect(rec.skippedRules).toHaveLength(0);
    expect(rec.evaluatedRules).toContain("fadiga_semanal");
    expect(rec.evaluatedRules).toContain("estresse");
    expect(rec.evaluatedRules).toContain("hrv_aguda");
  });
});
