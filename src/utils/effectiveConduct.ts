/**
 * Conduta efetiva (R8b — decisão ratificada 29/08): "as decisões não podem
 * ser baseadas apenas nos números; a percepção do aluno é ainda mais
 * importante, excetuando casos onde os números estão muito ruins."
 *
 * A recomendação-base do aparelho NUNCA é sobrescrita — este módulo compõe
 * por cima dela a conduta do coach (percepção da aluna + alternativa
 * escolhida), com ordem geradora FIXA (plano R8 v2+v3, 3 rodadas de
 * revisão): erro → sintomas → base → percepção/teto → alternativa → block
 * absoluto. Zona 4 nunca nasce de ação humana; block de carga sobrevive a
 * tudo.
 */

import type { TrainingRecommendation } from "@/utils/recoveryEngine";

export type Perception = "nao_informada" | "pior" | "condizente" | "melhor";

/** Estados FECHADOS do contexto Whoop (R8-7). Ausente/indisponível = veto
 *  de elevação, não piso — na fase R8b (antes da R8d) o chamador passa
 *  "unavailable" e a elevação fica fail-closed pra Whoop. */
export interface WhoopConductContext {
  freshness: "fresh" | "stale" | "unavailable";
  strain: "non_high" | "high" | "unavailable";
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
  perception: Perception;
  /** null = pergunta de sintomas ainda não respondida. */
  symptoms: boolean | null;
  /** true depois do coach clicar "Avaliei — liberar conduta conservadora". */
  symptomsAcknowledged: boolean;
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
  /** "error": ação suspensa por dado incompleto. "symptoms": carga numérica
   *  e CTA suspensos até avaliação explícita do coach. */
  suspended: "error" | "symptoms" | null;
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

const clampZone = (z: number): 0 | 1 | 2 | 3 | 4 =>
  Math.max(0, Math.min(4, z)) as 0 | 1 | 2 | 3 | 4;

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
    ...overrides,
  });

  // 1) ERRO precede tudo: fonte pode estar errada — nada acionável.
  if (input.hasPartialError) {
    return baseConduct({ suspended: "error" });
  }

  // 2) SINTOMAS (regra 0 clínica): sem avaliação explícita do coach, carga
  // numérica e CTA ficam suspensos; nada de conversão automática em zona.
  if (input.symptoms === true && !input.symptomsAcknowledged) {
    vetoes.push(
      "Sintomas relatados — sugestão de carga e início de treino suspensos até avaliação do coach.",
    );
    return baseConduct({ suspended: "symptoms" });
  }

  const floor = isNumericFloor(input);
  const hasCritical = input.base.alerts.some(
    (a) => a.kind === "fisiologico" && a.level === "CRITICAL",
  );
  if (hasCritical) {
    vetoes.push("Sinal crítico presente — confirme com a aluna antes de manter o programado.");
  }

  // 3) PERCEPÇÃO
  let zone = baseZone;
  let capMaintain = false;
  if (input.perception === "pior") {
    zone = clampZone(Math.min(baseZone - 1, 2));
    if (zone !== baseZone) {
      vetoes.push("Conduta reduzida pela percepção da aluna (pior que o score).");
    }
  } else if (input.perception === "melhor") {
    const elevationBlockers: string[] = [];
    if (floor) elevationBlockers.push("sinais objetivos muito baixos (piso numérico)");
    if (input.symptoms !== false) elevationBlockers.push("sintomas não descartados");
    if (input.symptoms === true) elevationBlockers.push("sintomas relatados");
    if (input.source === "whoop") {
      if (input.whoopContext?.freshness !== "fresh") {
        elevationBlockers.push("sincronização do Whoop não está fresca");
      }
      if (input.whoopContext?.strain !== "non_high") {
        elevationBlockers.push("strain do dia alto ou indisponível");
      }
    }
    if (elevationBlockers.length === 0) {
      // Só zona base ≤2 SOBE; zona 3 já é o teto humano; zona 4 objetiva
      // NÃO é desfeita por "melhor" (a progressão +5% foi autorizada por
      // todos os gates numéricos — percepção não a apaga; revisão R8b).
      if (baseZone <= 2) {
        zone = clampZone(baseZone + 1);
        capMaintain = true;
        vetoes.push("Conduta elevada pela percepção da aluna (melhor que o score) — carga nunca progride por percepção.");
      }
    } else {
      vetoes.push(
        `Elevação por percepção bloqueada: ${elevationBlockers.join("; ")}.`,
      );
    }
  }
  // "nao_informada"/"condizente": conduta = base (sem modulação por percepção).

  // Sintomas avaliados e liberados: conduta capada no caminho conservador.
  if (input.symptoms === true && input.symptomsAcknowledged) {
    const conservative = clampZone(Math.min(baseZone - 1, 2));
    if (zone > conservative) {
      zone = conservative;
      vetoes.push("Sintomas avaliados pelo coach — conduta limitada ao caminho conservador.");
    }
  }

  // Teto permitido por base+percepção+vetos (alternativa nunca passa dele).
  const ceiling = zone;

  // 4) ALTERNATIVA (7 regras da revisão)
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

  // 5) CARGA da conduta
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
  // 6) BLOCK ABSOLUTO da base sobrevive a tudo.
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
  });
};
