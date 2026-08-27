import { normalizeExerciseSessionName } from "@/utils/exerciseSessionKeys";
import { parseLocalDate } from "@/utils/relativeDate";

/**
 * Contagem ÚNICA de exercícios distintos a partir de sessões — util
 * compartilhada entre Visão geral e aba Exercícios. A auditoria achou duas
 * implementações divergentes (nome cru vs normalizado+library_id); esta é a
 * canônica: identidade = exercise_library_id quando houver, senão nome
 * normalizado.
 */

interface SessionLike {
  date: string;
  exercises?: Array<{
    exercise_name: string;
    exercise_library_id?: string | null;
  }> | null;
}

export const countUniqueExercises = (
  sessions: SessionLike[] | null | undefined,
  opts: { days?: number; now?: Date } = {},
): number => {
  if (!sessions) return 0;
  const now = opts.now ?? new Date();
  const cutoff = opts.days
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - (opts.days - 1)).getTime()
    : null;

  // Duas passadas (mesma consolidação da aba Exercícios): linha legada SEM
  // library_id não pode contar separado de outra COM id e mesmo nome.
  const nameToId = new Map<string, string>();
  for (const session of sessions) {
    for (const ex of session.exercises ?? []) {
      if (ex.exercise_library_id) {
        const norm = normalizeExerciseSessionName(ex.exercise_name);
        if (!nameToId.has(norm)) nameToId.set(norm, ex.exercise_library_id);
      }
    }
  }

  const keys = new Set<string>();
  for (const session of sessions) {
    if (cutoff !== null && parseLocalDate(session.date).getTime() < cutoff) continue;
    for (const ex of session.exercises ?? []) {
      const norm = normalizeExerciseSessionName(ex.exercise_name);
      keys.add(ex.exercise_library_id ?? nameToId.get(norm) ?? norm);
    }
  }
  return keys.size;
};
