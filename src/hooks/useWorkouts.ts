import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { calculateLoadFromBreakdown } from "@/utils/loadCalculation";

// Chaves i18n disponíveis para workouts
const workoutKeys = i18n.modules.workouts;

export interface WorkoutSession {
  id: string;
  student_id: string;
  date: string;
  time: string;
  session_type?: 'individual' | 'group';
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  session_id: string;
  exercise_name: string;
  load_description: string;
  load_kg: number | null;
  reps: number | null;
  observations: string | null;
  created_at: string;
}

export interface WorkoutWithDetails extends WorkoutSession {
  student_name: string;
  avatar_url?: string;
  total_exercises: number;
  total_volume: number;
  has_important_observations: boolean;
  is_finalized?: boolean;
  can_reopen?: boolean;
}

export const useWorkouts = () => {
  return useQuery({
    queryKey: ["workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          *,
          students!inner(name, avatar_url),
          exercises(id, load_kg)
        `)
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .limit(20);
      
      if (error) throw error;

      // Buscar observações importantes para todas as sessões
      const sessionIds = data.map(s => s.id);
      const { data: observations } = await supabase
        .from('student_observations')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('is_resolved', false)
        .in('severity', ['baixa', 'média', 'alta']);

      const sessionsWithObservations = new Set(
        observations?.map(o => o.session_id).filter(Boolean) || []
      );
      
      return data.map((workout: any) => ({
        id: workout.id,
        student_id: workout.student_id,
        date: workout.date,
        time: workout.time,
        session_type: workout.session_type,
        student_name: workout.students.name?.trim() || 'Sem nome',
        avatar_url: workout.students.avatar_url,
        total_exercises: workout.exercises.length,
        total_volume: workout.exercises.reduce((sum: number, ex: any) => sum + (ex.load_kg || 0), 0),
        has_important_observations: sessionsWithObservations.has(workout.id),
        is_finalized: workout.is_finalized,
        can_reopen: workout.can_reopen,
        created_at: workout.created_at,
        updated_at: workout.updated_at,
      })) as WorkoutWithDetails[];
    },
  });
};

export const useCreateWorkout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      studentId,
      date,
      time,
      exercises,
    }: {
      studentId: string;
      date: string;
      time: string;
      exercises: Array<{
        exercise: string;
        load: string;
        reps: number;
        observations?: string;
      }>;
    }) => {
      // Criar sessão
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({ 
          student_id: studentId, 
          date, 
          time,
          session_type: 'individual'
        })
        .select()
        .single();
      
      if (sessionError) throw sessionError;
      
      // Criar exercícios
      const exercisesToInsert = exercises.map((ex) => ({
        session_id: session.id,
        exercise_name: ex.exercise,
        load_description: ex.load,
        load_kg: calculateLoadFromBreakdown(ex.load),
        reps: ex.reps,
        observations: ex.observations || null,
      }));
      
      const { error: exercisesError } = await supabase
        .from("exercises")
        .insert(exercisesToInsert);
      
      if (exercisesError) throw exercisesError;
      
      return session;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["workout-sessions", variables.studentId] });
      
      notify.success(workoutKeys.created, {
        description: `${variables.exercises.length} ${workoutKeys.exercisesSaved}`,
      });
    },
    onError: (error: Error) => {
      
      notify.error(workoutKeys.errorCreate, {
        description: error.message,
      });
    },
  });
};
// INC-001: Removed duplicate calculateLoadKg — now using centralized calculateLoadFromBreakdown from @/utils/loadCalculation
