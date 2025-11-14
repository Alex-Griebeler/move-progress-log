import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays } from "date-fns";

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

const calculateTrend = (current: number | null, previous: number | null, average7d: number | null): OuraTrend => {
  if (!current) {
    return {
      current: 0,
      previous: null,
      change: null,
      changeLabel: "",
      average7d: null,
      vsAverage: null,
    };
  }

  const change = previous ? current - previous : null;
  const vsAverage = average7d ? current - average7d : null;
  
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
    average7d: average7d ? Math.round(average7d) : null,
    vsAverage: vsAverage ? Math.round(vsAverage) : null,
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
      const deduplicatedData = data.reduce((acc: any[], current: any) => {
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
        readiness: last7Days.reduce((sum, m) => sum + (m.readiness_score || 0), 0) / last7Days.length,
        sleep: last7Days.reduce((sum, m) => sum + (m.sleep_score || 0), 0) / last7Days.length,
        activity: last7Days.reduce((sum, m) => sum + (m.activity_score || 0), 0) / last7Days.length,
        stress: last7Days.reduce((sum, m) => sum + (m.stress_high_time || 0), 0) / last7Days.length,
      };

      return {
        readiness: calculateTrend(today.readiness_score, yesterday?.readiness_score, avg7d.readiness),
        sleep: calculateTrend(today.sleep_score, yesterday?.sleep_score, avg7d.sleep),
        activity: calculateTrend(today.activity_score, yesterday?.activity_score, avg7d.activity),
        stress: calculateTrend(
          today.stress_high_time ? 100 - Math.min(today.stress_high_time / 60, 100) : null,
          yesterday?.stress_high_time ? 100 - Math.min(yesterday.stress_high_time / 60, 100) : null,
          100 - Math.min(avg7d.stress / 60, 100)
        ),
      } as OuraTrends;
    },
  });
};
