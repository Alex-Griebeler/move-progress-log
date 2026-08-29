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

/** Toda regra do motor — cada uma aparece EXATAMENTE uma vez em
 *  evaluatedRules OU skippedRules de qualquer saída (invariante testado). */
export const ALL_ENGINE_RULES = [
  "fadiga_semanal",
  "override_fc_repouso",
  "override_hrv_aguda",
  "override_sono_estresse",
  "hrv_noturna",
  "fc_repouso",
  "sono_duracao",
  "sono_eficiencia",
  "estresse",
  "hrv_aguda",
  "fc_intradia",
] as const;

/**
 * Zona inicial por fonte. Oura usa os cortes calibrados no readiness; Whoop
 * usa as bandas nativas do aparelho (política ratificada — ver cabeçalho).
 */
export const initialZoneFor = (
  source: RecoverySource,
  score: number,
  fatigueLevel: "low" | "moderate" | "high",
): RecommendationZone => {
  if (source === "whoop") {
    // Banda nativa derivada AQUI, num lugar só: aceitar a banda como campo
    // do contrato permitia {score: 20, band: "green"} — contradição sem dono.
    return score >= 67 ? 3 : score >= 34 ? 2 : 1;
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
  let zone = initialZoneFor(input.source, recoveryScore, fatigueLevel);

  // ── OVERRIDE AGUDO (rebaixa 1 zona) ──────────────────────────────────────
  // Gate de histórico mínimo por CONTAGEM DE SCORES é semântica legada Oura;
  // no Whoop a disponibilidade já é certificada pelo mínimo POR MÉTRICA do
  // baseline (7 amostras) — exigir os dois mediria coisas diferentes.
  const legacyHistoryGate = input.source === "oura" ? hasMinimumHistory : true;

  // POLÍTICA WHOOP (revisão fria clínica R4): a banda nativa é FINAL. O
  // recovery do aparelho JÁ embute FCR/HRV/sono — rebaixar a zona de novo
  // pelos mesmos sinais contaria o mesmo dado duas vezes e contradiria a
  // ratificação ("manter as recomendações propostas por cada aparelho").
  // FCR/HRV elevados continuam como ALERTAS contextuais, sem mudar a zona.
  const overridesApplicable = input.source === "oura";
  const OVERRIDE_WHOOP_REASON =
    "política Whoop: banda nativa é final — sinais fisiológicos viram alertas, não reclassificação";

  // override_fc_repouso — FC do dia acima do basal em 8+ bpm (inclusivo)
  let rhrSignificantlyElevated = false;
  if (!overridesApplicable) skip("override_fc_repouso", OVERRIDE_WHOOP_REASON);
  else if (input.restingHeartRateBpm === undefined) skip("override_fc_repouso", "sem FC de repouso no dia");
  else if (baseline.avgRhr === null) skip("override_fc_repouso", "sem baseline de FC nesta fonte");
  else if (!legacyHistoryGate) skip("override_fc_repouso", "histórico mínimo (7 dias) não atingido");
  else {
    evaluate("override_fc_repouso");
    rhrSignificantlyElevated = input.restingHeartRateBpm >= baseline.avgRhr + 8;
  }

  // override_hrv_aguda — último bloco da noite < 70% do basal
  let acuteHrvVeryLow = false;
  if (!overridesApplicable) skip("override_hrv_aguda", OVERRIDE_WHOOP_REASON);
  else if (input.acute?.hrvNightLastMs === undefined) skip("override_hrv_aguda", "sem métricas agudas nesta fonte");
  else if (baseline.avgHrv === null) skip("override_hrv_aguda", "sem baseline de HRV nesta fonte");
  else if (!legacyHistoryGate) skip("override_hrv_aguda", "histórico mínimo (7 dias) não atingido");
  else {
    evaluate("override_hrv_aguda");
    acuteHrvVeryLow = input.acute.hrvNightLastMs < baseline.avgHrv * 0.7;
  }

  // override_sono_estresse — conjunção só avaliável com AMBOS os insumos;
  // o motivo do skip nomeia O QUE falta (dizer "sem estresse" quando falta
  // sono seria mentira de prontuário).
  let sleepStressConjunction = false;
  const missingSleep = input.sleepDurationSeconds === undefined;
  const missingStress = input.stressHighSeconds === undefined;
  if (!overridesApplicable) skip("override_sono_estresse", OVERRIDE_WHOOP_REASON);
  else if (missingSleep && missingStress) skip("override_sono_estresse", "sem duração de sono e sem tempo de estresse");
  else if (missingSleep) skip("override_sono_estresse", "sem duração de sono no dia");
  else if (missingStress) skip("override_sono_estresse", "sem tempo de estresse nesta fonte");
  else {
    evaluate("override_sono_estresse");
    sleepStressConjunction =
      input.sleepDurationSeconds! < goals.minSleepDurationThreshold &&
      input.stressHighSeconds! > 7200;
  }

  const shouldDowngradeOneZone =
    zone > 0 && (acuteHrvVeryLow || rhrSignificantlyElevated || sleepStressConjunction);

  // FAIL-CLOSED pra progressão (revisão fria R4): a zona 4 autoriza +5% de
  // carga — ela só é liberada quando a checagem de segurança mais básica
  // (FCR vs basal) PÔDE ser avaliada. Score alto com histórico/dado
  // insuficiente cai pra zona 3 (treino normal, manter), nunca progressão.
  const fcOverrideEvaluated = evaluatedRules.includes("override_fc_repouso");
  if (zone === 4 && !fcOverrideEvaluated) {
    zone = 3;
    alerts.push({ kind: "onboarding", metric: null, shortLabel: null,
      level: "INFO",
      message:
        "ℹ️ Progressão automática retida: sem FC de repouso ou histórico suficiente pra validar a segurança do aumento de carga. Treino normal recomendado.",
    });
  }

  const overrideApplied = shouldDowngradeOneZone;
  if (shouldDowngradeOneZone) {
    zone = (zone - 1) as RecommendationZone;
    alerts.push({ kind: "override", metric: null, shortLabel: null,
      level: "WARNING",
      message:
        "🟡 Override agudo aplicado: a recomendação foi reduzida em 1 zona para proteger recuperação e reduzir risco de sobrecarga.",
    });
  }

  // ── REGRAS DE ALERTA (portáveis por disponibilidade de dado) ─────────────
  const WHOOP_DEVICE_THRESHOLD_REASON =
    "limiar de desvio calibrado no Oura — no Whoop, HRV/FCR vs basal já estão ponderados no recovery nativo (limiares por aparelho, ratificado 29/08)";

  // HRV noturna vs baseline — cortes 0.85/0.70 calibrados no Oura. Pro
  // Whoop a regra NÃO avalia (decisão do Alex 29/08, "limiares do whoop
  // pro whoop"): o recovery nativo já pondera o desvio de HRV vs basal
  // pessoal; refazer o corte com régua de outro aparelho contaria o mesmo
  // dado duas vezes com limiar não validado.
  if (input.hrvRmssdMs === undefined) skip("hrv_noturna", "sem HRV noturna no dia");
  else if (input.source === "whoop") skip("hrv_noturna", WHOOP_DEVICE_THRESHOLD_REASON);
  else if (baseline.avgHrv === null) skip("hrv_noturna", "sem baseline de HRV nesta fonte");
  else if (!legacyHistoryGate) skip("hrv_noturna", "histórico mínimo (7 dias) não atingido");
  else {
    evaluate("hrv_noturna");
    if (input.hrvRmssdMs < baseline.avgHrv * 0.85) {
      if (input.hrvRmssdMs < baseline.avgHrv * 0.70) {
        alerts.push({ kind: "fisiologico", metric: "hrv_noturna", shortLabel: "Muito abaixo do basal", level: "CRITICAL", message: "🔴 HRV mais de 30% abaixo do seu basal. Reduza o estímulo de hoje e priorize descanso; se o padrão persistir por vários dias ou vier com sintomas, vale avaliação médica." });
      } else {
        alerts.push({ kind: "fisiologico", metric: "hrv_noturna", shortLabel: "Abaixo do basal", level: "WARNING", message: "🟡 HRV 15% ou mais abaixo do seu basal. Considere reduzir o esforço de hoje e observar o acumulado da semana." });
      }
    }
  }

  // FC repouso vs baseline — mesmos motivos da regra de HRV acima.
  if (input.restingHeartRateBpm === undefined) skip("fc_repouso", "sem FC de repouso no dia");
  else if (input.source === "whoop") skip("fc_repouso", WHOOP_DEVICE_THRESHOLD_REASON);
  else if (baseline.avgRhr === null) skip("fc_repouso", "sem baseline de FC nesta fonte");
  else if (!legacyHistoryGate) skip("fc_repouso", "histórico mínimo (7 dias) não atingido");
  else {
    evaluate("fc_repouso");
    if (input.restingHeartRateBpm >= baseline.avgRhr + 5) {
      if (input.restingHeartRateBpm >= baseline.avgRhr + 10) {
        alerts.push({ kind: "fisiologico", metric: "fc_repouso", shortLabel: "Muito acima do basal", level: "CRITICAL", message: "🔴 FC de repouso 10+ bpm acima do seu basal — o corpo ainda não voltou ao padrão. Priorize repouso hoje e observe como você se sente." });
      } else {
        alerts.push({ kind: "fisiologico", metric: "fc_repouso", shortLabel: "Acima do basal", level: "WARNING", message: "🟡 FC de repouso 5+ bpm acima do seu basal — recuperação ainda incompleta. Reduza o ritmo hoje." });
      }
    }
  }

  // Duração do sono (limiar fisiológico, sem baseline)
  if (input.sleepDurationSeconds === undefined) skip("sono_duracao", "sem duração de sono no dia");
  else {
    evaluate("sono_duracao");
    if (input.sleepDurationSeconds < goals.minSleepDurationThreshold) {
      alerts.push({ kind: "fisiologico", metric: "sono", shortLabel: "Duração insuficiente", level: "CRITICAL", message: "🔴 Sono abaixo do mínimo configurado. Evite alta intensidade hoje e, se possível, complemente o descanso." });
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
  } else if (!legacyHistoryGate) {
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
  } else if (input.restingHeartRateBpm === undefined) {
    // a régua intradia É a FC de repouso do dia — sem ela não há comparação
    skip("fc_intradia", "sem FC de repouso no dia");
  } else if (!legacyHistoryGate) {
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

  // VETO POR CRITICAL (revisão fria R4): zona 4 prescreve 80-95% FCMáx e
  // +5% de carga — coexistir com um alerta CRITICAL ("evite treinos de alta
  // intensidade") seria a tela se contradizendo. Qualquer CRITICAL
  // fisiológico rebaixa a progressão pra treino normal.
  const hasCriticalPhysio = alerts.some(
    (a) => a.kind === "fisiologico" && a.level === "CRITICAL",
  );
  if (zone === 4 && hasCriticalPhysio) {
    zone = 3;
    alerts.push({ kind: "onboarding", metric: null, shortLabel: null,
      level: "INFO",
      message:
        "ℹ️ Progressão automática retida: há um sinal fisiológico crítico hoje — treino normal recomendado no lugar de máxima performance.",
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
    reason = "Vários sinais fisiológicos bem abaixo do seu padrão hoje. Treino não é recomendado — use os protocolos de recuperação e reavalie amanhã.";
    emoji = "🔴";
  }

  let priorityProtocols: TrainingRecommendation["priorityProtocols"] = undefined;
  if (zone === 0) {
    priorityProtocols = [
      { order: 1, name: "Contraste Térmico", duration: "15 minutos", timing: "Pós-treino ou manhã", description: "Alternância de água quente e fria no banho." },
      { order: 2, name: "Crioterapia", duration: "10 minutos", timing: "Após atividade física", description: "Imersão em água fria por até 10 minutos, se disponível. Pode ajudar na sensação de dor muscular." },
      { order: 3, name: "Coerência Cardíaca", duration: "10-15 minutos", timing: "Ao acordar", description: "Respiração lenta, ~6 ciclos por minuto. Ajuda a reduzir a ativação de estresse no curto prazo." },
      { order: 4, name: "Grounding", duration: "10 minutos", timing: "Manhã", description: "Tempo ao ar livre pela manhã, de preferência em ambiente natural." },
    ];
  }

  const confidence = recoveryScore;

  const zoneLabel: TrainingRecommendation["zone"] =
    zone === 4 ? "green_high" : zone === 3 ? "green" : zone === 2 ? "yellow" : zone === 1 ? "orange" : "red";
  const loadDecision: TrainingRecommendation["loadDecision"] =
    zone === 4 ? "increase" : zone === 3 ? "maintain" : zone === 2 ? "reduce" : "block";
  // block = sem sugestão numérica (null, não 0 — zero pareceria "manter")
  const loadAdjustmentPercent =
    loadDecision === "block" ? null : zone === 4 ? 5 : zone === 2 ? -20 : 0;

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
