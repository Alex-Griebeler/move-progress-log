import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { calculateLoadFromBreakdown } from "@/utils/loadCalculation";
import { buildErrorDescription } from "@/utils/errorParsing";
import { formatSessionTime } from "@/utils/sessionTime";

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

const PAGE_SIZE = 20;

const mapWorkouts = (data: Array<{
  id: string; student_id: string; date: string; time: string;
  session_type: string; created_at: string; updated_at: string;
  is_finalized: boolean; can_reopen: boolean;
  students: { name: string; avatar_url: string | null };
  exercises: Array<{ load_kg: number | null }>;
}>, sessionsWithObservations: Set<string>): WorkoutWithDetails[] => {
  return data.map((workout) => ({
    id: workout.id,
    student_id: workout.student_id,
    date: workout.date,
    time: formatSessionTime(workout.time),
    session_type: workout.session_type as 'individual' | 'group',
    student_name: workout.students.name?.trim() || 'Sem nome',
    avatar_url: workout.students.avatar_url,
    total_exercises: workout.exercises.length,
    total_volume: workout.exercises.reduce((sum, ex) => sum + (ex.load_kg || 0), 0),
    has_important_observations: sessionsWithObservations.has(workout.id),
    is_finalized: workout.is_finalized,
    can_reopen: workout.can_reopen,
    created_at: workout.created_at,
    updated_at: workout.updated_at,
  }));
};

// MEL-003: Cursor-based pagination
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
        .limit(PAGE_SIZE);
      
      if (error) throw error;

      const sessionIds = data.map(s => s.id);
      if (sessionIds.length === 0) return [];

      const { data: observations, error: observationsError } = await supabase
        .from('student_observations')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('is_resolved', false)
        .in('severity', ['baixa', 'média', 'alta']);

      if (observationsError) throw observationsError;

      const sessionsWithObservations = new Set(
        observations?.map(o => o.session_id).filter(Boolean) || []
      );
      
      return mapWorkouts(data, sessionsWithObservations);
    },
  });
};

export const useWorkoutsPaginated = () => {
  return useInfiniteQuery({
    queryKey: ["workouts-paginated"],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          *,
          students!inner(name, avatar_url),
          exercises(id, load_kg)
        `)
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const sessionIds = data.map(s => s.id);
      let sessionsWithObservations = new Set<string>();

      if (sessionIds.length > 0) {
        const { data: observations, error: observationsError } = await supabase
          .from('student_observations')
          .select('session_id')
          .in('session_id', sessionIds)
          .eq('is_resolved', false)
          .in('severity', ['baixa', 'média', 'alta']);

        if (observationsError) throw observationsError;

        sessionsWithObservations = new Set(
          observations?.map(o => o.session_id).filter(Boolean) || []
        );
      }

      return {
        items: mapWorkouts(data, sessionsWithObservations),
        hasMore: data.length === PAGE_SIZE,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
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
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};
// INC-001: Removed duplicate calculateLoadKg — now using centralized calculateLoadFromBreakdown from @/utils/loadCalculation
