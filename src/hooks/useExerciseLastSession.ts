import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LastSessionData {
  load_kg: number | null;
  load_breakdown: string | null;
  reps: number | null;
  date: string | null;
  observations: string | null;
}

/**
 * Batch hook that fetches the last session data for all students × exercises
 * Returns a Map keyed by `${studentId}_${exerciseName}` (lowercased)
 */
export const useExerciseLastSession = (
  studentIds: string[],
  exerciseNames: string[],
  enabled: boolean
) => {
  return useQuery({
    queryKey: ["exercise-last-session-batch", studentIds.sort().join(","), exerciseNames.sort().join(",")],
    enabled: enabled && studentIds.length > 0 && exerciseNames.length > 0,
    queryFn: async (): Promise<Map<string, LastSessionData>> => {
      const result = new Map<string, LastSessionData>();

      // Get sessions for these students, most recent first
      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("id, student_id, date")
        .in("student_id", studentIds)
        .order("date", { ascending: false })
        .limit(500);

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return result;

      const sessionIds = sessions.map(s => s.id);

      // Chunk sessionIds to avoid URL length limits (max ~300 per query)
      const CHUNK_SIZE = 300;
      const allExercises: Array<{ session_id: string; exercise_name: string; load_kg: number | null; load_breakdown: string | null; reps: number | null }> = [];
      for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
        const chunk = sessionIds.slice(i, i + CHUNK_SIZE);
        const { data: exercises, error: exError } = await supabase
          .from("exercises")
          .select("session_id, exercise_name, load_kg, load_breakdown, reps")
          .in("session_id", chunk);
        if (exError) throw exError;
        if (exercises) allExercises.push(...exercises);
      }

      if (allExercises.length === 0) return result;

      // Build session lookup
      const sessionMap = new Map(sessions.map(s => [s.id, s]));

      // Filter and find most recent per student+exercise
      const nameSet = new Set(exerciseNames.map(n => n.toLowerCase().trim()));

      for (const ex of allExercises) {
        const exNameLower = ex.exercise_name.toLowerCase().trim();
        if (!nameSet.has(exNameLower)) continue;

        const session = sessionMap.get(ex.session_id);
        if (!session) continue;

        const key = `${session.student_id}_${exNameLower}`;
        if (!result.has(key)) {
          result.set(key, {
            load_kg: ex.load_kg ?? null,
            load_breakdown: ex.load_breakdown ?? null,
            reps: ex.reps ?? null,
            date: session.date,
          });
        }
      }

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
};
