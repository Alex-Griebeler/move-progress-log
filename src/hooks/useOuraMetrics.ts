import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";

export interface OuraMetrics {
  id: string;
  student_id: string;
  date: string;
  
  // Existing metrics
  readiness_score: number | null;
  sleep_score: number | null;
  hrv_balance: number | null;
  resting_heart_rate: number | null;
  temperature_deviation: number | null;
  activity_balance: number | null;
  
  // Activity metrics
  activity_score: number | null;
  steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  met_minutes: number | null;
  high_activity_time: number | null;
  medium_activity_time: number | null;
  low_activity_time: number | null;
  sedentary_time: number | null;
  training_volume: number | null;
  training_frequency: number | null;
  
  // Sleep detailed metrics
  total_sleep_duration: number | null;
  deep_sleep_duration: number | null;
  rem_sleep_duration: number | null;
  light_sleep_duration: number | null;
  awake_time: number | null;
  sleep_efficiency: number | null;
  sleep_latency: number | null;
  lowest_heart_rate: number | null;
  average_sleep_hrv: number | null;
  average_breath: number | null;
  
  // Stress metrics
  stress_high_time: number | null;
  recovery_high_time: number | null;
  day_summary: string | null;
  
  // SpO2 metrics
  spo2_average: number | null;
  breathing_disturbance_index: number | null;
  
  // VO2 Max
  vo2_max: number | null;
  
  // Resilience
  resilience_level: string | null;
  
  created_at: string;
}

const OURA_METRICS_COLUMNS = `
  id,
  student_id,
  date,
  readiness_score,
  sleep_score,
  hrv_balance,
  resting_heart_rate,
  temperature_deviation,
  activity_balance,
  activity_score,
  steps,
  active_calories,
  total_calories,
  met_minutes,
  high_activity_time,
  medium_activity_time,
  low_activity_time,
  sedentary_time,
  training_volume,
  training_frequency,
  total_sleep_duration,
  deep_sleep_duration,
  rem_sleep_duration,
  light_sleep_duration,
  awake_time,
  sleep_efficiency,
  sleep_latency,
  lowest_heart_rate,
  average_sleep_hrv,
  average_breath,
  stress_high_time,
  recovery_high_time,
  day_summary,
  spo2_average,
  breathing_disturbance_index,
  vo2_max,
  resilience_level,
  created_at
`;

// AUD-F03: Histórico com paginação e deduplicação
export const useOuraMetrics = (studentId: string, limit?: number) => {
  return useQuery({
    queryKey: ["oura-metrics", studentId, limit],
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Manter em cache por 10 minutos
    queryFn: async () => {
      let query = supabase
        .from("oura_metrics")
        .select(OURA_METRICS_COLUMNS)
        .eq("student_id", studentId)
        .order("date", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      } else {
        query = query.limit(365);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // AUD-F03: Deduplicar registros por data (pega o mais recente de cada dia)
      const deduplicatedData = data.reduce((acc: OuraMetrics[], current: OuraMetrics) => {
        const existingIndex = acc.findIndex(item => item.date === current.date);
        if (existingIndex === -1) {
          acc.push(current);
        } else {
          // Mantém o registro mais recente (created_at maior)
          if (new Date(current.created_at) > new Date(acc[existingIndex].created_at)) {
            acc[existingIndex] = current;
          }
        }
        return acc;
      }, []);
      
      return deduplicatedData;
    },
  });
};

export const useLatestOuraMetrics = (studentId: string) => {
  return useQuery({
    queryKey: ["oura-metrics-latest", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oura_metrics")
        .select(OURA_METRICS_COLUMNS)
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as OuraMetrics | null;
    },
  });
};

export const useAddOuraMetrics = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metrics: Omit<OuraMetrics, "id" | "created_at">) => {
      const { error } = await supabase
        .from("oura_metrics")
        .insert(metrics);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["oura-metrics", variables.student_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["oura-metrics-latest", variables.student_id] 
      });
      notify.success(i18n.modules.oura.metricsAdded);
    },
    onError: (error: Error) => {
      notify.error(i18n.modules.oura.errorAddMetrics, {
        description: error.message
      });
    },
  });
};
