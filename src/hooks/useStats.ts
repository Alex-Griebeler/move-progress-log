import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface Stats {
  totalSessions: number;
  thisMonth: number;
  activeStudents: number;
  avgLoad: number;
}

const MONTHLY_EXERCISES_PAGE_SIZE = 1000;
const MONTHLY_EXERCISES_MAX_PAGES = 50;

export const useStats = () => {
  return useQuery({
    queryKey: ["stats"],
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Total de sessões
      const { count: totalSessions, error: totalSessionsError } = await supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true });
      if (totalSessionsError) throw totalSessionsError;
      
      // Sessões deste mês
      const now = new Date();
      const firstDayOfMonth = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
      
      const { count: thisMonth, error: thisMonthError } = await supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .gte("date", firstDayOfMonth);
      if (thisMonthError) throw thisMonthError;
      
      // Alunos ativos (com pelo menos uma sessão) — NOVO-002: count distinct via RPC
      const { data: activeStudentsCount, error: activeStudentsError } = await supabase
        .rpc('count_active_students', { p_since: firstDayOfMonth });
      if (activeStudentsError) throw activeStudentsError;
      const activeStudents = activeStudentsCount || 0;
      
      // Carga média por sessão — evita truncamento silencioso por limite fixo
      const exercises: Array<{ load_kg: number | null; session_id: string }> = [];

      for (let pageIndex = 0; pageIndex < MONTHLY_EXERCISES_MAX_PAGES; pageIndex += 1) {
        const from = pageIndex * MONTHLY_EXERCISES_PAGE_SIZE;
        const to = from + MONTHLY_EXERCISES_PAGE_SIZE - 1;

        const { data: pageData, error: pageError } = await supabase
          .from("exercises")
          .select("id, load_kg, session_id, created_at")
          .gte("created_at", firstDayOfMonth)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to);

        if (pageError) throw pageError;
        if (!pageData || pageData.length === 0) break;

        exercises.push(
          ...pageData.map((exercise) => ({
            load_kg: exercise.load_kg,
            session_id: exercise.session_id,
          }))
        );

        if (pageData.length < MONTHLY_EXERCISES_PAGE_SIZE) break;
      }
      
      if (exercises && exercises.length > 0) {
        const sessionLoads = new Map<string, number>();
        
        exercises.forEach((ex) => {
          if (ex.load_kg) {
            const current = sessionLoads.get(ex.session_id) || 0;
            sessionLoads.set(ex.session_id, current + ex.load_kg);
          }
        });
        
        const loads = Array.from(sessionLoads.values());
        const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
        
        return {
          totalSessions: totalSessions || 0,
          thisMonth: thisMonth || 0,
          activeStudents,
          avgLoad: Math.round(avgLoad),
        };
      }
      
      return {
        totalSessions: totalSessions || 0,
        thisMonth: thisMonth || 0,
        activeStudents,
        avgLoad: 0,
      };
    },
  });
};
