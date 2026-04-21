import { useQuery } from "@tanstack/react-query";
import { format, endOfWeek, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type MovementBucket = "push" | "pull" | "knee" | "hip";

interface WeeklyMovementBalance {
  periodStart: string;
  periodEnd: string;
  minSetsPerPattern: number;
  targetSessions: number;
  completedSessions: number;
  sets: Record<MovementBucket, number>;
  pullPushRatio: number | null;
  ratioTarget: number;
  unknownExercises: number;
  mappedExercises: number;
  warnings: string[];
}

const normalizeComparableText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

const mapMovementBucket = (movementPattern: string | null): MovementBucket | null => {
  if (!movementPattern) return null;
  const normalized = normalizeComparableText(movementPattern);

  if (normalized === "empurrar" || normalized.includes("push")) return "push";
  if (normalized === "puxar" || normalized.includes("pull")) return "pull";
  if (
    normalized === "dominancia joelho" ||
    normalized === "lunge" ||
    normalized.includes("knee")
  ) {
    return "knee";
  }
  if (
    normalized === "cadeia posterior" ||
    normalized.includes("hip") ||
    normalized.includes("posterior")
  ) {
    return "hip";
  }
  return null;
};

export const useWeeklyMovementBalance = (studentId: string) => {
  return useQuery({
    queryKey: ["weekly-movement-balance", studentId],
    enabled: !!studentId,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    queryFn: async (): Promise<WeeklyMovementBalance> => {
      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      const periodStart = format(start, "yyyy-MM-dd");
      const periodEnd = format(end, "yyyy-MM-dd");

      const [{ data: studentRow, error: studentError }, { data: sessions, error: sessionsError }, { data: libraryRows, error: libraryError }] =
        await Promise.all([
          supabase
            .from("students")
            .select("weekly_sessions_proposed")
            .eq("id", studentId)
            .single(),
          supabase
            .from("workout_sessions")
            .select("id, exercises(exercise_name, sets)")
            .eq("student_id", studentId)
            .gte("date", periodStart)
            .lte("date", periodEnd),
          supabase
            .from("exercises_library")
            .select("name, movement_pattern")
            .not("movement_pattern", "is", null),
        ]);

      if (studentError) throw studentError;
      if (sessionsError) throw sessionsError;
      if (libraryError) throw libraryError;

      const exercisePatternByName = new Map<string, string>();
      for (const row of libraryRows || []) {
        if (!row?.name) continue;
        const key = normalizeComparableText(row.name);
        if (!exercisePatternByName.has(key) && row.movement_pattern) {
          exercisePatternByName.set(key, row.movement_pattern);
        }
      }

      const sets: Record<MovementBucket, number> = { push: 0, pull: 0, knee: 0, hip: 0 };
      let unknownExercises = 0;
      let mappedExercises = 0;

      for (const session of sessions || []) {
        const sessionExercises = Array.isArray(session.exercises)
          ? session.exercises
          : [];
        for (const exercise of sessionExercises) {
          const exerciseName =
            typeof exercise.exercise_name === "string" ? exercise.exercise_name : "";
          if (!exerciseName) continue;

          const normalizedName = normalizeComparableText(exerciseName);
          const rawPattern = exercisePatternByName.get(normalizedName) || null;
          const bucket = mapMovementBucket(rawPattern);
          if (!bucket) {
            unknownExercises += 1;
            continue;
          }

          const rawSets = typeof exercise.sets === "number" ? exercise.sets : null;
          const setsCount = rawSets && rawSets > 0 ? rawSets : 1;
          sets[bucket] += setsCount;
          mappedExercises += 1;
        }
      }

      const completedSessions = (sessions || []).length;
      const plannedSessions =
        typeof studentRow?.weekly_sessions_proposed === "number" &&
        studentRow.weekly_sessions_proposed > 0
          ? studentRow.weekly_sessions_proposed
          : 2;
      const targetSessions = plannedSessions >= 3 ? 3 : 2;
      const minSetsPerPattern = targetSessions >= 3 ? 12 : 8;
      const pullPushRatio = sets.push > 0 ? sets.pull / sets.push : null;
      const ratioTarget = 1.25;

      const warnings: string[] = [];
      if (sets.push < minSetsPerPattern) {
        warnings.push(`Push abaixo do mínimo semanal (${sets.push}/${minSetsPerPattern})`);
      }
      if (sets.pull < minSetsPerPattern) {
        warnings.push(`Pull abaixo do mínimo semanal (${sets.pull}/${minSetsPerPattern})`);
      }
      if (sets.knee < minSetsPerPattern) {
        warnings.push(`Knee abaixo do mínimo semanal (${sets.knee}/${minSetsPerPattern})`);
      }
      if (sets.hip < minSetsPerPattern) {
        warnings.push(`Hip abaixo do mínimo semanal (${sets.hip}/${minSetsPerPattern})`);
      }
      if (pullPushRatio !== null && pullPushRatio < ratioTarget) {
        warnings.push(
          `Razão Pull/Push abaixo de 1.25x (${pullPushRatio.toFixed(2)}x)`
        );
      }

      return {
        periodStart,
        periodEnd,
        minSetsPerPattern,
        targetSessions,
        completedSessions,
        sets,
        pullPushRatio,
        ratioTarget,
        unknownExercises,
        mappedExercises,
        warnings,
      };
    },
    staleTime: 60 * 1000,
  });
};
