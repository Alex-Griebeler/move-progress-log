import { useMemo } from "react";
import { OuraMetrics } from "./useOuraMetrics";
import { OuraBaseline } from "./useOuraBaseline";
import { OuraAcuteMetrics } from "./useOuraAcuteMetrics";
import {
  computeRecoveryRecommendation,
  type TrainingRecommendation,
  type UserGoals,
} from "@/utils/recoveryEngine";
import {
  ouraBaselineToRecoveryBaseline,
  ouraHistoryToRecoveryDays,
  ouraToRecoveryInput,
} from "@/utils/recoveryAdapters";

/**
 * FACHADA Oura do motor normalizado (R3).
 *
 * A assinatura pública é a histórica — quem consome não mudou. Por dentro,
 * os dados passam pelos adapters e caem no motor normalizado
 * (utils/recoveryEngine.ts), o mesmo que a fase Whoop vai usar. Os testes
 * comportamentais deste arquivo rodam contra ESTE entrypoint: são a prova
 * de que a normalização não mudou o comportamento Oura.
 */

export type { TrainingRecommendation, UserGoals };

export function calculateTrainingRecommendation(
  metrics: OuraMetrics | null,
  recentMetrics: OuraMetrics[] = [],
  baseline?: OuraBaseline,
  userGoals?: Partial<UserGoals>,
  acuteMetrics?: OuraAcuteMetrics | null
): TrainingRecommendation | null {
  if (!metrics) return null;

  // Sem score de prontidão fechado não há recomendação: inventar um score
  // produzia uma "zona amarela" com cara de dado real. O chamador trata
  // null como estado próprio ("sem recomendação"), não como erro.
  const input = ouraToRecoveryInput(metrics, acuteMetrics);
  if (!input) return null;

  return computeRecoveryRecommendation(
    input,
    ouraHistoryToRecoveryDays(recentMetrics),
    ouraBaselineToRecoveryBaseline(baseline),
    userGoals,
  );
}

/**
 * MEL-IA-001: Usa baseline dinâmico do aluno (via useOuraBaseline) em vez de defaults hardcoded.
 * O parâmetro `baseline` vem do hook useOuraBaseline e já inclui fallback automático.
 */
export function useTrainingRecommendation(
  metrics: OuraMetrics | null,
  recentMetrics: OuraMetrics[] = [],
  baseline?: OuraBaseline,
  userGoals?: Partial<UserGoals>,
  acuteMetrics?: OuraAcuteMetrics | null
): TrainingRecommendation | null {
  return useMemo(() => {
    return calculateTrainingRecommendation(metrics, recentMetrics, baseline, userGoals, acuteMetrics);
  }, [metrics, recentMetrics, baseline, userGoals, acuteMetrics]);
}
