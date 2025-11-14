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

      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          *,
          student:students(id, name, avatar_url, birth_date),
          exercises(*)
        `)
        .eq("id", sessionId)
        .single();

      if (error) throw error;
      return data as SessionDetail;
    },
  });
};
