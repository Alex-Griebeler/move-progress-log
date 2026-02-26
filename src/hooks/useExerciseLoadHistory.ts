import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExerciseLoadHistoryItem {
  studentId: string;
  studentName: string;
  lastLoadKg: number | null;
  lastLoadDescription: string | null;
  lastDate: string | null;
  lastObservations: string | null;
}

export const useExerciseLoadHistory = (
  exerciseName: string,
  prescriptionId: string,
  enabled: boolean
) => {
  return useQuery({
    queryKey: ["exercise-load-history", exerciseName, prescriptionId],
    enabled: enabled && !!exerciseName && !!prescriptionId,
    queryFn: async (): Promise<ExerciseLoadHistoryItem[]> => {
      // 1. Get assigned students via prescription_assignments + students
      const { data: assignments, error: assignError } = await supabase
        .from("prescription_assignments")
        .select("student_id, students(id, name)")
        .eq("prescription_id", prescriptionId);

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) return [];

      const studentIds = [...new Set(assignments.map((a) => a.student_id))];
      const studentMap = new Map(
        assignments.map((a) => [
          a.student_id,
          (a.students as any)?.name || "—",
        ])
      );

      // 2. Get ALL sessions for these students (global history)
      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("id, student_id, date, time")
        .in("student_id", studentIds)
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) {
        return studentIds.map((id) => ({
          studentId: id,
          studentName: studentMap.get(id) || "—",
          lastLoadKg: null,
          lastLoadDescription: null,
          lastDate: null,
          lastObservations: null,
        }));
      }

      const sessionIds = sessions.map((s) => s.id);

      // 3. Get exercises matching the name from these sessions
      const { data: exercises, error: exercisesError } = await supabase
        .from("exercises")
        .select("session_id, load_kg, load_description, observations")
        .in("session_id", sessionIds)
        .ilike("exercise_name", exerciseName);

      if (exercisesError) throw exercisesError;

      // 4. For each student, find the most recent exercise
      const results: ExerciseLoadHistoryItem[] = [];
      for (const studentId of studentIds) {
        const studentSessionIds = sessions
          .filter((s) => s.student_id === studentId)
          .map((s) => s.id);

        const studentExercise = exercises?.find((e) =>
          studentSessionIds.includes(e.session_id)
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
          lastObservations: studentExercise?.observations ?? null,
        });
      }

      return results;
    },
    staleTime: 5 * 60 * 1000,
  });
};
