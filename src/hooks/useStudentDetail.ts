import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatSessionTime } from "@/utils/sessionTime";

export const useStudentPrescriptions = (studentId: string) => {
  return useQuery({
    queryKey: ["student-prescriptions", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from("prescription_assignments")
        .select(`
          *,
          prescription:workout_prescriptions(*)
        `)
        .eq("student_id", studentId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return assignments;
    },
  });
};

export const useStudentsWithActivePrescriptions = (studentIds: string[]) => {
  const normalizedStudentIds = Array.from(new Set(studentIds)).sort();

  return useQuery({
    queryKey: ["students-active-prescriptions", normalizedStudentIds],
    enabled: normalizedStudentIds.length > 0,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: assignments, error } = await supabase
        .from("prescription_assignments")
        .select("student_id")
        .in("student_id", normalizedStudentIds)
        .lte("start_date", today)
        .or(`end_date.is.null,end_date.gte.${today}`);

      if (error) throw error;
      
      // Criar um Set de IDs de alunos com prescrição ativa
      const activeStudentIds = new Set(assignments?.map(a => a.student_id) || []);
      
      return activeStudentIds;
    },
  });
};

export const useSessionsWithExercises = (studentId: string) => {
  return useQuery({
    queryKey: ["sessions-with-exercises", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      // BUG-002 fix: Single query with join instead of N+1
      const { data: sessions, error } = await supabase
        .from("workout_sessions")
        .select(`
          *,
          exercises(*)
        `)
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      if (error) throw error;
      return (sessions || []).map((session) => ({
        ...session,
        time: formatSessionTime(session.time),
        exercises: Array.isArray(session.exercises) ? session.exercises : [],
      }));
    },
  });
};
