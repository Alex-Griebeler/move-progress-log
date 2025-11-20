import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SessionExercise {
  id: string;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  load_kg: number | null;
  load_description: string | null;
  load_breakdown: string | null;
  observations: string | null;
  is_best_set: boolean | null;
  created_at: string;
}

interface Student {
  id: string;
  name: string;
  avatar_url: string | null;
  birth_date: string | null;
}

interface SessionDetail {
  id: string;
  date: string;
  time: string;
  session_type: string;
  workout_name: string | null;
  trainer_name: string | null;
  room_name: string | null;
  is_finalized: boolean | null;
  can_reopen: boolean | null;
  prescription_id: string | null;
  student: Student;
  exercises: SessionExercise[];
}

export const useSessionDetail = (sessionId: string | null) => {
  return useQuery({
    queryKey: ["session-detail", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      if (!sessionId) return null;

      const { data: sessionData, error: sessionError } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData) throw new Error("Sessão não encontrada");

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, name, avatar_url, birth_date")
        .eq("id", sessionData.student_id)
        .single();

      if (studentError) throw studentError;
      if (!studentData) throw new Error("Aluno não encontrado");

      const { data: exercisesData, error: exercisesError } = await supabase
        .from("exercises")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (exercisesError) throw exercisesError;

      return {
        ...sessionData,
        student: studentData,
        exercises: exercisesData || [],
      } as SessionDetail;
    },
  });
};
