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

/**
 * Janela de calendário que a PÁGINA pede ao useWhoopMetrics pra alimentar a
 * recomendação — o guard de truncamento abaixo depende dela.
 */
export const WHOOP_RECOMMENDATION_WINDOW_DAYS = 90;

/** Aritmética date-only SEMPRE em UTC (padrão do projeto — fusos a leste). */
const shiftDays = (date: string, delta: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

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
 * @param queryAnchorDate O "hoje" em que a consulta da página foi ancorada.
 *   Com ele, um baseline cuja janela começa ANTES da cobertura da consulta é
 *   descartado (insuficiente) em vez de calculado truncado — de dentro do
 *   array não dá pra distinguir "sem dado" de "dado não buscado".
 */
export const buildWhoopRecommendation = (
  rows: WhoopMetrics[],
  date: string,
  queryAnchorDate?: string,
): WhoopRecommendationResult => {
  const dayRow = rows.find((w) => w.date === date);
  if (!dayRow) return { recommendation: null, dayNotScored: false };

  const input = whoopToRecoveryInput(dayRow);
  if (!input) return { recommendation: null, dayNotScored: true };

  // Histórico: só dias ANTERIORES ao avaliado (dia futuro ou o próprio dia
  // não contam como "histórico"); baseline ancorado no dia avaliado.
  const history = whoopHistoryToRecoveryDays(rows.filter((w) => w.date < date));
  const coverageStart = queryAnchorDate
    ? shiftDays(queryAnchorDate, -(WHOOP_RECOMMENDATION_WINDOW_DAYS - 1))
    : null;
  const baselineTruncated = coverageStart !== null && shiftDays(date, -30) < coverageStart;
  const baseline = baselineTruncated
    ? buildWhoopBaseline([], date) // janela cortada pela consulta → insuficiente
    : buildWhoopBaseline(rows, date);

  return {
    recommendation: computeRecoveryRecommendation(input, history, baseline),
    dayNotScored: false,
  };
};
