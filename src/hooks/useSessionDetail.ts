import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

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

const SESSION_COLUMNS = `
  id,
  student_id,
  date,
  time,
  session_type,
  workout_name,
  trainer_name,
  room_name,
  is_finalized,
  can_reopen,
  prescription_id
`;

const EXERCISE_COLUMNS = `
  id,
  exercise_name,
  sets,
  reps,
  load_kg,
  load_description,
  load_breakdown,
  observations,
  is_best_set,
  created_at
`;

export const useSessionDetail = (sessionId: string | null) => {
  return useQuery({
    queryKey: ["session-detail", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      if (!sessionId) return null;

      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from("workout_sessions")
          .select(SESSION_COLUMNS)
          .eq("id", sessionId)
          .single();

        if (sessionError) {
          logger.error("Erro ao buscar sessão", sessionError);
          throw sessionError;
        }
        if (!sessionData) {
          logger.error("Sessão não encontrada", { sessionId });
          throw new Error("Sessão não encontrada");
        }

        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id, name, avatar_url, birth_date")
          .eq("id", sessionData.student_id)
          .single();

        if (studentError) {
          logger.error("Erro ao buscar aluno da sessão", studentError);
          throw studentError;
        }
        if (!studentData) {
          logger.error("Aluno não encontrado para sessão", { sessionId, studentId: sessionData.student_id });
          throw new Error("Aluno não encontrado");
        }

        const { data: exercisesData, error: exercisesError } = await supabase
          .from("exercises")
          .select(EXERCISE_COLUMNS)
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (exercisesError) {
          logger.error("Erro ao buscar exercícios da sessão", exercisesError);
          throw exercisesError;
        }

        return {
          ...sessionData,
          student: studentData,
          exercises: exercisesData || [],
        } as SessionDetail;
      } catch (e) {
        logger.error("Erro inesperado no carregamento de detalhes da sessão", e);
        throw e;
      }
    },
  });
};
