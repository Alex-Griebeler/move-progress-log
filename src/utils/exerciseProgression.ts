import { parseLocalDate } from "@/utils/relativeDate";

/**
 * Progressão de carga por exercício (PR-7) — lógica PURA e testada
 * comportamentalmente. Fonte: entradas do useExerciseHistory.
 */

export interface HistoryEntryLike {
  session_date: string;
  load_kg?: number | null;
  total_volume?: number | null;
}

export interface TopSetPoint {
  date: string;
  /** Maior carga da sessão; null = sessão sem carga estruturada. */
  value: number | null;
  /** true quando este ponto é recorde histórico até a data. */
  isPr: boolean;
}

/** Top-set por dia (asc), com marcação de PR (recorde até a data). */
export const buildTopSetSeries = (history: HistoryEntryLike[]): TopSetPoint[] => {
  const byDate = new Map<string, number | null>();
  for (const h of history) {
    if (!h.session_date) continue;
    const load = h.load_kg ?? null;
    const current = byDate.get(h.session_date);
    if (current === undefined || (load !== null && (current === null || load > current))) {
      byDate.set(h.session_date, load);
    }
  }
  const asc = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  // null (não 0): carga zero REAL (bodyweight) no primeiro registro também
  // é recorde — inicializar em 0 o excluía enquanto o tile de PR o mostrava.
  let runningMax: number | null = null;
  return asc.map(([date, value]) => {
    const isPr = value !== null && (runningMax === null || value > runningMax);
    if (isPr) runningMax = value!;
    return { date, value, isPr };
  });
};

export interface ProgressionStats {
  /** Última sessão com carga (top set + data); null sem histórico com carga. */
  current: { date: string; loadKg: number } | null;
  /** Recorde histórico. */
  pr: { date: string; loadKg: number } | null;
  /** Δ% do melhor top-set das últimas 4 semanas vs as 4 anteriores; null sem base. */
  delta4wPercent: number | null;
  /** Volume somado das últimas 4 semanas. */
  volume4wKg: number;
}

export const progressionStats = (
  history: HistoryEntryLike[],
  now: Date = new Date(),
): ProgressionStats => {
  const series = buildTopSetSeries(history);
  const withLoad = series.filter((p) => p.value !== null);

  const current = withLoad.length
    ? { date: withLoad[withLoad.length - 1].date, loadKg: withLoad[withLoad.length - 1].value! }
    : null;

  let pr: ProgressionStats["pr"] = null;
  for (const p of withLoad) {
    if (!pr || p.value! > pr.loadKg) pr = { date: p.date, loadKg: p.value! };
  }

  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const cut4w = dayStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 27));
  const cut8w = dayStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 55));
  const inWindow = (date: string, from: Date, to: Date) => {
    const d = parseLocalDate(date);
    return d >= from && d < to;
  };
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const best = (points: TopSetPoint[]) =>
    points.reduce<number | null>((max, p) => {
      if (p.value === null) return max;
      return max === null || p.value > max ? p.value : max;
    }, null);

  const last4w = best(withLoad.filter((p) => inWindow(p.date, cut4w, endOfToday)));
  const prev4w = best(withLoad.filter((p) => inWindow(p.date, cut8w, cut4w)));
  const delta4wPercent =
    last4w !== null && prev4w !== null && prev4w > 0
      ? Math.round(((last4w - prev4w) / prev4w) * 100)
      : null;

  const volume4wKg = Math.round(
    history
      .filter((h) => h.session_date && inWindow(h.session_date, cut4w, endOfToday))
      .reduce((sum, h) => sum + (h.total_volume ?? 0), 0),
  );

  return { current, pr, delta4wPercent, volume4wKg };
};
