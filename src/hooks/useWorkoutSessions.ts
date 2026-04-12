import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { buildErrorDescription } from "@/utils/errorParsing";

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

type WorkoutSessionRow = Database["public"]["Tables"]["workout_sessions"]["Row"];
type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
type GroupSessionCreationResult = {
  student: string;
  success: boolean;
  session_id?: string;
  error?: string;
};

const mapWorkoutSession = (row: WorkoutSessionRow): WorkoutSession => ({
  id: row.id,
  student_id: row.student_id,
  date: row.date,
  time: row.time,
  session_type: row.session_type === "group" ? "group" : "individual",
  workout_name: row.workout_name ?? undefined,
  room_name: row.room_name ?? undefined,
  trainer_name: row.trainer_name ?? undefined,
  is_finalized: row.is_finalized ?? undefined,
  can_reopen: row.can_reopen ?? undefined,
  prescription_id: row.prescription_id ?? undefined,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const mapExercise = (row: ExerciseRow): Exercise => ({
  id: row.id,
  session_id: row.session_id,
  exercise_name: row.exercise_name,
  sets: row.sets ?? undefined,
  reps: row.reps ?? undefined,
  load_kg: row.load_kg ?? undefined,
  load_description: row.load_description ?? undefined,
  load_breakdown: row.load_breakdown ?? undefined,
  observations: row.observations ?? undefined,
  created_at: row.created_at,
});

export const useWorkoutSessions = (studentId?: string) => {
  return useQuery({
    queryKey: ["workout-sessions", studentId],
    queryFn: async () => {
      let query = supabase
        .from("workout_sessions")
        .select("*")
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .limit(500);

      if (studentId) {
        query = query.eq("student_id", studentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(mapWorkoutSession);
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
      return (data || []).map(mapExercise);
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
      silent?: boolean;
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
      const exercisesPayload = data.exercises.map((ex) => ({
        exercise_name: ex.exercise_name,
        sets: ex.sets ?? null,
        reps: ex.reps ?? null,
        load_kg: ex.load_kg ?? null,
        load_description: ex.load_description ?? null,
        load_breakdown: ex.load_breakdown ?? null,
        observations: ex.observations ?? null,
      }));

      const { data: createdSession, error } = await supabase.rpc(
        "create_workout_session_with_exercises",
        {
          p_student_id: data.student_id,
          p_date: data.date,
          p_time: data.time,
          p_session_type: "individual",
          p_exercises: exercisesPayload,
        }
      );

      if (error) throw error;

      const sessionRow = Array.isArray(createdSession)
        ? createdSession[0]
        : createdSession;
      if (!sessionRow) {
        throw new Error("Falha ao criar sessão");
      }

      return mapWorkoutSession(sessionRow as WorkoutSessionRow);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });

      if (!variables.silent) {
        notify.success(workoutKeys.sessionCreated, {
          description: workoutKeys.sessionSaved,
        });
      }
    },
    onError: (error: unknown, variables) => {
      if (!variables?.silent) {
        notify.error(workoutKeys.errorSession, {
          description: buildErrorDescription(error) || i18n.errors.unknown,
        });
      }
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
      const results: GroupSessionCreationResult[] = [];
      
      for (const session of data.sessions) {
        try {
          const exercisesPayload = session.exercises.map((ex) => {
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
              exercise_name: ex.executed_exercise_name,
              sets: finalSets,
              reps: ex.reps,
              load_kg: ex.load_kg,
              load_breakdown: ex.load_breakdown,
              observations: finalObservations || null,
            };
          });

          const { data: createdSession, error: creationError } = await supabase.rpc(
            "create_group_workout_session_with_exercises",
            {
              p_student_id: session.student_id,
              p_prescription_id: data.prescriptionId,
              p_date: data.date,
              p_time: data.time,
              p_exercises: exercisesPayload,
            }
          );

          if (creationError) {
            throw creationError;
          }

          const sessionRow = Array.isArray(createdSession)
            ? createdSession[0]
            : createdSession;

          if (!sessionRow) {
            throw new Error("Falha ao criar sessão de grupo");
          }
          
          results.push({ 
            student: session.student_name, 
            success: true,
            session_id: sessionRow.id,
          });
          
        } catch (error) {
          const description = buildErrorDescription(error);
          results.push({ 
            student: session.student_name, 
            success: false, 
            error: description || 'Unknown error'
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
      notify.error(workoutKeys.errorGroupSessions, {
        description: buildErrorDescription(error) || i18n.errors.unknown,
      });
    },
  });
};

export const useReopenWorkoutSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      // INC-004: removed manual updated_at — handled by DB trigger
      const { data, error } = await supabase
        .from("workout_sessions")
        .update({ 
          is_finalized: false,
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
        description: buildErrorDescription(error) || "Erro desconhecido",
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
        description: buildErrorDescription(error) || "Erro desconhecido",
      });
    },
  });
};
