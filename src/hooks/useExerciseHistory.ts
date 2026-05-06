import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Exercise } from "./useWorkoutSessions";
import { normalizeExerciseSessionName } from "@/utils/exerciseSessionKeys";

export interface ExerciseHistoryEntry extends Exercise {
  session_date: string;
  session_time: string;
  total_volume?: number;
}

type WorkoutSessionRow = Pick<
  Database["public"]["Tables"]["workout_sessions"]["Row"],
  "id" | "date" | "time"
>;

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
const EXERCISE_HISTORY_SELECT =
  "id, session_id, exercise_library_id, exercise_name, sets, reps, load_kg, load_description, load_breakdown, observations, is_best_set, created_at";

const mapExerciseHistoryEntry = (
  exercise: ExerciseRow,
  session: WorkoutSessionRow | undefined
): ExerciseHistoryEntry => {
  const totalVolume =
    exercise.sets && exercise.reps && exercise.load_kg
      ? exercise.sets * exercise.reps * exercise.load_kg
      : undefined;

  return {
    id: exercise.id,
    session_id: exercise.session_id,
    exercise_name: exercise.exercise_name,
    sets: exercise.sets ?? undefined,
    reps: exercise.reps ?? undefined,
    load_kg: exercise.load_kg ?? undefined,
    load_description: exercise.load_description ?? undefined,
    load_breakdown: exercise.load_breakdown ?? undefined,
    observations: exercise.observations ?? undefined,
    created_at: exercise.created_at,
    session_date: session?.date || "",
    session_time: session?.time || "",
    total_volume: totalVolume,
  };
};

export const useExerciseHistory = (
  studentId: string,
  exerciseName: string,
  exerciseLibraryId?: string | null
) => {
  return useQuery({
    queryKey: ["exercise-history", studentId, exerciseLibraryId ?? null, exerciseName],
    enabled: !!studentId && !!exerciseName,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!studentId || !exerciseName) return [];

      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("id, date, time")
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return [];

      const sessionIds = sessions.map((s) => s.id);
      const exerciseRowsById = new Map<string, ExerciseRow>();

      if (exerciseLibraryId) {
        const { data: idMatches, error: idMatchesError } = await supabase
          .from("exercises")
          .select(EXERCISE_HISTORY_SELECT)
          .in("session_id", sessionIds)
          .eq("exercise_library_id", exerciseLibraryId)
          .order("created_at", { ascending: false });

        if (idMatchesError) throw idMatchesError;
        (idMatches || []).forEach((exercise) => {
          exerciseRowsById.set(exercise.id, exercise as ExerciseRow);
        });
      }

      const { data: nameMatches, error: nameMatchesError } = await supabase
        .from("exercises")
        .select(EXERCISE_HISTORY_SELECT)
        .in("session_id", sessionIds)
        .is("exercise_library_id", null)
        .ilike("exercise_name", `%${exerciseName}%`)
        .order("created_at", { ascending: false });

      if (nameMatchesError) throw nameMatchesError;

      const targetName = normalizeExerciseSessionName(exerciseName);
      (nameMatches || [])
        .filter((exercise) => {
          const candidate = normalizeExerciseSessionName(exercise.exercise_name);
          return (
            candidate === targetName ||
            candidate.includes(targetName) ||
            targetName.includes(candidate)
          );
        })
        .forEach((exercise) => {
          exerciseRowsById.set(exercise.id, exercise as ExerciseRow);
        });

      const sessionsById = new Map<string, WorkoutSessionRow>(
        sessions.map((session) => [session.id, session])
      );

      const history: ExerciseHistoryEntry[] = Array.from(exerciseRowsById.values())
        .map((ex) => {
          const session = sessionsById.get(ex.session_id);
          return mapExerciseHistoryEntry(ex, session);
        })
        .sort((a, b) => {
          const aKey = `${a.session_date}T${a.session_time}`;
          const bKey = `${b.session_date}T${b.session_time}`;
          return bKey.localeCompare(aKey);
        });

      return history;
    },
  });
};

export const useExerciseStats = (
  studentId: string,
  exerciseName: string,
  exerciseLibraryId?: string | null
) => {
  const { data: history } = useExerciseHistory(studentId, exerciseName, exerciseLibraryId);

  if (!history || history.length === 0) {
    return {
      lastSession: null,
      maxLoad: 0,
      avgLoad: 0,
      totalVolume: 0,
      sessionsCount: 0,
    };
  }

  const maxLoad = Math.max(...history.map((h) => h.load_kg || 0));
  const loads = history.filter((h) => h.load_kg).map((h) => h.load_kg!);
  const avgLoad = loads.length > 0 ? loads.reduce((a, b) => a + b, 0) / loads.length : 0;
  const totalVolume = history.reduce((sum, h) => sum + (h.total_volume || 0), 0);

  return {
    lastSession: history[0],
    maxLoad,
    avgLoad: Math.round(avgLoad * 10) / 10,
    totalVolume: Math.round(totalVolume * 10) / 10,
    sessionsCount: history.length,
  };
};
