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

interface ExerciseLookupRow {
  session_id: string;
  exercise_name: string | null;
  load_kg: number | null;
  load_description: string | null;
  observations: string | null;
  created_at: string | null;
}

const normalizeComparableText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

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
          (a.students as { name: string } | null)?.name || "—",
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
        .select("session_id, exercise_name, load_kg, load_description, observations, created_at")
        .in("session_id", sessionIds)
        .ilike("exercise_name", `%${exerciseName}%`)
        .order("created_at", { ascending: false });

      if (exercisesError) throw exercisesError;

      const targetName = normalizeComparableText(exerciseName);
      const matchesTargetExercise = (candidate: string | null): boolean => {
        if (!candidate) return false;
        const normalizedCandidate = normalizeComparableText(candidate);
        return (
          normalizedCandidate === targetName ||
          normalizedCandidate.includes(targetName) ||
          targetName.includes(normalizedCandidate)
        );
      };

      const exercisesBySessionId = new Map<string, ExerciseLookupRow[]>();
      for (const exercise of (exercises || []) as ExerciseLookupRow[]) {
        const bucket = exercisesBySessionId.get(exercise.session_id);
        if (bucket) {
          bucket.push(exercise);
        } else {
          exercisesBySessionId.set(exercise.session_id, [exercise]);
        }
      }

      // 4. For each student, find the most recent exercise
      const results: ExerciseLoadHistoryItem[] = [];
      for (const studentId of studentIds) {
        const studentSessions = sessions.filter((s) => s.student_id === studentId);
        let studentExercise: ExerciseLookupRow | null = null;
        let matchingSession: typeof studentSessions[number] | null = null;

        for (const session of studentSessions) {
          const candidates = exercisesBySessionId.get(session.id) || [];
          const matched = candidates.find((exercise) =>
            matchesTargetExercise(exercise.exercise_name)
          );
          if (matched) {
            studentExercise = matched;
            matchingSession = session;
            break;
          }
        }

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
