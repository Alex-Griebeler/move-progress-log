import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatSessionTime } from "@/utils/sessionTime";
import { format } from "date-fns";

const STUDENT_ASSIGNMENTS_SELECT = `
  id,
  start_date,
  end_date,
  custom_adaptations,
  prescription:workout_prescriptions(
    id,
    name,
    objective
  )
`;

const STUDENT_SESSIONS_WITH_EXERCISES_SELECT = `
  id,
  student_id,
  date,
  time,
  session_type,
  workout_name,
  is_finalized,
  can_reopen,
  exercises(
    exercise_name,
    load_kg
  )
`;

export const useStudentPrescriptions = (studentId: string) => {
  return useQuery({
    queryKey: ["student-prescriptions", studentId],
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from("prescription_assignments")
        .select(STUDENT_ASSIGNMENTS_SELECT)
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
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      
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
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // BUG-002 fix: Single query with join instead of N+1
      const { data: sessions, error } = await supabase
        .from("workout_sessions")
        .select(STUDENT_SESSIONS_WITH_EXERCISES_SELECT)
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
