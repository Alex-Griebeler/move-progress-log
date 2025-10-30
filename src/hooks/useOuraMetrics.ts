import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OuraMetrics {
  id: string;
  student_id: string;
  date: string;
  readiness_score: number | null;
  sleep_score: number | null;
  hrv_balance: number | null;
  resting_heart_rate: number | null;
  temperature_deviation: number | null;
  activity_balance: number | null;
  created_at: string;
}

export const useOuraMetrics = (studentId: string, limit?: number) => {
  return useQuery({
    queryKey: ["oura-metrics", studentId, limit],
    enabled: !!studentId,
    queryFn: async () => {
      let query = supabase
        .from("oura_metrics")
        .select("*")
        .eq("student_id", studentId)
        .order("date", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OuraMetrics[];
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
        .select("*")
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
      toast.success("Métricas do Oura Ring adicionadas");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar métricas: ${error.message}`);
    },
  });
};
