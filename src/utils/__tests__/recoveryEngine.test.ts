import { describe, expect, it } from "vitest";
import {
  ALL_ENGINE_RULES,
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
  it("Whoop usa as bandas nativas derivadas do score: verde→3, amarelo→2, vermelho→1", () => {
    expect(initialZoneFor("whoop", 67, "low")).toBe(3);
    expect(initialZoneFor("whoop", 66, "low")).toBe(2);
    expect(initialZoneFor("whoop", 34, "low")).toBe(2);
    expect(initialZoneFor("whoop", 33, "low")).toBe(1);
  });

  it("zona 4 (progressão +5%) é INALCANÇÁVEL pra Whoop, mesmo com recovery 99", () => {
    expect(initialZoneFor("whoop", 99, "low")).toBe(3);
  });

  it("fronteiras exatas das bandas: 67 e 34 pertencem à banda superior", () => {
    expect(initialZoneFor("whoop", 67, "low")).toBe(3);
    expect(initialZoneFor("whoop", 66.9, "low")).toBe(2);
    expect(initialZoneFor("whoop", 34, "low")).toBe(2);
    expect(initialZoneFor("whoop", 33.9, "low")).toBe(1);
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
    const rec = computeRecoveryRecommendation(whoopDay({ score: 95 }), historyDays(10), whoopBaseline());
    expect(rec.zone).toBe("green");
    expect(rec.loadDecision).toBe("maintain");
    expect(rec.trainingType).toBe("Treino Normal Completo");
    expect(rec.source).toBe("whoop");
  });

  it("recovery amarelo → treino reduzido 20%", () => {
    const rec = computeRecoveryRecommendation(whoopDay({ score: 50 }), historyDays(10), whoopBaseline());
    expect(rec.zone).toBe("yellow");
    expect(rec.loadDecision).toBe("reduce");
    expect(rec.loadAdjustmentPercent).toBe(-20);
  });

  it("recovery vermelho → recuperação ativa com sugestão numérica bloqueada", () => {
    const rec = computeRecoveryRecommendation(whoopDay({ score: 20 }), historyDays(10), whoopBaseline());
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

  it("FCR elevada no Whoop: ALERTA contextual, zona NÃO muda (banda nativa é final)", () => {
    // Política da revisão fria R4: o recovery Whoop JÁ embute FCR — rebaixar
    // de novo pelo mesmo sinal contaria o dado duas vezes.
    const rec = computeRecoveryRecommendation(
      whoopDay({ score: 80, restingHeartRateBpm: 65 }), // basal 54 → +11
      historyDays(10),
      whoopBaseline(),
    );
    expect(rec.alerts.find((a) => a.metric === "fc_repouso")?.level).toBe("CRITICAL");
    expect(rec.overrideApplied).toBe(false);
    expect(rec.zone).toBe("green"); // banda nativa intacta
    expect(rec.skippedRules.find((r) => r.rule === "override_fc_repouso")?.reason).toMatch(/banda nativa/);
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
      whoopDay({ score: 80, sleepDurationSeconds: 18000 }),
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

describe("invariante de auditoria — cada regra exatamente uma vez", () => {
  const assertInvariant = (rec: ReturnType<typeof computeRecoveryRecommendation>) => {
    const evaluated = new Set(rec.evaluatedRules);
    const skipped = new Set(rec.skippedRules.map((r) => r.rule));
    for (const rule of ALL_ENGINE_RULES) {
      const inEval = evaluated.has(rule);
      const inSkip = skipped.has(rule);
      expect(inEval || inSkip, `regra ${rule} sumiu da auditoria`).toBe(true);
      expect(inEval && inSkip, `regra ${rule} nos dois lados`).toBe(false);
    }
    expect(rec.evaluatedRules.length + rec.skippedRules.length).toBe(ALL_ENGINE_RULES.length);
  };

  it("vale pro dia Whoop típico", () => {
    assertInvariant(
      computeRecoveryRecommendation(whoopDay(), historyDays(10), whoopBaseline()),
    );
  });

  it("vale pro Whoop com dados parciais (sem HRV, sem baseline)", () => {
    assertInvariant(
      computeRecoveryRecommendation(
        whoopDay({ hrvRmssdMs: undefined, sleepDurationSeconds: undefined }),
        historyDays(3),
        whoopBaseline({ avgHrv: null, avgRhr: null, avgSleepScore: null }),
      ),
    );
  });

  it("vale pro Oura completo e pro Oura mínimo", () => {
    assertInvariant(
      computeRecoveryRecommendation(
        { source: "oura", date: "2026-08-28", score: 80, sleepScore: 80,
          sleepDurationSeconds: 27000, sleepEfficiencyPercent: 90, hrvRmssdMs: 65,
          restingHeartRateBpm: 55, stressHighSeconds: 1000,
          acute: { hrvNightLastMs: 60, hrvNightMinMs: 50, hrDayMaxBpm: 120, hrDayAvgBpm: 70 } },
        historyDays(10).map((h) => ({ ...h, activeCaloriesKcal: 400 })),
        { source: "oura", avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 20, usingPopulationDefaults: false },
      ),
    );
    assertInvariant(
      computeRecoveryRecommendation(
        { source: "oura", date: "2026-08-28", score: 80 },
        [],
        { source: "oura", avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 0, usingPopulationDefaults: true },
      ),
    );
  });
});

describe("motivos de skip nomeiam O QUE falta (prontuário honesto)", () => {
  it("sono ausente com estresse presente: o motivo é o sono, não o estresse", () => {
    const rec = computeRecoveryRecommendation(
      { source: "oura", date: "2026-08-28", score: 80, stressHighSeconds: 1000 },
      historyDays(10),
      { source: "oura", avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 20, usingPopulationDefaults: false },
    );
    const reason = rec.skippedRules.find((r) => r.rule === "override_sono_estresse")!.reason;
    expect(reason).toMatch(/sem duração de sono/);
    expect(reason).not.toMatch(/estresse nesta fonte/);
  });

  it("FC intradia presente com FC de repouso ausente → skip (não 'avaliada sem comparação')", () => {
    const rec = computeRecoveryRecommendation(
      { source: "oura", date: "2026-08-28", score: 80,
        acute: { hrDayMaxBpm: 150, hrDayAvgBpm: 100 } },
      historyDays(10),
      { source: "oura", avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 20, usingPopulationDefaults: false },
    );
    const skip = rec.skippedRules.find((r) => r.rule === "fc_intradia");
    expect(skip?.reason).toMatch(/sem FC de repouso/);
    expect(rec.evaluatedRules).not.toContain("fc_intradia");
  });

  it("override real fica visível na auditoria (Oura): FCR elevada = evaluated + aplicado", () => {
    const rec = computeRecoveryRecommendation(
      { source: "oura", date: "2026-08-28", score: 80, restingHeartRateBpm: 69 }, // basal 60 → +9
      historyDays(10),
      { source: "oura", avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 20, usingPopulationDefaults: false },
    );
    expect(rec.evaluatedRules).toContain("override_fc_repouso");
    expect(rec.overrideApplied).toBe(true);
    expect(rec.zone).toBe("yellow"); // 3 → 2
  });
});

describe("gate Whoop: baseline por métrica basta (sem o gate legado de contagem)", () => {
  it("7 amostras de HRV no baseline avaliam a regra mesmo com só 6 scores fechados", () => {
    const rec = computeRecoveryRecommendation(
      whoopDay({ hrvRmssdMs: 40 }), // crítico vs basal 65
      historyDays(6), // < 7 scores fechados
      whoopBaseline(), // baseline por métrica OK
    );
    expect(rec.evaluatedRules).toContain("hrv_noturna");
    expect(rec.alerts.find((a) => a.metric === "hrv_noturna")?.level).toBe("CRITICAL");
  });

  it("no Oura o gate legado continua valendo (paridade)", () => {
    const rec = computeRecoveryRecommendation(
      { source: "oura", date: "2026-08-28", score: 80, hrvRmssdMs: 40 },
      historyDays(6),
      { source: "oura", avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 20, usingPopulationDefaults: false },
    );
    expect(rec.skippedRules.map((r) => r.rule)).toContain("hrv_noturna");
  });
});

describe("decisões clínicas da revisão fria (R4)", () => {
  it("fail-closed: score 90 com 3 dias de histórico NÃO libera progressão +5%", () => {
    const rec = computeRecoveryRecommendation(
      { source: "oura", date: "2026-08-28", score: 90, restingHeartRateBpm: 55 },
      historyDays(3), // gate legado não atingido → override_fc_repouso skipped
      { source: "oura", avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 3, usingPopulationDefaults: true },
    );
    expect(rec.zone).toBe("green"); // capado de green_high pra green
    expect(rec.loadDecision).toBe("maintain");
    expect(rec.alerts.some((a) => a.message.includes("Progressão automática retida"))).toBe(true);
  });

  it("score 90 COM checagem de FCR avaliada libera a zona 4 normalmente", () => {
    const rec = computeRecoveryRecommendation(
      { source: "oura", date: "2026-08-28", score: 90, restingHeartRateBpm: 55 },
      historyDays(10),
      { source: "oura", avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 20, usingPopulationDefaults: false },
    );
    expect(rec.zone).toBe("green_high");
    expect(rec.loadAdjustmentPercent).toBe(5);
  });

  it("fronteira inclusiva: FCR exatamente no basal +8 rebaixa a zona", () => {
    const rec = computeRecoveryRecommendation(
      { source: "oura", date: "2026-08-28", score: 80, restingHeartRateBpm: 68 }, // 60 + 8
      historyDays(10),
      { source: "oura", avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 20, usingPopulationDefaults: false },
    );
    expect(rec.overrideApplied).toBe(true);
  });

  it("fronteiras inclusivas dos alertas de FCR: +5 = WARNING, +10 = CRITICAL", () => {
    const base = { source: "oura" as const, date: "2026-08-28", score: 50 };
    const bl = { source: "oura" as const, avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 20, usingPopulationDefaults: false };
    const warn = computeRecoveryRecommendation({ ...base, restingHeartRateBpm: 65 }, historyDays(10), bl);
    expect(warn.alerts.find((a) => a.metric === "fc_repouso")?.level).toBe("WARNING");
    const crit = computeRecoveryRecommendation({ ...base, restingHeartRateBpm: 70 }, historyDays(10), bl);
    expect(crit.alerts.find((a) => a.metric === "fc_repouso")?.level).toBe("CRITICAL");
  });

  it("zona bloqueada tem sugestão numérica NULA no contrato (não 0)", () => {
    const rec = computeRecoveryRecommendation(
      { source: "oura", date: "2026-08-28", score: 10 },
      historyDays(10),
      { source: "oura", avgHrv: 65, avgRhr: 60, avgSleepScore: 75, dataPoints: 20, usingPopulationDefaults: false },
    );
    expect(rec.loadDecision).toBe("block");
    expect(rec.loadAdjustmentPercent).toBeNull();
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
