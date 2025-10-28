import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "./useWorkoutSessions";

export interface ExerciseHistoryEntry extends Exercise {
  session_date: string;
  session_time: string;
  total_volume?: number;
}

export const useExerciseHistory = (studentId: string, exerciseName: string) => {
  return useQuery({
    queryKey: ["exercise-history", studentId, exerciseName],
    enabled: !!studentId && !!exerciseName,
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

      const { data: exercises, error: exercisesError } = await supabase
        .from("exercises")
        .select("*")
        .in("session_id", sessionIds)
        .ilike("exercise_name", `%${exerciseName}%`)
        .order("created_at", { ascending: false });

      if (exercisesError) throw exercisesError;

      const history: ExerciseHistoryEntry[] = exercises.map((ex) => {
        const session = sessions.find((s) => s.id === ex.session_id);
        const exercise = ex as unknown as Exercise;
        const totalVolume =
          exercise.sets && exercise.reps && exercise.load_kg
            ? exercise.sets * exercise.reps * exercise.load_kg
            : undefined;

        return {
          ...exercise,
          session_date: session?.date || "",
          session_time: session?.time || "",
          total_volume: totalVolume,
        };
      });

      return history;
    },
  });
};

export const useExerciseStats = (studentId: string, exerciseName: string) => {
  const { data: history } = useExerciseHistory(studentId, exerciseName);

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
