import { parseLocalDate } from "@/utils/relativeDate";

/**
 * Agregados de sessões pra aba Sessões (PR-6) — lógica PURA e testável
 * comportamentalmente (pedido da review: string-assert não pega empate de
 * ordenação nem janela semanal).
 */

export interface SessionLike {
  id: string;
  date: string;
  time: string;
  session_type: string;
  exercises?: Array<{
    load_kg?: number | null;
    sets?: number | null;
    reps?: number | null;
  }> | null;
}

/** Fórmula única (PR-0): load × sets × reps. */
export const sessionVolume = (s: SessionLike): number =>
  s.exercises?.reduce((sum, ex) => {
    const volume = ex.reps && ex.sets && ex.load_kg ? ex.load_kg * ex.sets * ex.reps : 0;
    return sum + volume;
  }, 0) ?? 0;

/** Ordem cronológica determinística: data, depois hora, depois id. */
const chronological = (a: SessionLike, b: SessionLike): number =>
  a.date.localeCompare(b.date) ||
  (a.time ?? "").localeCompare(b.time ?? "") ||
  a.id.localeCompare(b.id);

/**
 * Δ% de volume vs a sessão ANTERIOR do mesmo tipo. null quando não há base
 * (primeira do tipo, ou anterior/atual sem carga estruturada).
 */
export const computeVolumeDeltas = (sessions: SessionLike[]): Map<string, number | null> => {
  const byType = new Map<string, SessionLike[]>();
  for (const s of sessions) {
    const list = byType.get(s.session_type) ?? [];
    list.push(s);
    byType.set(s.session_type, list);
  }
  const deltas = new Map<string, number | null>();
  for (const list of byType.values()) {
    const asc = [...list].sort(chronological);
    for (let i = 0; i < asc.length; i++) {
      const current = sessionVolume(asc[i]);
      const previous = i > 0 ? sessionVolume(asc[i - 1]) : 0;
      deltas.set(
        asc[i].id,
        i > 0 && previous > 0 && current > 0
          ? Math.round(((current - previous) / previous) * 100)
          : null,
      );
    }
  }
  return deltas;
};

export interface WeeklyAggregate {
  /** Segunda-feira da semana (date-only local). */
  weekStart: Date;
  sessionCount: number;
  /** Volume conhecido da semana — 0 é ZERO real (nenhuma sessão), não dado ausente. */
  totalVolumeKg: number;
}

export const mondayOf = (d: Date): Date => {
  const dayOfWeek = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek);
};

/** Últimas `weeks` semanas civis (asc), sessões futuras excluídas. */
export const weeklyAggregates = (
  sessions: SessionLike[],
  weeks: number,
  now: Date = new Date(),
): WeeklyAggregate[] => {
  const currentMonday = mondayOf(now);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const out: WeeklyAggregate[] = [];
  for (let weeksBack = weeks - 1; weeksBack >= 0; weeksBack--) {
    const start = new Date(currentMonday);
    start.setDate(start.getDate() - weeksBack * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const weekSessions = sessions.filter((s) => {
      const d = parseLocalDate(s.date);
      return d >= start && d < end && d < endOfToday;
    });
    out.push({
      weekStart: start,
      sessionCount: weekSessions.length,
      totalVolumeKg: Math.round(weekSessions.reduce((sum, s) => sum + sessionVolume(s), 0)),
    });
  }
  return out;
};
