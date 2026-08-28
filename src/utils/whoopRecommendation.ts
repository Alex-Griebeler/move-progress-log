/**
 * Montagem da recomendação Whoop (R5) — lógica PURA e testável.
 *
 * Requisitos herdados da revisão da normalização: selecionar o DIA primeiro
 * e casar linha, baseline e histórico com o MESMO {source, date}; nunca
 * misturar agudas/baseline Oura com um dia Whoop; baseline ancorado na data
 * do dia avaliado (não em "hoje").
 */

import type { WhoopMetrics } from "@/hooks/useWhoopMetrics";
import {
  buildWhoopBaseline,
  whoopHistoryToRecoveryDays,
  whoopToRecoveryInput,
} from "@/utils/recoveryAdapters";
import {
  computeRecoveryRecommendation,
  type TrainingRecommendation,
} from "@/utils/recoveryEngine";

export interface WhoopRecommendationResult {
  recommendation: TrainingRecommendation | null;
  /**
   * true quando o dia existe mas não está SCORED (pendente/inscorável) —
   * estado próprio na UI, diferente de "sem dado".
   */
  dayNotScored: boolean;
}

/**
 * @param rows Janela de métricas Whoop (precisa cobrir [date−30, date]).
 * @param date O dia selecionado pelo snapshot (source === "whoop").
 */
export const buildWhoopRecommendation = (
  rows: WhoopMetrics[],
  date: string,
): WhoopRecommendationResult => {
  const dayRow = rows.find((w) => w.date === date);
  if (!dayRow) return { recommendation: null, dayNotScored: false };

  const input = whoopToRecoveryInput(dayRow);
  if (!input) return { recommendation: null, dayNotScored: true };

  // Histórico: só dias ANTERIORES ao avaliado (dia futuro ou o próprio dia
  // não contam como "histórico"); baseline ancorado no dia avaliado.
  const history = whoopHistoryToRecoveryDays(rows.filter((w) => w.date < date));
  const baseline = buildWhoopBaseline(rows, date);

  return {
    recommendation: computeRecoveryRecommendation(input, history, baseline),
    dayNotScored: false,
  };
};
