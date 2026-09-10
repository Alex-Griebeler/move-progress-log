/**
 * Helpers puros do oura-sync (testáveis em Deno sem rede/Supabase).
 *
 * Janela de datas: a API v2 do Oura trata `end_date` como EXCLUSIVO —
 * `start_date=D&end_date=D` devolve zero documentos e `D..D+1` devolve o dia D
 * (verificado no sandbox oficial em 2026-09-09 para daily_activity,
 * daily_sleep, daily_readiness, sleep, workout, daily_stress, daily_spo2 e
 * daily_resilience). Por isso pedimos `D..D+1` e FILTRAMOS pelo campo `day`
 * do documento — assim a extração fica correta quer a API devolva só D, quer
 * devolva também D+1.
 */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Data válida no calendário (rejeita 2026-02-30, 2026-13-01…). */
export const isValidCalendarDate = (date: string): boolean => {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
};

/** Documento da API do Oura (JSON sem contrato tipado no repositório). */
// deno-lint-ignore no-explicit-any
export type LooseDoc = Record<string, any>;

/** Dia seguinte no calendário (YYYY-MM-DD), sem depender do fuso do runtime. */
export const nextCalendarDay = (date: string): string => {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + 1));
  return utc.toISOString().slice(0, 10);
};

/** Dia anterior no calendário (YYYY-MM-DD). */
export const previousCalendarDay = (date: string, days = 1): string => {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d - days));
  return utc.toISOString().slice(0, 10);
};

/** Hoje em America/Sao_Paulo (YYYY-MM-DD). */
export const todayInSaoPaulo = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(now);

/** Janela [start, end] a enviar à API para cobrir exatamente o dia `date`. */
export const apiDateWindow = (date: string): { start_date: string; end_date: string } => ({
  start_date: date,
  end_date: nextCalendarDay(date),
});

/** Datas do lookback: hoje, ontem, … (mais recente primeiro). */
export const lookbackDates = (today: string, lookbackDays: number): string[] =>
  Array.from({ length: Math.max(0, lookbackDays) + 1 }, (_, i) =>
    i === 0 ? today : previousCalendarDay(today, i),
  );

type Doc = LooseDoc;

const isDoc = (value: unknown): value is Doc =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Documentos de uma coleção cujo `day` é exatamente `date`. */
export const documentsForDay = (payload: unknown, date: string): Doc[] => {
  const data = isDoc(payload) && Array.isArray(payload.data) ? payload.data : [];
  return data.filter((item): item is Doc => isDoc(item) && item.day === date);
};

/** Primeiro documento do dia (daily_* têm um por dia). */
export const documentForDay = (payload: unknown, date: string): Doc | null =>
  documentsForDay(payload, date)[0] ?? null;

/** Período de sono mais longo do dia (o Oura devolve long_sleep + naps). */
export const longestSleepPeriodForDay = (payload: unknown, date: string): Doc | null => {
  const periods = documentsForDay(payload, date);
  if (periods.length === 0) return null;
  return periods.reduce((longest, current) => {
    const l = typeof longest.total_sleep_duration === "number" ? longest.total_sleep_duration : 0;
    const c = typeof current.total_sleep_duration === "number" ? current.total_sleep_duration : 0;
    return c > l ? current : longest;
  });
};

/** Treinos do dia: o documento tem `day`; quando não tem, usa a data de início. */
export const workoutsForDay = (payload: unknown, date: string): Doc[] => {
  const data = isDoc(payload) && Array.isArray(payload.data) ? payload.data : [];
  return data.filter((item): item is Doc => {
    if (!isDoc(item)) return false;
    if (typeof item.day === "string") return item.day === date;
    return typeof item.start_datetime === "string" && item.start_datetime.slice(0, 10) === date;
  });
};

/**
 * Merge que preserva o valor anterior quando o novo é null (payload esparso do
 * Oura). Nunca rebaixa um campo preenchido para null.
 */
export const mergePreservingExisting = (
  incoming: Record<string, unknown>,
  existing: Record<string, unknown> | null,
): Record<string, unknown> => {
  if (!existing) return incoming;
  const merged: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = value ?? existing[key] ?? null;
  }
  return merged;
};

export const hasAnyMetricValue = (metrics: Record<string, unknown>): boolean =>
  Object.entries(metrics).some(([key, value]) => {
    if (key === "student_id" || key === "date") return false;
    return value !== null && value !== undefined;
  });

export type SyncOutcome = "no_data" | "partial" | "complete";

/**
 * Resultado do dia para logs/UI: `complete` = sono E prontidão presentes;
 * `partial` = algum dado, mas sem os dois scores; `no_data` = nada.
 */
export const classifyOutcome = (
  metrics: Record<string, unknown> | null,
  hasAcuteData: boolean,
  hasWorkouts: boolean,
): SyncOutcome => {
  if (metrics && metrics.sleep_score != null && metrics.readiness_score != null) return "complete";
  if ((metrics && hasAnyMetricValue(metrics)) || hasAcuteData || hasWorkouts) return "partial";
  return "no_data";
};

/** Desvio de temperatura: campo de TOPO do daily_readiness (não de contributors). */
export const temperatureDeviationFrom = (readiness: Doc | null): number | null =>
  readiness && typeof readiness.temperature_deviation === "number"
    ? readiness.temperature_deviation
    : null;

/**
 * Plano de trabalho do oura-sync-all: data mais recente PRIMEIRO para todas
 * as alunas (hoje > ontem > anteontem), em lotes. Se o orçamento de tempo da
 * execução acabar, o que fica de fora são preferencialmente os dias mais
 * antigos; sob saturação forte (muitas alunas/lookback alto) até lotes de
 * hoje podem ficar de fora — não há cursor entre execuções.
 */
export interface WorkStep<T> {
  date: string;
  items: T[];
}

export const buildWorkPlan = <T>(dates: string[], items: T[], batchSize: number): WorkStep<T>[] => {
  const steps: WorkStep<T>[] = [];
  const size = Math.max(1, batchSize);
  for (const date of dates) {
    for (let i = 0; i < items.length; i += size) {
      steps.push({ date, items: items.slice(i, i + size) });
    }
  }
  return steps;
};

/** Há orçamento para mais um passo? (`now` e `deadline` em ms) */
export const hasBudgetFor = (now: number, deadline: number, stepEstimateMs: number): boolean =>
  deadline - now >= stepEstimateMs;
