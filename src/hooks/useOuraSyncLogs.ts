import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OuraSyncLog {
  id: string;
  student_id: string;
  sync_date: string;
  sync_time: string;
  status: 'success' | 'failed' | 'retrying';
  attempt_number: number;
  error_message?: string;
  metrics_synced?: Record<string, unknown>;
  created_at: string;
}

export const useOuraSyncLogs = (studentId?: string, limit: number = 10) => {
  return useQuery({
    queryKey: ["oura-sync-logs", studentId, limit],
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let query = supabase
        .from("oura_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (studentId) {
        query = query.eq("student_id", studentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OuraSyncLog[];
    },
  });
};
