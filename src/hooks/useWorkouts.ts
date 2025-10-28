import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  load_description: string;
  load_kg: number | null;
  reps: number | null;
  observations: string | null;
  created_at: string;
}

export interface WorkoutWithDetails extends WorkoutSession {
  student_name: string;
  total_exercises: number;
  total_volume: number;
}

export const useWorkouts = () => {
  return useQuery({
    queryKey: ["workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          *,
          students!inner(name),
          exercises(id, load_kg)
        `)
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return data.map((workout: any) => ({
        id: workout.id,
        student_id: workout.student_id,
        date: workout.date,
        time: workout.time,
        student_name: workout.students.name,
        total_exercises: workout.exercises.length,
        total_volume: workout.exercises.reduce((sum: number, ex: any) => sum + (ex.load_kg || 0), 0),
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
        .insert({ student_id: studentId, date, time })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
};

// Função para calcular carga total em kg
function calculateLoadKg(loadDescription: string): number | null {
  try {
    // Remove espaços extras
    let text = loadDescription.trim();
    
    // Padrão: "(10kg + 10kg) + barra 15kg"
    // Extrair todos os números seguidos de kg ou lb
    const kgPattern = /(\d+(?:\.\d+)?)\s*kg/gi;
    const lbPattern = /(\d+(?:\.\d+)?)\s*lbs?/gi;
    
    let total = 0;
    
    // Somar todos os kg
    let match;
    while ((match = kgPattern.exec(text)) !== null) {
      total += parseFloat(match[1]);
    }
    
    // Converter e somar todos os lb (1 lb = 0.45 kg)
    while ((match = lbPattern.exec(text)) !== null) {
      total += parseFloat(match[1]) * 0.45;
    }
    
    return total > 0 ? Math.round(total * 10) / 10 : null;
  } catch (error) {
    console.error("Erro ao calcular carga:", error);
    return null;
  }
}
