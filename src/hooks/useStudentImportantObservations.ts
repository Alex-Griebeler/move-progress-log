import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useStudentImportantObservations = (studentId: string) => {
  return useQuery({
    queryKey: ['student-important-observations', studentId],
    enabled: !!studentId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_observations')
        .select('id, student_id, observation_text, categories, severity, created_at, is_resolved')
        .eq('student_id', studentId)
        .eq('is_resolved', false)
        .in('severity', ['baixa', 'média', 'alta'])
        // R8b: percepção pré-treino nunca é "observação importante" — cinto
        // e suspensório além do severity null + is_resolved true do insert.
        .not('categories', 'cs', '{percepcao_treino}')
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};
