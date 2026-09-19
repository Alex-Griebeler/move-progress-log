/**
 * Formatação de APRESENTAÇÃO única do app (revisão UX 18/09, problema S4):
 * números sempre em pt-BR (vírgula decimal) e horários sempre no fuso do
 * estúdio (America/Sao_Paulo), independentemente do navegador. Toda tela
 * nova ou tocada usa estes helpers — nunca toFixed() nem toLocaleTimeString()
 * sem timeZone.
 */

export const STUDIO_TIME_ZONE = "America/Sao_Paulo";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** 12,5 · 1.234,5 — casas fixas; "—" para ausente. */
export const formatNumberBR = (
  value: number | null | undefined,
  decimals = 0,
): string =>
  isNum(value)
    ? value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : "—";

/** Até `maxDecimals` casas sem zeros à direita: 40 → "40", 42,5 → "42,5". */
export const formatDecimalBR = (value: number | null | undefined, maxDecimals = 1): string =>
  isNum(value) ? value.toLocaleString("pt-BR", { maximumFractionDigits: maxDecimals }) : "—";

/** Carga: "40 kg" · "42,5 kg"; "—" para ausente. */
export const formatKg = (value: number | null | undefined): string =>
  isNum(value) ? `${formatDecimalBR(value, 2)} kg` : "—";

/** "07:42" no fuso do estúdio a partir de ISO/Date. */
export const formatTimeSP = (value: string | number | Date | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: STUDIO_TIME_ZONE });
};

/** "18/09" ou "18/09/2026" no fuso do estúdio a partir de ISO/Date. */
export const formatDateSP = (
  value: string | number | Date | null | undefined,
  withYear = false,
): string => {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    ...(withYear ? { year: "numeric" as const } : {}),
    timeZone: STUDIO_TIME_ZONE,
  });
};
