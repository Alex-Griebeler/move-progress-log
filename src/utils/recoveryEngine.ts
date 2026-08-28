/**
 * Motor de recomendação de treino NORMALIZADO (R3).
 *
 * Antes o motor consumia OuraMetrics direto; estender pro Whoop exigiria
 * espalhar condicionais de fonte pelas regras. Aqui a fonte entra por um
 * contrato normalizado (RecoveryDayInput/RecoveryBaselineInput) produzido
 * por adapters puros (recoveryAdapters.ts), e as regras decidem por
 * DISPONIBILIDADE DE DADO: regra sem insumo vira `not_evaluated` — nunca
 * "não disparou". A lista skippedRules torna auditável o que o motor NÃO
 * olhou naquele dia.
 *
 * POLÍTICA DE ZONAS (ratificada 28/08 — "manter as recomendações propostas
 * por cada aparelho"):
 *  • Oura: cortes atuais calibrados no readiness (85/65/45/25 + fadiga).
 *  • Whoop: bandas NATIVAS do aparelho — verde (≥67)→zona 3 manter;
 *    amarelo (34-66)→zona 2 reduzir ~20%; vermelho (≤33)→zona 1 recuperação
 *    ativa com sugestão numérica bloqueada. Zona 4 (progressão +5%) é
 *    INALCANÇÁVEL pra Whoop nesta fase: o corte 85+ é calibração Oura e
 *    não temos equivalente validado. Zona 0 reservada.
 */

import type { StructuredAlert } from "@/utils/attentionAlerts";

export type RecoverySource = "oura" | "whoop";

export interface RecoveryDayInput {
  source: RecoverySource;
  /** date-only "YYYY-MM-DD" do dia avaliado. */
  date: string;
  /** Score fechado (readiness Oura / recovery Whoop). Adapters não emitem
   *  input sem score — dia pendente/inscorável vira null ANTES daqui. */
  score: number;
  /** Banda nativa do aparelho (só Whoop define; Oura não tem). */
  nativeBand?: "green" | "yellow" | "red";
  sleepScore?: number;
  sleepDurationSeconds?: number;
  sleepEfficiencyPercent?: number;
  hrvRmssdMs?: number;
  restingHeartRateBpm?: number;
  /** Oura-only hoje (Whoop não expõe tempo de estresse). */
  stressHighSeconds?: number;
  /** Métricas agudas intra-noite/intra-dia (pipeline Oura-only). */
  acute?: {
    hrvNightLastMs?: number;
    hrvNightMinMs?: number;
    hrDayMaxBpm?: number;
    hrDayAvgBpm?: number;
  };
}

/**
 * Dia do HISTÓRICO — só o que o motor realmente usa dele: contagem de dias
 * com score fechado (histórico mínimo) e calorias (fadiga semanal). Um dia
 * SEM score ainda soma calorias — paridade com o comportamento validado
 * na R2 (calorias são válidas independente do readiness).
 */
export interface RecoveryHistoryDay {
  date: string;
  scoreClosed: boolean;
  activeCaloriesKcal?: number;
}

export interface RecoveryBaselineInput {
  source: RecoverySource;
  /** null = sem baseline utilizável pra métrica (regra correspondente pula). */
  avgHrv: number | null;
  avgRhr: number | null;
  avgSleepScore: number | null;
  dataPoints: number;
  /** true quando os valores vêm de defaults populacionais (só Oura faz isso,
   *  por paridade com o comportamento histórico; Whoop nunca). */
  usingPopulationDefaults: boolean;
}

export interface UserGoals {
  minSleepDurationThreshold: number;
  minSleepEfficiency: number;
  highFatigueThreshold: number;
  moderateFatigueThreshold: number;
}

export const DEFAULT_GOALS: UserGoals = {
  minSleepDurationThreshold: 23400,
  minSleepEfficiency: 85,
  highFatigueThreshold: 10000,
  moderateFatigueThreshold: 7000,
};

export interface TrainingRecommendation {
  trainingType: string;
  intensity: string;
  duration: string;
  recoveryScore: number;
  zone: "green_high" | "green" | "yellow" | "orange" | "red";
  fatigueLevel: "low" | "moderate" | "high";
  loadDecision: "increase" | "maintain" | "reduce" | "block";
  loadAdjustmentPercent: number | null;
  overrideApplied: boolean;
  reason: string;
  alerts: StructuredAlert[];
  confidence: number;
  emoji: string;
  priorityProtocols?: Array<{
    order: number;
    name: string;
    duration: string;
    timing: string;
    description: string;
  }>;
  /** R3: auditoria — a fonte avaliada e o que o motor olhou/pulou. */
  source: RecoverySource;
  evaluatedRules: string[];
  skippedRules: Array<{ rule: string; reason: string }>;
}

type RecommendationZone = 0 | 1 | 2 | 3 | 4;

/**
 * Zona inicial por fonte. Oura usa os cortes calibrados no readiness; Whoop
 * usa as bandas nativas do aparelho (política ratificada — ver cabeçalho).
 */
export const initialZoneFor = (
  source: RecoverySource,
  score: number,
  fatigueLevel: "low" | "moderate" | "high",
  nativeBand?: "green" | "yellow" | "red",
): RecommendationZone => {
  if (source === "whoop") {
    const band = nativeBand ?? (score >= 67 ? "green" : score >= 34 ? "yellow" : "red");
    return band === "green" ? 3 : band === "yellow" ? 2 : 1;
  }
  if (score >= 85 && fatigueLevel === "low") return 4;
  if (score >= 65 && fatigueLevel !== "high") return 3;
  if (score >= 45) return 2;
  if (score >= 25) return 1;
  return 0;
};

/** Janela de 7 dias de calendário ancorada no dia avaliado (UTC date-only). */
const weekStartOf = (date: string): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 6);
  return d.toISOString().slice(0, 10);
};

export function computeRecoveryRecommendation(
  input: RecoveryDayInput,
  history: RecoveryHistoryDay[],
  baseline: RecoveryBaselineInput,
  userGoals?: Partial<UserGoals>,
): TrainingRecommendation {
  const goals = { ...DEFAULT_GOALS, ...userGoals };
  const alerts: StructuredAlert[] = [];
  const evaluatedRules: string[] = [];
  const skippedRules: Array<{ rule: string; reason: string }> = [];
  const evaluate = (rule: string) => evaluatedRules.push(rule);
  const skip = (rule: string, reason: string) => skippedRules.push({ rule, reason });

  const validHistoryCount = history.filter((h) => h.scoreClosed).length;
  const hasMinimumHistory = validHistoryCount >= 7;

  if (!hasMinimumHistory && validHistoryCount > 0) {
    alerts.push({ kind: "onboarding", metric: null, shortLabel: null,
      level: "INFO",
      message: `ℹ️ Histórico em construção: Coletamos ${validHistoryCount} dias de dados. Para recomendações mais precisas, aguarde pelo menos 7 dias de sincronização.`,
    });
  }
  if (baseline.usingPopulationDefaults && baseline.dataPoints > 0) {
    alerts.push({ kind: "onboarding", metric: null, shortLabel: null,
      level: "INFO",
      message: `ℹ️ Baseline em construção: ${baseline.dataPoints} dias coletados. Usando valores de referência populacionais até atingir 7 dias.`,
    });
  }

  const recoveryScore = input.score;

  // ── FADIGA SEMANAL — precisa de calorias ativas na janela ────────────────
  let fatigueLevel: "low" | "moderate" | "high" = "low";
  // O burn soma SÓ o histórico: em produção o dia avaliado já é uma das
  // linhas do histórico — somar `input` por fora contaria o dia duas vezes.
  // (Chamador é responsável por incluir o dia avaliado no histórico quando
  // a fonte o traz, como o hook Oura sempre fez.)
  const hasCalorieData = history.some((h) => h.activeCaloriesKcal !== undefined);
  if (hasCalorieData) {
    evaluate("fadiga_semanal");
    const weekStart = weekStartOf(input.date);
    const weeklyBurn = history
      .filter((h) => h.date >= weekStart && h.date <= input.date)
      .reduce((sum, h) => sum + (h.activeCaloriesKcal || 0), 0);
    if (weeklyBurn > goals.highFatigueThreshold) fatigueLevel = "high";
    else if (weeklyBurn > goals.moderateFatigueThreshold) fatigueLevel = "moderate";
  } else {
    skip("fadiga_semanal", "sem calorias ativas nesta fonte");
  }

  // ── ZONA INICIAL POR FONTE ───────────────────────────────────────────────
  let zone = initialZoneFor(input.source, recoveryScore, fatigueLevel, input.nativeBand);

  // ── OVERRIDE AGUDO (rebaixa 1 zona) ──────────────────────────────────────
  const sleepInsufficient =
    input.sleepDurationSeconds !== undefined &&
    input.sleepDurationSeconds < goals.minSleepDurationThreshold;
  const stressHigh =
    input.stressHighSeconds !== undefined && input.stressHighSeconds > 7200;
  const rhrSignificantlyElevated =
    hasMinimumHistory &&
    input.restingHeartRateBpm !== undefined &&
    baseline.avgRhr !== null &&
    input.restingHeartRateBpm > baseline.avgRhr + 8;
  const acuteHrvVeryLow =
    hasMinimumHistory &&
    input.acute?.hrvNightLastMs !== undefined &&
    baseline.avgHrv !== null &&
    input.acute.hrvNightLastMs < baseline.avgHrv * 0.7;

  // A conjunção sono+estresse só é avaliável quando AMBOS os insumos existem
  // (Whoop não tem estresse → conjunção inteira not_evaluated, nunca "falso").
  const sleepStressEvaluable =
    input.sleepDurationSeconds !== undefined && input.stressHighSeconds !== undefined;
  if (!sleepStressEvaluable) skip("override_sono_estresse", "sem tempo de estresse nesta fonte");
  else evaluate("override_sono_estresse");
  if (input.acute?.hrvNightLastMs === undefined) skip("override_hrv_aguda", "sem métricas agudas nesta fonte");
  else evaluate("override_hrv_aguda");

  const shouldDowngradeOneZone =
    zone > 0 &&
    (acuteHrvVeryLow ||
      rhrSignificantlyElevated ||
      (sleepStressEvaluable && sleepInsufficient && stressHigh));

  const overrideApplied = shouldDowngradeOneZone;
  if (shouldDowngradeOneZone) {
    zone = (zone - 1) as RecommendationZone;
    alerts.push({ kind: "override", metric: null, shortLabel: null,
      level: "WARNING",
      message:
        "🟡 Override agudo aplicado: a recomendação foi reduzida em 1 zona para proteger recuperação e reduzir risco de sobrecarga.",
    });
  }

  // ── PRESCRIÇÃO POR ZONA ──────────────────────────────────────────────────
  let trainingType = "";
  let intensity = "";
  let duration = "";
  let reason = "";
  let emoji = "🟢";

  if (zone === 4) {
    trainingType = "Máxima Performance / Desafio";
    intensity = "ALTA (80-95% FCMáx)";
    duration = "45-60 minutos";
    reason = "Excelente! Você está no auge. Oportunidade perfeita para desafios ou recordes pessoais (PRs).";
    emoji = "💚";
  } else if (zone === 3) {
    trainingType = "Treino Normal Completo";
    intensity = "MODERADA-ALTA (70-85% FCMáx)";
    duration = "45-55 minutos";
    reason = "Bom dia para treinar! Você está bem preparado para realizar o treino programado com confiança.";
    emoji = "🟢";
  } else if (zone === 2) {
    trainingType = "Treino Reduzido 20%";
    intensity = "MODERADA (60-75% FCMáx)";
    duration = "35-45 minutos";
    reason = "Dia moderado. Mantenha o treino programado, mas reduza volume e/ou intensidade em 20%.";
    emoji = "🟡";
  } else if (zone === 1) {
    trainingType = "Recuperação Ativa / Muito Leve";
    intensity = "BAIXA (30-50% FCMáx)";
    duration = "20-30 minutos";
    reason = "Dia de recuperação. Foco em atividades leves para restaurar o corpo sem estresse adicional.";
    emoji = "🟠";
  } else {
    trainingType = "Descanso Completo / Repouso";
    intensity = "MUITO BAIXA (0-20% FCMáx)";
    duration = "Repouso total";
    reason = "⚠️ SITUAÇÃO CRÍTICA: Seu corpo precisa de recuperação urgente. Treino NÃO é recomendado hoje. Foque nos protocolos de recuperação.";
    emoji = "🔴";
  }

  let priorityProtocols: TrainingRecommendation["priorityProtocols"] = undefined;
  if (zone === 0) {
    priorityProtocols = [
      { order: 1, name: "Contraste Térmico", duration: "15 minutos", timing: "Pós-treino ou manhã", description: "Alternância água quente/fria. Reduz inflamação e acelera recuperação muscular (efeitos mensuráveis em 24-48h)." },
      { order: 2, name: "Crioterapia", duration: "10 minutos", timing: "Após atividade física", description: "Imersão em água fria. Reduz marcadores inflamatórios e acelera recuperação (efeitos em 24-72h)." },
      { order: 3, name: "Coerência Cardíaca", duration: "10-15 minutos", timing: "Ao acordar", description: "Respiração 6 ciclos/min. Ativa sistema parassimpático e reduz cortisol imediatamente." },
      { order: 4, name: "Grounding", duration: "10 minutos", timing: "Manhã", description: "Contato descalço com superfície natural. Reduz cortisol e inflamação (efeitos mensuráveis em 24-72h)." },
    ];
  }

  // ── REGRAS DE ALERTA (portáveis por disponibilidade de dado) ─────────────

  // HRV noturna vs baseline
  if (input.hrvRmssdMs === undefined) skip("hrv_noturna", "sem HRV noturna no dia");
  else if (baseline.avgHrv === null) skip("hrv_noturna", "sem baseline de HRV nesta fonte");
  else if (!hasMinimumHistory) skip("hrv_noturna", "histórico mínimo (7 dias) não atingido");
  else {
    evaluate("hrv_noturna");
    if (input.hrvRmssdMs < baseline.avgHrv * 0.85) {
      if (input.hrvRmssdMs < baseline.avgHrv * 0.70) {
        alerts.push({ kind: "fisiologico", metric: "hrv_noturna", shortLabel: "Muito abaixo do basal", level: "CRITICAL", message: "🔴 HRV criticamente baixa: Sinal forte de fadiga extrema ou possível doença. Seu corpo precisa de descanso. Se persistir, procure orientação médica." });
      } else {
        alerts.push({ kind: "fisiologico", metric: "hrv_noturna", shortLabel: "Abaixo do basal", level: "WARNING", message: "🟡 HRV abaixo do normal: Seu corpo pode estar sob estresse ou fadiga acumulada. Monitore sinais de cansaço e considere reduzir o esforço." });
      }
    }
  }

  // FC repouso vs baseline
  if (input.restingHeartRateBpm === undefined) skip("fc_repouso", "sem FC de repouso no dia");
  else if (baseline.avgRhr === null) skip("fc_repouso", "sem baseline de FC nesta fonte");
  else if (!hasMinimumHistory) skip("fc_repouso", "histórico mínimo (7 dias) não atingido");
  else {
    evaluate("fc_repouso");
    if (input.restingHeartRateBpm > baseline.avgRhr + 5) {
      if (input.restingHeartRateBpm > baseline.avgRhr + 10) {
        alerts.push({ kind: "fisiologico", metric: "fc_repouso", shortLabel: "Muito acima do basal", level: "CRITICAL", message: "🔴 Frequência cardíaca em repouso muito elevada: Pode indicar inflamação, doença ou exaustão. Priorize o repouso e observe se há outros sintomas." });
      } else {
        alerts.push({ kind: "fisiologico", metric: "fc_repouso", shortLabel: "Acima do basal", level: "WARNING", message: "🟡 Frequência cardíaca em repouso elevada: Indício de que seu corpo ainda está se recuperando. Reduza o ritmo hoje." });
      }
    }
  }

  // Duração do sono (limiar fisiológico, sem baseline)
  if (input.sleepDurationSeconds === undefined) skip("sono_duracao", "sem duração de sono no dia");
  else {
    evaluate("sono_duracao");
    if (input.sleepDurationSeconds < goals.minSleepDurationThreshold) {
      alerts.push({ kind: "fisiologico", metric: "sono", shortLabel: "Duração insuficiente", level: "CRITICAL", message: "🔴 Sono insuficiente detectado: Sua capacidade de recuperação está comprometida. Evite treinos de alta intensidade e priorize descanso extra." });
    }
  }

  // Eficiência do sono
  if (input.sleepEfficiencyPercent === undefined) skip("sono_eficiencia", "sem eficiência de sono no dia");
  else {
    evaluate("sono_eficiencia");
    if (input.sleepEfficiencyPercent < goals.minSleepEfficiency) {
      alerts.push({ kind: "fisiologico", metric: "eficiencia_sono", shortLabel: "Eficiência baixa", level: "INFO", message: "ℹ️ Eficiência do sono abaixo do ideal: Seu sono foi interrompido ou superficial. Tente melhorar seu ambiente e rotina de sono." });
    }
  }

  // Estresse (Oura-only por dado)
  if (input.stressHighSeconds === undefined) skip("estresse", "sem tempo de estresse nesta fonte");
  else {
    evaluate("estresse");
    if (input.stressHighSeconds > 7200) {
      alerts.push({ kind: "fisiologico", metric: "estresse", shortLabel: "Estresse alto no dia", level: "WARNING", message: "🟡 Alto nível de estresse detectado: Mais de 2 horas em estado de estresse alto. Considere técnicas de relaxamento e recuperação." });
    }
  }

  // Agudas intra-noite (Oura-only por pipeline)
  if (input.acute?.hrvNightLastMs === undefined && input.acute?.hrvNightMinMs === undefined) {
    skip("hrv_aguda", "sem métricas agudas nesta fonte");
  } else if (baseline.avgHrv === null) {
    skip("hrv_aguda", "sem baseline de HRV nesta fonte");
  } else if (!hasMinimumHistory) {
    skip("hrv_aguda", "histórico mínimo (7 dias) não atingido");
  } else {
    evaluate("hrv_aguda");
    const baselineHrv = baseline.avgHrv;
    const hrvLast = input.acute?.hrvNightLastMs;
    const hrvMin = input.acute?.hrvNightMinMs;
    if (typeof hrvLast === "number" && hrvLast < baselineHrv * 0.7) {
      alerts.push({ kind: "fisiologico", metric: "hrv_aguda", shortLabel: "Queda aguda forte",
        level: "CRITICAL",
        message: `🔴 HRV aguda noturna muito baixa (último bloco: ${hrvLast.toFixed(1)} ms). Forte indicação de baixa recuperação hoje.`,
      });
    } else if (typeof hrvLast === "number" && hrvLast < baselineHrv * 0.85) {
      alerts.push({ kind: "fisiologico", metric: "hrv_aguda", shortLabel: "Abaixo do basal",
        level: "WARNING",
        message: `🟡 HRV aguda abaixo do basal (último bloco: ${hrvLast.toFixed(1)} ms). Considere reduzir carga e monitorar resposta.`,
      });
    }
    if (typeof hrvMin === "number" && hrvMin < baselineHrv * 0.55) {
      alerts.push({ kind: "fisiologico", metric: "hrv_aguda", shortLabel: "Queda acentuada na noite",
        level: "WARNING",
        message: `🟡 Queda acentuada de HRV durante a noite (mínimo: ${hrvMin.toFixed(1)} ms). Evite sessão de alta intensidade hoje.`,
      });
    }
  }

  // Agudas intra-dia (Oura-only por pipeline)
  if (input.acute?.hrDayMaxBpm === undefined && input.acute?.hrDayAvgBpm === undefined) {
    skip("fc_intradia", "sem métricas agudas nesta fonte");
  } else if (!hasMinimumHistory) {
    skip("fc_intradia", "histórico mínimo (7 dias) não atingido");
  } else {
    evaluate("fc_intradia");
    const hrDayMax = input.acute?.hrDayMaxBpm;
    const hrDayAvg = input.acute?.hrDayAvgBpm;
    const restingHr = input.restingHeartRateBpm;
    if (typeof hrDayMax === "number" && typeof restingHr === "number" && hrDayMax > restingHr + 55) {
      alerts.push({ kind: "fisiologico", metric: "fc_pico", shortLabel: "Pico elevado",
        level: "INFO",
        message: `ℹ️ Pico de FC do dia elevado (${hrDayMax} bpm). Contextualize com estresse/sono e ajuste o aquecimento.`,
      });
    }
    if (typeof hrDayAvg === "number" && typeof restingHr === "number" && hrDayAvg > restingHr + 18) {
      alerts.push({ kind: "fisiologico", metric: "fc_media_dia", shortLabel: "Acima do esperado",
        level: "WARNING",
        message: `🟡 FC média diária acima do esperado (${hrDayAvg.toFixed(0)} bpm). Priorize controle de intensidade na sessão.`,
      });
    }
  }

  const confidence = recoveryScore;

  const zoneLabel: TrainingRecommendation["zone"] =
    zone === 4 ? "green_high" : zone === 3 ? "green" : zone === 2 ? "yellow" : zone === 1 ? "orange" : "red";
  const loadDecision: TrainingRecommendation["loadDecision"] =
    zone === 4 ? "increase" : zone === 3 ? "maintain" : zone === 2 ? "reduce" : "block";
  const loadAdjustmentPercent = zone === 4 ? 5 : zone === 2 ? -20 : 0;

  return {
    trainingType,
    intensity,
    duration,
    recoveryScore,
    zone: zoneLabel,
    fatigueLevel,
    loadDecision,
    loadAdjustmentPercent,
    overrideApplied,
    reason,
    alerts,
    confidence,
    emoji,
    priorityProtocols,
    source: input.source,
    evaluatedRules,
    skippedRules,
  };
}
