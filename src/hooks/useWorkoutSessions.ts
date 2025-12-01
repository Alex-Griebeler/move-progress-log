import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";

// Chaves i18n disponíveis para workouts
const workoutKeys = i18n.modules.workouts;

export interface WorkoutSession {
  id: string;
  student_id: string;
  date: string;
  time: string;
  session_type: 'individual' | 'group';
  workout_name?: string;
  room_name?: string;
  trainer_name?: string;
  is_finalized?: boolean;
  can_reopen?: boolean;
  prescription_id?: string;
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
          session_type: 'individual',
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
      notify.success(workoutKeys.sessionCreated, {
        description: workoutKeys.sessionSaved,
      });
    },
    onError: (error) => {
      notify.error(workoutKeys.errorSession, {
        description: error.message,
      });
    },
  });
};

export const useCreateGroupWorkoutSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      prescriptionId: string;
      date: string;
      time: string;
      sessions: Array<{
        student_id: string;
        student_name: string;
        exercises: Array<{
          prescribed_exercise_name?: string | null;
          executed_exercise_name: string;
          sets?: number | null;
          prescribed_sets?: number;
          reps: number;
          load_kg?: number | null;
          load_breakdown: string;
          observations?: string | null;
          is_best_set: boolean;
        }>;
      }>;
    }) => {
      console.log("Creating group workout sessions:", data);
      
      const results = [];
      
      for (const session of data.sessions) {
        try {
          const { data: workoutSession, error: sessionError } = await supabase
            .from("workout_sessions")
            .insert({
              student_id: session.student_id,
              prescription_id: data.prescriptionId,
              date: data.date,
              time: data.time,
              session_type: 'group',
            })
            .select()
            .single();

          if (sessionError) {
            console.error(`Error creating session for ${session.student_name}:`, sessionError);
            throw sessionError;
          }

          console.log(`Session created for ${session.student_name}:`, workoutSession.id);

          const exercisesToInsert = session.exercises.map((ex) => {
            const finalSets = ex.sets !== null && ex.sets !== undefined 
              ? ex.sets 
              : ex.prescribed_sets;
            
            let finalObservations = ex.observations || "";
            
            if (ex.prescribed_exercise_name && 
                ex.prescribed_exercise_name !== ex.executed_exercise_name) {
              const adaptationNote = `Adaptação: ${ex.executed_exercise_name} substituindo ${ex.prescribed_exercise_name}`;
              finalObservations = finalObservations 
                ? `${adaptationNote}. ${finalObservations}`
                : adaptationNote;
            }
            
            return {
              session_id: workoutSession.id,
              exercise_name: ex.executed_exercise_name,
              sets: finalSets,
              reps: ex.reps,
              load_kg: ex.load_kg,
              load_breakdown: ex.load_breakdown,
              observations: finalObservations || null,
            };
          });

          console.log(`Inserting ${exercisesToInsert.length} exercises for ${session.student_name}`);

          const { error: exercisesError } = await supabase
            .from("exercises")
            .insert(exercisesToInsert);

          if (exercisesError) {
            console.error(`Error creating exercises for ${session.student_name}:`, exercisesError);
            throw exercisesError;
          }
          
          results.push({ 
            student: session.student_name, 
            success: true,
            session_id: workoutSession.id 
          });
          
        } catch (error) {
          console.error(`Failed to create session for ${session.student_name}:`, error);
          results.push({ 
            student: session.student_name, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      if (successCount === 0) {
        throw new Error("Nenhuma sessão foi criada com sucesso");
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessions-with-exercises"] });
      
      const successResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);
      
      if (successResults.length > 0) {
        notify.success(`${successResults.length} ${workoutKeys.groupSessionsCreated}`, {
          description: `${workoutKeys.savedFor}: ${successResults.map(r => r.student).join(", ")}`,
        });
      }
      
      if (failedResults.length > 0) {
        notify.error(`${failedResults.length} ${workoutKeys.recordingsFailed}`, {
          description: `${workoutKeys.errorFor}: ${failedResults.map(r => r.student).join(", ")}`,
        });
      }
    },
    onError: (error) => {
      console.error("Error in useCreateGroupWorkoutSessions:", error);
      notify.error(workoutKeys.errorGroupSessions, {
        description: error instanceof Error ? error.message : i18n.errors.unknown,
      });
    },
  });
};

export const useReopenWorkoutSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .update({ 
          is_finalized: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar TODAS as queries relacionadas a sessões
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessions-with-exercises"] });
      queryClient.invalidateQueries({ queryKey: ["session-detail"] });
      queryClient.invalidateQueries({ queryKey: ["all-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session-exercises"] });
      
      notify.success("Sessão reaberta com sucesso", {
        description: "Você pode continuar editando esta sessão",
      });
    },
    onError: (error) => {
      notify.error("Erro ao reabrir sessão", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    },
  });
};

export const useFinalizeWorkoutSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .update({ 
          is_finalized: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessions-with-exercises"] });
      queryClient.invalidateQueries({ queryKey: ["session-detail"] });
      queryClient.invalidateQueries({ queryKey: ["all-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session-exercises"] });
      
      notify.success("Sessão finalizada", {
        description: "A sessão foi salva e finalizada com sucesso",
      });
    },
    onError: (error) => {
      notify.error("Erro ao finalizar sessão", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    },
  });
};
