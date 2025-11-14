import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  return useQuery({
    queryKey: ["students-active-prescriptions", studentIds],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: assignments, error } = await supabase
        .from("prescription_assignments")
        .select("student_id")
        .in("student_id", studentIds)
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
      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      if (sessionsError) throw sessionsError;
      if (!sessions) return [];

      const sessionsWithExercises = await Promise.all(
        sessions.map(async (session) => {
          const { data: exercises } = await supabase
            .from("exercises")
            .select("*")
            .eq("session_id", session.id);

          return {
            ...session,
            exercises: exercises || [],
          };
        })
      );

      return sessionsWithExercises;
    },
  });
};
