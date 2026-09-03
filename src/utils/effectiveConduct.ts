/**
 * Conduta efetiva v3 (check-in v3, spec v7+v7.2 ratificada 31/08): "as
 * decisões não podem ser baseadas apenas nos números; a percepção do aluno é
 * ainda mais importante, excetuando casos onde os números estão muito ruins."
 *
 * A recomendação-base do aparelho NUNCA é sobrescrita — este módulo compõe
 * por cima dela a conduta do coach (percepção via PSR + alternativa), com
 * ordem geradora FIXA: erro → base → percepção/teto → alternativa → block
 * absoluto. Zona 4 nunca nasce de ação humana; block de carga sobrevive a
 * tudo.
 *
 * A MÁQUINA DE SINTOMAS MORREU (decisão do dono, 31/08, emenda v7): "o
 * treino só deverá ser suspenso se o treinador decidir" — sintoma virou
 * OBSERVAÇÃO clínica no fluxo próprio, sem gate automático nenhum.
 *
 * REGRA DE CONCORDÂNCIA (spec v9.2, 6 pontos ratificados 03/09; Nuuttila
 * 2022 doi:10.1249/MSS.0000000000002968 — maioria de marcadores; Saw 2016
 * doi:10.1136/bjsports-2015-094758): (1) concordam → segue o aparelho;
 * (2) discordam sem piso → Manter o treino planejado; (3) piso numérico
 * absoluto (Whoop ≤33, Oura <45, CRITICAL) só bloqueia SUBIR; (4) PSR 0–3 é
 * TETO ABSOLUTO para qualquer base (2–3 → zona 1; 0–1 → zona 0); (5) só
 * strain conhecido e alto veta a elevação 2→3 — sync velha NÃO veta;
 * (6) todo veto vira frase visível (PerceptionResult, nunca appliedVetoes).
 * A régua relativa ±2 morreu.
 */

import type { TrainingRecommendation } from "@/utils/recoveryEngine";

/**
 * Sinal de PSR NORMALIZADO e indivisível (spec v9.2, E3): valor e banda
 * nascem juntos em `toPsrSignal` (checkin.ts) — nunca viajam separados.
 * Bandas = as do modo sem dispositivo (7–10→3 · 4–6→2 · 2–3→1 · 0–1→0).
 */
export type PsrSignal =
  | { value: null; zone: null }
  | { value: number; zone: 0 | 1 | 2 | 3 };

/** Acordo aparelho × PSR (persistido em `percepcao=` e exibido). */
export type PerceptionAgreement =
  | "nao_informada"
  | "concordante"
  | "discordante_acima"
  | "discordante_abaixo";

/** O que a PSR fez com a conduta (fonte ÚNICA da copy — E4). */
export type PerceptionOutcome =
  | "unchanged"
  | "raised"
  | "lowered"
  | "lowered_to_maintain"
  | "vetoed";

export type PerceptionVetoReason = "floor" | "strain" | null;

export interface PerceptionResult {
  agreement: PerceptionAgreement;
  outcome: PerceptionOutcome;
  vetoReason: PerceptionVetoReason;
  psr: number | null;
  baseZone: 0 | 1 | 2 | 3 | 4;
  /** Zona após a PSR e ANTES da alternativa. */
  zoneAfterPsr: 0 | 1 | 2 | 3 | 4;
}

/** Estados FECHADOS do contexto Whoop (R8-7). Desde a v9.2 (ponto 5
 *  ratificado) só `strain === "high"` veta a elevação 2→3; freshness e
 *  "unavailable" NÃO vetam (a sincronização não muda o recovery da noite). */
export interface WhoopConductContext {
  freshness: "fresh" | "stale" | "unavailable";
  strain: "non_high" | "high" | "unavailable";
  /** Valor medido (só informativo, pra copy); null quando não atribuível. */
  strainValue?: number | null;
}

export interface ConductAlternative {
  type: string;
  description: string;
  targetZone: 0 | 1 | 2 | 3 | 4;
  targetLoadDecision: "increase" | "maintain" | "reduce" | "block";
  targetAdjustmentPercent: number | null;
}

export interface ConductInput {
  base: TrainingRecommendation;
  source: "oura" | "whoop";
  score: number;
  /** PSR normalizado (toPsrSignal). value null → sem modulação. */
  psr: PsrSignal;
  alternative: ConductAlternative | null;
  /** null para Oura (contexto não se aplica). */
  whoopContext: WhoopConductContext | null;
  hasPartialError: boolean;
}

export interface ConductPrescription {
  trainingType: string;
  intensity: string;
  duration: string;
  emoji: string;
}

export interface EffectiveConduct {
  /** Zona da conduta (0-4); igual à base quando não há modulação. */
  effectiveZone: 0 | 1 | 2 | 3 | 4;
  prescription: ConductPrescription;
  effectiveLoadDecision: "increase" | "maintain" | "reduce" | "block";
  effectiveLoadAdjustmentPercent: number | null;
  /** true quando a conduta difere da recomendação-base. */
  modulated: boolean;
  /** Alternativa efetivamente aplicada (após o funil), se houver. */
  appliedAlternative: string | null;
  /** Vetos aplicados, em linguagem visível pro coach. */
  appliedVetoes: string[];
  /** "error": ação suspensa por dado incompleto (fonte pode estar errada). */
  suspended: "error" | null;
  /** Resultado estruturado da PSR (v9.2) — a UI renderiza a frase daqui. */
  perception: PerceptionResult;
}

export const ZONE_FROM_LABEL: Record<TrainingRecommendation["zone"], 0 | 1 | 2 | 3 | 4> = {
  green_high: 4,
  green: 3,
  yellow: 2,
  orange: 1,
  red: 0,
};

/** Mesmas prescrições por zona do motor (espelho verificado por teste). */
export const PRESCRIPTION_BY_ZONE: Record<0 | 1 | 2 | 3 | 4, ConductPrescription> = {
  4: { trainingType: "Máxima Performance / Desafio", intensity: "ALTA (80-95% FCMáx)", duration: "45-60 minutos", emoji: "💚" },
  3: { trainingType: "Treino Normal Completo", intensity: "MODERADA-ALTA (70-85% FCMáx)", duration: "45-55 minutos", emoji: "🟢" },
  2: { trainingType: "Treino Reduzido 20%", intensity: "MODERADA (60-75% FCMáx)", duration: "35-45 minutos", emoji: "🟡" },
  1: { trainingType: "Recuperação Ativa / Muito Leve", intensity: "BAIXA (30-50% FCMáx)", duration: "20-30 minutos", emoji: "🟠" },
  0: { trainingType: "Descanso Completo / Repouso", intensity: "MUITO BAIXA (0-20% FCMáx)", duration: "Repouso total", emoji: "🔴" },
};

const LOAD_BY_ZONE: Record<0 | 1 | 2 | 3 | 4, { decision: EffectiveConduct["effectiveLoadDecision"]; percent: number | null }> = {
  4: { decision: "increase", percent: 5 },
  3: { decision: "maintain", percent: 0 },
  2: { decision: "reduce", percent: -20 },
  1: { decision: "block", percent: null },
  0: { decision: "block", percent: null },
};

/** Agressividade de carga: quanto MAIOR, mais carga retida. Usada pra
 *  garantir que alternativa nunca é mais agressiva que o teto efetivo. */
const loadAggressiveness = (
  decision: EffectiveConduct["effectiveLoadDecision"],
  percent: number | null,
): number => {
  if (decision === "block") return -1000;
  if (decision === "increase") return 1000 + (percent ?? 0);
  if (decision === "maintain") return 0;
  return percent ?? -100; // reduce: −10 > −20
};

/**
 * Números "muito ruins" (piso ASSIMÉTRICO: bloqueia só modulação PRA CIMA;
 * reduzir nunca eleva a exposição e é sempre permitido).
 */
export const isNumericFloor = (input: Pick<ConductInput, "base" | "source" | "score">): boolean => {
  const hasCritical = input.base.alerts.some(
    (a) => a.kind === "fisiologico" && a.level === "CRITICAL",
  );
  if (hasCritical) return true;
  if (input.source === "whoop") return input.score <= 33;
  return input.score < 45; // Oura zonas 0-1
};

export const computeEffectiveConduct = (input: ConductInput): EffectiveConduct => {
  const baseZone = ZONE_FROM_LABEL[input.base.zone];
  const vetoes: string[] = [];

  const baseConduct = (overrides?: Partial<EffectiveConduct>): EffectiveConduct => ({
    effectiveZone: baseZone,
    prescription: {
      trainingType: input.base.trainingType,
      intensity: input.base.intensity,
      duration: input.base.duration,
      emoji: input.base.emoji,
    },
    effectiveLoadDecision: input.base.loadDecision,
    effectiveLoadAdjustmentPercent: input.base.loadAdjustmentPercent,
    modulated: false,
    appliedAlternative: null,
    appliedVetoes: vetoes,
    suspended: null,
    perception: {
      agreement: "nao_informada", outcome: "unchanged", vetoReason: null,
      psr: null, baseZone, zoneAfterPsr: baseZone,
    },
    ...overrides,
  });

  // 1) ERRO precede tudo: fonte pode estar errada — nada acionável. A PSR
  //    é semanticamente ignorada (A2 da revisão fria).
  if (input.hasPartialError) {
    return baseConduct({
      suspended: "error",
      perception: {
        agreement: "nao_informada", outcome: "unchanged", vetoReason: null,
        psr: null, baseZone, zoneAfterPsr: baseZone,
      },
    });
  }

  const floor = isNumericFloor(input);
  const hasCritical = input.base.alerts.some(
    (a) => a.kind === "fisiologico" && a.level === "CRITICAL",
  );
  if (hasCritical) {
    vetoes.push("Sinal fisiológico crítico presente. Confirme a conduta antes do treino.");
  }

  // 2) PSR — matriz normativa v9.2 (§3). Ordem: teto absoluto (PSR 0–3) →
  //    concordância → divergência (manter / elevar com gates / piso).
  let zone = baseZone;
  let capMaintain = false;
  let agreement: PerceptionAgreement = "nao_informada";
  let outcome: PerceptionOutcome = "unchanged";
  let vetoReason: PerceptionVetoReason = null;
  const psrZone = input.psr.zone;
  if (psrZone !== null) {
    const concordant =
      (baseZone >= 3 && psrZone === 3) ||
      (baseZone === 2 && psrZone === 2) ||
      (baseZone === 1 && psrZone === 1) ||
      (baseZone === 0 && psrZone === 0);
    agreement = concordant
      ? "concordante"
      : psrZone > baseZone
        ? "discordante_acima"
        : "discordante_abaixo";
    const strainVeto = input.source === "whoop" && input.whoopContext?.strain === "high";
    if (psrZone <= 1) {
      // Ponto 4: PSR 0–3 é teto absoluto para QUALQUER base.
      if (psrZone < baseZone) {
        zone = psrZone;
        outcome = "lowered";
      } else if (psrZone > baseZone) {
        // (base 0, PSR 2–3): tentativa de subir barrada pelo piso — frase visível (ponto 6).
        vetoReason = "floor";
        outcome = "vetoed";
      }
    } else if (!concordant) {
      if (baseZone >= 3) {
        // (4|3, PSR 4–6): discordância sem piso → manter (derruba o increase).
        zone = 3;
        outcome = baseZone === 4 ? "lowered_to_maintain" : "unchanged";
      } else if (baseZone === 2) {
        // (2, PSR 7–10): elevação — gates = piso + strain conhecido alto.
        if (floor) {
          vetoReason = "floor";
          outcome = "vetoed";
        } else if (strainVeto) {
          vetoReason = "strain";
          outcome = "vetoed";
        } else {
          zone = 3;
          capMaintain = true;
          outcome = "raised";
        }
      } else {
        // (1|0, PSR 4–10): zona ≤1 é sempre piso.
        vetoReason = "floor";
        outcome = "vetoed";
      }
    }
  }
  const perceptionResult: PerceptionResult = {
    agreement, outcome, vetoReason, psr: input.psr.value, baseZone, zoneAfterPsr: zone,
  };

  // Teto permitido por base+percepção+vetos (alternativa nunca passa dele).
  const ceiling = zone;

  // 3) ALTERNATIVA (7 regras da revisão)
  let appliedAlternative: string | null = null;
  let altLoad: { decision: EffectiveConduct["effectiveLoadDecision"]; percent: number | null } | null = null;
  if (input.alternative) {
    const alt = input.alternative;
    const wantsUp = alt.targetZone > ceiling;
    if (alt.targetZone === 4 && baseZone !== 4) {
      vetoes.push(`Alternativa "${alt.type}" ignorada: zona 4 nunca nasce de ação humana.`);
    } else if (wantsUp) {
      vetoes.push(
        `Alternativa "${alt.type}" acima do teto permitido (${PRESCRIPTION_BY_ZONE[ceiling].trainingType}) — não aplicada.`,
      );
    } else {
      zone = alt.targetZone;
      appliedAlternative = alt.type;
      altLoad = { decision: alt.targetLoadDecision, percent: alt.targetAdjustmentPercent };
    }
  }

  // 4) CARGA da conduta
  let load = altLoad ?? LOAD_BY_ZONE[zone];
  // Alternativa nunca mais agressiva que a carga da zona-teto.
  const ceilingLoad =
    capMaintain && LOAD_BY_ZONE[ceiling].decision === "increase"
      ? { decision: "maintain" as const, percent: 0 }
      : LOAD_BY_ZONE[ceiling];
  if (loadAggressiveness(load.decision, load.percent) > loadAggressiveness(ceilingLoad.decision, ceilingLoad.percent)) {
    load = ceilingLoad;
    vetoes.push("Carga da alternativa limitada ao teto da conduta.");
  }
  // Percepção "melhor" nunca gera increase.
  if (capMaintain && load.decision === "increase") {
    load = { decision: "maintain", percent: 0 };
  }
  // 5) BLOCK ABSOLUTO da base sobrevive a tudo.
  if (input.base.loadDecision === "block" && load.decision !== "block") {
    load = { decision: "block", percent: null };
    vetoes.push("Carga permanece bloqueada pela recomendação-base (block é absoluto).");
  }

  return baseConduct({
    effectiveZone: zone,
    prescription: PRESCRIPTION_BY_ZONE[zone],
    effectiveLoadDecision: load.decision,
    effectiveLoadAdjustmentPercent: load.decision === "block" ? null : load.percent,
    modulated: zone !== baseZone || appliedAlternative !== null,
    appliedAlternative,
    perception: perceptionResult,
  });
};
