import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExerciseLoadHistoryItem {
  studentId: string;
  studentName: string;
  lastLoadKg: number | null;
  lastLoadDescription: string | null;
  lastDate: string | null;
}

export const useExerciseLoadHistory = (
  exerciseName: string,
  studentIds: string[],
  enabled: boolean
) => {
  return useQuery({
    queryKey: ["exercise-load-history", exerciseName, studentIds],
    enabled: enabled && !!exerciseName && studentIds.length > 0,
    queryFn: async (): Promise<ExerciseLoadHistoryItem[]> => {
      // For each student, find the most recent exercise record matching the name
      const results: ExerciseLoadHistoryItem[] = [];

      // Get all sessions for these students
      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("id, student_id, date, time")
        .in("student_id", studentIds)
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return [];

      const sessionIds = sessions.map((s) => s.id);

      // Get all exercises matching the name from these sessions
      const { data: exercises, error: exercisesError } = await supabase
        .from("exercises")
        .select("session_id, load_kg, load_description")
        .in("session_id", sessionIds)
        .ilike("exercise_name", exerciseName);

      if (exercisesError) throw exercisesError;

      // Get student names
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, name")
        .in("id", studentIds);

      if (studentsError) throw studentsError;

      const studentMap = new Map(students?.map((s) => [s.id, s.name]) || []);

      // For each student, find the most recent exercise
      for (const studentId of studentIds) {
        const studentSessions = sessions
          .filter((s) => s.student_id === studentId)
          .map((s) => s.id);

        const studentExercise = exercises?.find((e) =>
          studentSessions.includes(e.session_id)
        );

        const matchingSession = studentExercise
          ? sessions.find((s) => s.id === studentExercise.session_id)
          : null;

        results.push({
          studentId,
          studentName: studentMap.get(studentId) || "—",
          lastLoadKg: studentExercise?.load_kg ?? null,
          lastLoadDescription: studentExercise?.load_description ?? null,
          lastDate: matchingSession?.date ?? null,
        });
      }

      return results;
    },
    staleTime: 5 * 60 * 1000,
  });
};
