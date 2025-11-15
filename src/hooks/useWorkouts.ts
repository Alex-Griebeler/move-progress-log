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
        load_kg: calculateLoadKg(ex.load),
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
      console.error("Error creating workout:", error);
      notify.error(workoutKeys.errorCreate, {
        description: error.message,
      });
    },
  });
};

// Função para calcular carga total em kg (SINCRONIZADA com edge function)
function calculateLoadKg(loadDescription: string): number | null {
  if (!loadDescription) return null;
  
  try {
    // 1. DETECTAR PESO CORPORAL COM VALOR
    const bodyCorporalWithValue = loadDescription.match(/Peso corporal\s*=\s*(\d+(?:\.\d+)?)\s*kg/i);
    if (bodyCorporalWithValue) {
      return Math.round(parseFloat(bodyCorporalWithValue[1]) * 10) / 10;
    }
    
    // 2. DETECTAR PESO CORPORAL SEM VALOR
    if (/Peso corporal/i.test(loadDescription) && !/\d/.test(loadDescription)) {
      return null;
    }
    
    // 3. DETECTAR ELÁSTICOS/BANDAS (ignorar se for única carga)
    const hasOnlyElastic = /^(elástico|banda|elastic)/i.test(loadDescription.trim()) && !/\d+\s*(kg|lb)/i.test(loadDescription);
    if (hasOnlyElastic) {
      return null;
    }
    
    let total = 0;
    let processedEachSide = false;
    
    // 4. DETECTAR "DE CADA LADO" (multiplicar por 2)
    const eachSideMatch = loadDescription.match(/\((.*?)\)\s*de cada lado/i);
    if (eachSideMatch) {
      const content = eachSideMatch[1];
      processedEachSide = true;
      
      const kgMatches = Array.from(content.matchAll(/(\d+(?:[.,]\d+)?)\s*kg/gi));
      for (const m of kgMatches) {
        total += parseFloat(m[1].replace(',', '.')) * 2;
      }
      
      const lbMatches = Array.from(content.matchAll(/(\d+(?:[.,]\d+)?)\s*lb/gi));
      for (const m of lbMatches) {
        total += parseFloat(m[1].replace(',', '.')) * 0.45 * 2;
      }
    }
    
    // 5. DETECTAR KETTLEBELLS/HALTERES DUPLOS
    const multiKbMatch = loadDescription.match(/(2\s*kettlebells?|duplo\s*kettlebell|kettlebell\s*duplo|dois\s*halteres|2\s*halteres).*?(\d+(?:[.,]\d+)?)\s*(kg|lb)/i);
    if (multiKbMatch && !processedEachSide) {
      const value = parseFloat(multiKbMatch[2].replace(',', '.'));
      const unit = multiKbMatch[3].toLowerCase();
      total += (unit === 'lb' ? value * 0.45 : value) * 2;
    }
    
    // 6. EXTRAIR PESO DA BARRA
    const barraMatch = loadDescription.match(/barra\s*(\d+(?:[.,]\d+)?)\s*kg/i);
    if (barraMatch) {
      total += parseFloat(barraMatch[1].replace(',', '.'));
    }
    
    // 7. PESOS NORMAIS
    if (!processedEachSide && !multiKbMatch) {
      const kgMatches = Array.from(loadDescription.matchAll(/(\d+(?:[.,]\d+)?)\s*kg/gi));
      for (const m of kgMatches) {
        const matchText = loadDescription.substring(Math.max(0, (m.index || 0) - 6), (m.index || 0) + m[0].length);
        if (!/barra/i.test(matchText)) {
          total += parseFloat(m[1].replace(',', '.'));
        }
      }
      
      const lbMatches = Array.from(loadDescription.matchAll(/(\d+(?:[.,]\d+)?)\s*lb/gi));
      for (const m of lbMatches) {
        total += parseFloat(m[1].replace(',', '.')) * 0.45;
      }
    }
    
    return total > 0 ? Math.round(total * 10) / 10 : null;
  } catch (error) {
    console.error("Erro ao calcular carga:", error);
    return null;
  }
}
