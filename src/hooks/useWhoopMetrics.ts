import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { spCutoff, spToday } from "@/hooks/useOuraMetrics";

export interface WhoopMetrics {
  id: string;
  student_id: string;
  date: string;
  cycle_id: number | null;
  recovery_score: number | null;
  hrv_rmssd: number | null;
  resting_heart_rate: number | null;
  spo2: number | null;
  skin_temp: number | null;
  day_strain: number | null;
  kilojoules: number | null;
  sleep_performance: number | null;
  sleep_efficiency: number | null;
  respiratory_rate: number | null;
  total_sleep_duration: number | null;
  deep_sleep_duration: number | null;
  rem_sleep_duration: number | null;
  light_sleep_duration: number | null;
  awake_time: number | null;
  disturbance_count: number | null;
  score_state: string | null;
  created_at: string;
}

const WHOOP_METRICS_SELECT =
  "id, student_id, date, cycle_id, recovery_score, hrv_rmssd, resting_heart_rate, spo2, skin_temp, " +
  "day_strain, kilojoules, sleep_performance, sleep_efficiency, respiratory_rate, total_sleep_duration, " +
  "deep_sleep_duration, rem_sleep_duration, light_sleep_duration, awake_time, disturbance_count, score_state, created_at";

export interface WhoopMetricsWindow {
  /** Janela de CALENDÁRIO: hoje (America/Sao_Paulo) + (days−1) dias anteriores. */
  days: 7 | 30 | 90;
}

// 2ª forma (redesign PR-5b, mesmo contrato do Oura): {days} = janela de
// calendário via .gte/.lte; key distinta inclui o dia corrente (SP) pra
// virada de meia-noite. Leitura pura (invariante RLS de wearables).
export const useWhoopMetrics = (
  studentId: string,
  limitOrWindow?: number | WhoopMetricsWindow,
) => {
  const limit = typeof limitOrWindow === "number" ? limitOrWindow : undefined;
  const days =
    typeof limitOrWindow === "object" && limitOrWindow !== null
      ? limitOrWindow.days
      : undefined;

  return useQuery({
    // R8-6 (ratificado): a página NÃO agenda reavaliação automática na
    // meia-noite. A janela muda no próximo render que recomputar a query
    // key, refetch ou reload; até então, a tela pode manter o snapshot do
    // dia anterior, sujeito às regras de badge/staleness. Dívida futura:
    // timer de invalidação.
    queryKey: days
      ? ["whoop-metrics", studentId, "days", days, spToday()]
      : ["whoop-metrics", studentId, limit],
    enabled: !!studentId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let query = supabase
        .from("whoop_metrics")
        .select(WHOOP_METRICS_SELECT)
        .eq("student_id", studentId)
        .order("date", { ascending: false });

      if (days) {
        query = query.gte("date", spCutoff(days)).lte("date", spToday()).limit(days);
      } else {
        query = query.limit(limit ?? 365);
      }

      const { data, error } = await query;

      if (error) throw error;
      return ((data || []) as unknown) as WhoopMetrics[];
    },
  });
};
