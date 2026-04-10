import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface OuraAcuteMetrics {
  id: string;
  student_id: string;
  date: string;
  sleep_hrv_series: Json | null;
  sleep_hr_series: Json | null;
  day_hr_series: Json | null;
  sleep_phase_5min: string | null;
  movement_30_sec: string | null;
  stress_samples: Json | null;
  hrv_night_min: number | null;
  hrv_night_max: number | null;
  hrv_night_last: number | null;
  hrv_night_stddev: number | null;
  hr_night_min: number | null;
  hr_night_max: number | null;
  hr_night_last: number | null;
  hr_day_min: number | null;
  hr_day_max: number | null;
  hr_day_avg: number | null;
  samples_count_hrv: number;
  samples_count_hr_day: number;
  created_at: string;
  updated_at: string;
}

export const useLatestOuraAcuteMetrics = (studentId: string) => {
  return useQuery({
    queryKey: ["oura-acute-metrics-latest", studentId],
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oura_acute_metrics")
        .select("*")
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Safety: while migration is rolling out, do not break dashboard rendering.
        if (error.message.toLowerCase().includes("oura_acute_metrics")) {
          return null;
        }
        throw error;
      }
      return data as OuraAcuteMetrics | null;
    },
  });
};
