import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const YYYY_MM_DD_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const DD_MM_YYYY_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const parseSessionDate = (dateValue: string | Date | null | undefined): Date | null => {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return isValid(dateValue) ? dateValue : null;
  }

  const raw = String(dateValue).trim();
  if (!raw) return null;

  const ymdMatch = raw.match(YYYY_MM_DD_REGEX);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    const localDate = new Date(year, month - 1, day);
    return isValid(localDate) ? localDate : null;
  }

  const dmyMatch = raw.match(DD_MM_YYYY_REGEX);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    const localDate = new Date(year, month - 1, day);
    return isValid(localDate) ? localDate : null;
  }

  const isoCandidate = raw.includes(" ") ? raw.replace(" ", "T") : raw;
  const parsedIso = parseISO(isoCandidate);
  if (isValid(parsedIso)) return parsedIso;

  const parsedDate = new Date(raw);
  return isValid(parsedDate) ? parsedDate : null;
};

export const formatSessionDate = (
  dateValue: string | Date | null | undefined,
  formatPattern = "dd/MM/yyyy"
): string => {
  const parsedDate = parseSessionDate(dateValue);
  if (!parsedDate) return "--/--/----";
  return format(parsedDate, formatPattern, { locale: ptBR });
};

