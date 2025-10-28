import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface WorkoutSession {
  id: string;
  student_id: string;
  date: string;
  time: string;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  session_id: string;
  exercise_name: string;
  sets?: number;
  reps?: number;
  load_kg?: number;
  load_description?: string;
  load_breakdown?: string;
  observations?: string;
  created_at: string;
}

export const useWorkoutSessions = (studentId?: string) => {
  return useQuery({
    queryKey: ["workout-sessions", studentId],
    queryFn: async () => {
      let query = supabase
        .from("workout_sessions")
        .select("*")
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      if (studentId) {
        query = query.eq("student_id", studentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WorkoutSession[];
    },
  });
};

export const useSessionExercises = (sessionId: string | null) => {
  return useQuery({
    queryKey: ["session-exercises", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at");

      if (error) throw error;
      return data as Exercise[];
    },
  });
};

export const useCreateWorkoutSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      student_id: string;
      date: string;
      time: string;
      exercises: Array<{
        exercise_name: string;
        sets?: number;
        reps?: number;
        load_kg?: number;
        load_description?: string;
        load_breakdown?: string;
        observations?: string;
      }>;
    }) => {
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          student_id: data.student_id,
          date: data.date,
          time: data.time,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      if (data.exercises.length > 0) {
        const exercisesToInsert = data.exercises.map((ex) => ({
          session_id: session.id,
          exercise_name: ex.exercise_name,
          sets: ex.sets || null,
          reps: ex.reps || null,
          load_kg: ex.load_kg || null,
          load_description: ex.load_description || null,
          load_breakdown: ex.load_breakdown || null,
          observations: ex.observations || null,
        }));

        const { error: exercisesError } = await supabase
          .from("exercises")
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      toast({
        title: "Sessão registrada",
        description: "A sessão de treino foi registrada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar sessão",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
