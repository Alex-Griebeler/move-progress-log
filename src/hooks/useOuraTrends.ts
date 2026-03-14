import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OuraTrend {
  current: number;
  previous: number | null;
  change: number | null;
  changeLabel: string;
  average7d: number | null;
  vsAverage: number | null;
}

export interface OuraTrends {
  readiness: OuraTrend;
  sleep: OuraTrend;
  activity: OuraTrend;
  stress: OuraTrend;
}

const averageValues = (values: Array<number | null | undefined>): number | null => {
  const valid = values.filter((value): value is number => value !== null && value !== undefined);
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const calculateTrend = (current: number | null, previous: number | null, average7d: number | null): OuraTrend => {
  if (current === null || current === undefined) {
    return {
      current: 0,
      previous: null,
      change: null,
      changeLabel: "",
      average7d: null,
      vsAverage: null,
    };
  }

  const change = previous !== null && previous !== undefined ? current - previous : null;
  const vsAverage = average7d !== null && average7d !== undefined ? current - average7d : null;
  
  const changeLabel = change
    ? change > 0
      ? `↑ +${change.toFixed(0)}`
      : `↓ ${change.toFixed(0)}`
    : "";

  return {
    current,
    previous,
    change,
    changeLabel,
    average7d: average7d !== null && average7d !== undefined ? Math.round(average7d) : null,
    vsAverage: vsAverage !== null && vsAverage !== undefined ? Math.round(vsAverage) : null,
  };
};

export const useOuraTrends = (studentId: string) => {
  return useQuery({
    queryKey: ["oura-trends", studentId],
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Buscar últimos 8 dias de métricas (hoje + 7 dias de histórico)
      const { data, error } = await supabase
        .from("oura_metrics")
        .select("date, readiness_score, sleep_score, activity_score, stress_high_time")
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .limit(8);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Deduplicate by date (keep most recent for each day)
      const deduplicatedData = data.reduce((acc: typeof data, current) => {
        const existingIndex = acc.findIndex(item => item.date === current.date);
        if (existingIndex === -1) {
          acc.push(current);
        }
        return acc;
      }, []);

      const today = deduplicatedData[0];
      const yesterday = deduplicatedData[1] || null;
      const last7Days = deduplicatedData.slice(0, 7);

      // Calculate 7-day averages
      const avg7d = {
        readiness: averageValues(last7Days.map((m) => m.readiness_score)),
        sleep: averageValues(last7Days.map((m) => m.sleep_score)),
        activity: averageValues(last7Days.map((m) => m.activity_score)),
        stressScore: averageValues(
          last7Days.map((m) =>
            m.stress_high_time !== null && m.stress_high_time !== undefined
              ? 100 - Math.min(m.stress_high_time / 60, 100)
              : null
          )
        ),
      };

      return {
        readiness: calculateTrend(today.readiness_score, yesterday?.readiness_score, avg7d.readiness),
        sleep: calculateTrend(today.sleep_score, yesterday?.sleep_score, avg7d.sleep),
        activity: calculateTrend(today.activity_score, yesterday?.activity_score, avg7d.activity),
        stress: calculateTrend(
          today.stress_high_time !== null && today.stress_high_time !== undefined
            ? 100 - Math.min(today.stress_high_time / 60, 100)
            : null,
          yesterday?.stress_high_time !== null && yesterday?.stress_high_time !== undefined
            ? 100 - Math.min(yesterday.stress_high_time / 60, 100)
            : null,
          avg7d.stressScore
        ),
      } as OuraTrends;
    },
  });
};
