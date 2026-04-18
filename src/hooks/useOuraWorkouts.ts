import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OuraWorkout {
  id: string;
  student_id: string;
  oura_workout_id: string;
  activity: string;
  start_datetime: string;
  end_datetime: string;
  calories: number | null;
  distance: number | null;
  intensity: string | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  source: string | null;
  created_at: string;
}

export const useOuraWorkouts = (studentId: string, limit?: number) => {
  return useQuery({
    queryKey: ["oura-workouts", studentId, limit],
    enabled: !!studentId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let query = supabase
        .from("oura_workouts")
        .select("*")
        .eq("student_id", studentId)
        .order("start_datetime", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OuraWorkout[];
    },
  });
};
