import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OuraBaseline {
  avgHRV: number;
  avgRHR: number;
  avgSleepScore: number;
  dataPoints: number;
  hasMinimumData: boolean;
}

const DEFAULT_BASELINE: OuraBaseline = {
  avgHRV: 65,
  avgRHR: 60,
  avgSleepScore: 75,
  dataPoints: 0,
  hasMinimumData: false,
};

const parseBaselineNumber = (value: unknown, fallback: number): number => {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Hook que retorna o baseline dinâmico de métricas Oura para um aluno.
 * Usa a função SQL `calc_oura_baseline` que calcula médias dos últimos N dias.
 * Fallback para defaults quando não há dados suficientes (< 7 dias).
 */
export const useOuraBaseline = (studentId: string, days: number = 14) => {
  const query = useQuery({
    queryKey: ["oura-baseline", studentId, days],
    enabled: !!studentId,
    staleTime: 24 * 60 * 60 * 1000, // 24h
    gcTime: 48 * 60 * 60 * 1000, // 48h
    queryFn: async (): Promise<OuraBaseline> => {
      const { data, error } = await supabase.rpc("calc_oura_baseline", {
        p_student_id: studentId,
        p_days: days,
      });

      if (error) throw error;

      const row = data?.[0];
      if (!row || row.data_points < 7) {
        return {
          ...DEFAULT_BASELINE,
          dataPoints: row?.data_points ?? 0,
        };
      }

      return {
        avgHRV: parseBaselineNumber(row.avg_hrv, DEFAULT_BASELINE.avgHRV),
        avgRHR: parseBaselineNumber(row.avg_rhr, DEFAULT_BASELINE.avgRHR),
        avgSleepScore: parseBaselineNumber(row.avg_sleep_score, DEFAULT_BASELINE.avgSleepScore),
        dataPoints: row.data_points,
        hasMinimumData: true,
      };
    },
  });

  return {
    ...query,
    baseline: query.data ?? DEFAULT_BASELINE,
  };
};
