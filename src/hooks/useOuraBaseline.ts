import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Baseline pessoal por MÉTRICA (auditoria 29/08): cada média só existe com
 * pelo menos MIN_SAMPLES_PER_METRIC amostras daquela métrica — sem defaults
 * populacionais no caminho clínico (uma FCR "basal" de 1 amostra tornava o
 * override tautológico, e 65/60/75 populacionais viravam régua de alerta).
 */
export interface OuraBaseline {
  avgHRV: number | null;
  avgRHR: number | null;
  avgSleepScore: number | null;
  hrvPoints: number;
  rhrPoints: number;
  sleepPoints: number;
  /** Maior contagem entre as métricas — usado só em mensagens de onboarding. */
  dataPoints: number;
  /** Alguma métrica atingiu o mínimo (gate legado dos deltas da UI). */
  hasMinimumData: boolean;
}

export const MIN_SAMPLES_PER_METRIC = 7;

const EMPTY_BASELINE: OuraBaseline = {
  avgHRV: null,
  avgRHR: null,
  avgSleepScore: null,
  hrvPoints: 0,
  rhrPoints: 0,
  sleepPoints: 0,
  dataPoints: 0,
  hasMinimumData: false,
};

const metricAvg = (value: unknown, points: number): number | null => {
  if (points < MIN_SAMPLES_PER_METRIC) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Baseline dinâmico do aluno via `calc_oura_baseline_v2` — janela de
 * `days` dias ANTERIORES a `asOf` (exclui o dia avaliado e linhas futuras),
 * casando o baseline com o par {source, date} do snapshot. Sem `asOf`, a
 * âncora é o dia corrente do banco.
 */
export const useOuraBaseline = (studentId: string, days: number = 30, asOf?: string) => {
  const query = useQuery({
    queryKey: ["oura-baseline", studentId, days, asOf ?? "current"],
    enabled: !!studentId,
    staleTime: 24 * 60 * 60 * 1000, // 24h
    gcTime: 48 * 60 * 60 * 1000, // 48h
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<OuraBaseline> => {
      const { data, error } = await supabase.rpc("calc_oura_baseline_v2", {
        p_student_id: studentId,
        p_days: days,
        ...(asOf ? { p_as_of: asOf } : {}),
      });

      if (error) throw error;

      const row = data?.[0];
      if (!row) return EMPTY_BASELINE;

      const hrvPoints = row.hrv_points ?? 0;
      const rhrPoints = row.rhr_points ?? 0;
      const sleepPoints = row.sleep_points ?? 0;
      const avgHRV = metricAvg(row.avg_hrv, hrvPoints);
      const avgRHR = metricAvg(row.avg_rhr, rhrPoints);
      const avgSleepScore = metricAvg(row.avg_sleep_score, sleepPoints);

      return {
        avgHRV,
        avgRHR,
        avgSleepScore,
        hrvPoints,
        rhrPoints,
        sleepPoints,
        dataPoints: Math.max(hrvPoints, rhrPoints, sleepPoints),
        hasMinimumData: avgHRV !== null || avgRHR !== null || avgSleepScore !== null,
      };
    },
  });

  return {
    ...query,
    baseline: query.data ?? EMPTY_BASELINE,
  };
};
