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

export interface UnscoredWhoopDay {
  date: string;
  /** "pending" ainda pode fechar; "unscorable" é TERMINAL — nunca fecha. */
  state: "pending" | "unscorable";
}

/**
 * Dia Whoop MAIS NOVO que `sinceDate` (ou qualquer um, se null) cujo score
 * não fechou. O snapshot pula esses dias — sem este aviso, "hoje pendente +
 * ontem fechado" prescreveria com o score de ontem sem nenhuma sinalização
 * (isStale só dispara com 2 dias). PENDING e UNSCORABLE são estados
 * DIFERENTES na UI: prometer "aparece quando fechar" pra um dia
 * inscorável seria mentira (auditoria 29/08).
 */
export const newerUnscoredWhoopDay = (
  rows: WhoopMetrics[],
  sinceDate: string | null,
): UnscoredWhoopDay | null => {
  let newest: UnscoredWhoopDay | null = null;
  for (const w of rows) {
    if (w.score_state == null || w.score_state === "SCORED") continue;
    if (sinceDate !== null && w.date <= sinceDate) continue;
    if (newest === null || w.date > newest.date) {
      newest = {
        date: w.date,
        state: w.score_state === "UNSCORABLE" ? "unscorable" : "pending",
      };
    }
  }
  return newest;
};

/**
 * true quando a janela do baseline ([date−30, date)) começa ANTES da
 * cobertura da consulta ancorada em `queryAnchorDate` — nesse caso o
 * baseline seria calculado truncado sem que dê pra perceber. Desde a
 * decisão de limiares por aparelho (29/08) nenhuma regra Whoop consome o
 * baseline, mas o guard fica: qualquer calibração futura por aparelho
 * (ex.: SWC por aluno) herda a proteção.
 */
export const isBaselineWindowTruncated = (date: string, queryAnchorDate: string): boolean =>
  shiftDays(date, -30) < shiftDays(queryAnchorDate, -(WHOOP_RECOMMENDATION_WINDOW_DAYS - 1));

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
  const baseline =
    queryAnchorDate !== undefined && isBaselineWindowTruncated(date, queryAnchorDate)
      ? buildWhoopBaseline([], date) // janela cortada pela consulta → insuficiente
      : buildWhoopBaseline(rows, date);

  return {
    recommendation: computeRecoveryRecommendation(input, history, baseline),
    dayNotScored: false,
  };
};
