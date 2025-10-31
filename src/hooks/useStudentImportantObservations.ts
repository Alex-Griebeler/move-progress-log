import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useStudentImportantObservations = (studentId: string) => {
  return useQuery({
    queryKey: ['student-important-observations', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_observations')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_resolved', false)
        .in('severity', ['baixa', 'média', 'alta'])
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};
