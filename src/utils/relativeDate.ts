/**
 * Datas relativas em PT-BR pra staleness de métricas ("hoje", "ontem",
 * "há N dias"). Datas date-only ("YYYY-MM-DD") são interpretadas como dia
 * LOCAL (não UTC) — new Date("2026-08-26") seria UTC e viraria "ontem" à
 * noite no fuso de São Paulo.
 */

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const startOfLocalDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const parseLocalDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  if (DATE_ONLY_RE.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
};

/** Dias corridos (0 = hoje, 1 = ontem…) entre a data e `now`. */
export const daysAgo = (value: string | Date, now: Date = new Date()): number => {
  const date = parseLocalDate(value);
  const diffMs = startOfLocalDay(now) - startOfLocalDay(date);
  return Math.round(diffMs / 86_400_000);
};

export const formatRelativeDay = (
  value: string | Date,
  now: Date = new Date(),
): string => {
  const n = daysAgo(value, now);
  if (n <= 0) return "hoje";
  if (n === 1) return "ontem";
  return `há ${n} dias`;
};

/**
 * Diferença em dias entre duas datas date-only ("YYYY-MM-DD"), via UTC —
 * ancore `todayStr` no calendário do PRODUTO (spToday() = America/Sao_Paulo)
 * pra "ontem" ser o ontem do coach, não o do runtime (R8-1).
 */
export const daysBetweenDateOnly = (todayStr: string, dateStr: string): number => {
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86_400_000);
};

/** date-only ± N dias, aritmética UTC (padrão do projeto). */
export const shiftDateOnly = (dateStr: string, delta: number): string => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};
