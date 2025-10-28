import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Stats {
  totalSessions: number;
  thisMonth: number;
  activeStudents: number;
  avgLoad: number;
}

export const useStats = () => {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      // Total de sessões
      const { count: totalSessions } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true });
      
      // Sessões deste mês
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      
      const { count: thisMonth } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .gte("date", firstDayOfMonth);
      
      // Alunos ativos (com pelo menos uma sessão)
      const { data: activeStudentsData } = await supabase
        .from("workout_sessions")
        .select("student_id")
        .gte("date", firstDayOfMonth);
      
      const uniqueStudents = new Set(activeStudentsData?.map(s => s.student_id) || []);
      const activeStudents = uniqueStudents.size;
      
      // Carga média por sessão
      const { data: exercises } = await supabase
        .from("exercises")
        .select("load_kg, session_id");
      
      if (exercises && exercises.length > 0) {
        const sessionLoads = new Map<string, number>();
        
        exercises.forEach((ex: any) => {
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
