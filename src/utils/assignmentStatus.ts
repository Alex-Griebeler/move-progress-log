import { parseLocalDate } from "@/utils/relativeDate";

/**
 * Status e progresso de uma atribuição de prescrição (aba Prescrições).
 * Regras ratificadas no plano (consenso Codex):
 * - vigente  = start_date <= hoje E (end_date null OU end_date >= hoje),
 *   extremos INCLUSOS;
 * - futura   = start_date > hoje;
 * - expirada = end_date < hoje.
 * Datas date-only comparadas como dia LOCAL (parseLocalDate).
 */

export type AssignmentStatus = "vigente" | "futura" | "expirada";

interface AssignmentDates {
  start_date: string | null;
  end_date: string | null;
}

const localDayStart = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const assignmentStatus = (
  a: AssignmentDates,
  now: Date = new Date(),
): AssignmentStatus => {
  const today = localDayStart(now);
  // Sem start_date (dado órfão): trata como vigente-aberta pra não sumir da UI.
  const start = a.start_date ? localDayStart(parseLocalDate(a.start_date)) : today;
  const end = a.end_date ? localDayStart(parseLocalDate(a.end_date)) : null;

  if (start > today) return "futura";
  if (end !== null && end < today) return "expirada";
  return "vigente";
};

export interface AssignmentProgress {
  week: number;
  totalWeeks: number;
  /** 0-100, clampado. */
  percent: number;
}

/** Progresso "semana N de M" — só com end_date; senão null (UI: "desde DD/MM"). */
export const assignmentProgress = (
  a: AssignmentDates,
  now: Date = new Date(),
): AssignmentProgress | null => {
  if (!a.start_date || !a.end_date) return null;
  const start = localDayStart(parseLocalDate(a.start_date));
  const end = localDayStart(parseLocalDate(a.end_date));
  if (end < start) return null;

  const DAY = 86_400_000;
  const totalDays = Math.round((end - start) / DAY) + 1;
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  const today = localDayStart(now);
  const elapsedDays = Math.round((today - start) / DAY) + 1;
  const week = Math.min(totalWeeks, Math.max(1, Math.ceil(elapsedDays / 7)));
  const percent = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));

  return { week, totalWeeks, percent };
};
