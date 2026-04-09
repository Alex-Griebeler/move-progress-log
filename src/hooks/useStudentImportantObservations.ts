import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const IMPORTANT_OBSERVATION_COLUMNS = `
  id,
  student_id,
  session_id,
  exercise_id,
  observation_text,
  categories,
  severity,
  is_resolved,
  resolved_at,
  created_at,
  created_by
`;

export const useStudentImportantObservations = (studentId: string) => {
  return useQuery({
    queryKey: ['student-important-observations', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_observations')
        .select(IMPORTANT_OBSERVATION_COLUMNS)
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
