import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SessionFilters {
  studentIds?: string[];
  prescriptionIds?: string[];
  startDate?: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  sessionType?: "individual" | "group" | "all";
}

export interface SessionWithDetails {
  id: string;
  date: string;
  time: string;
  session_type: string;
  workout_name: string | null;
  room_name: string | null;
  trainer_name: string | null;
  is_finalized: boolean;
  can_reopen: boolean;
  prescription_id: string | null;
  student_id: string;
  student: {
    name: string;
    avatar_url: string | null;
  };
  prescription: {
    name: string;
  } | null;
  exercises: Array<{
    load_kg: number | null;
  }>;
}

export function useAllSessions(filters?: SessionFilters) {
  return useQuery({
    // INC-005: Serialized primitives for stable queryKey
    queryKey: [
      "all-sessions",
      filters?.studentIds?.join(",") ?? "",
      filters?.prescriptionIds?.join(",") ?? "",
      filters?.startDate?.toISOString() ?? "",
      filters?.endDate?.toISOString() ?? "",
      filters?.startTime ?? "",
      filters?.endTime ?? "",
      filters?.sessionType ?? "all",
    ],
    queryFn: async () => {
      let query = supabase
        .from("workout_sessions")
        .select(`
          id,
          date,
          time,
          session_type,
          workout_name,
          room_name,
          trainer_name,
          is_finalized,
          can_reopen,
          prescription_id,
          student_id,
          student:students!student_id (
            name,
            avatar_url
          ),
          prescription:workout_prescriptions!prescription_id (
            name
          ),
          exercises!session_id (
            load_kg
          )
        `)
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      // Aplicar filtros
      if (filters?.studentIds && filters.studentIds.length > 0) {
        query = query.in("student_id", filters.studentIds);
      }

      if (filters?.prescriptionIds && filters.prescriptionIds.length > 0) {
        query = query.in("prescription_id", filters.prescriptionIds);
      }

      if (filters?.startDate) {
        query = query.gte("date", filters.startDate.toISOString().split("T")[0]);
      }

      if (filters?.endDate) {
        query = query.lte("date", filters.endDate.toISOString().split("T")[0]);
      }

      if (filters?.startTime) {
        query = query.gte("time", filters.startTime);
      }

      if (filters?.endTime) {
        query = query.lte("time", filters.endTime);
      }

      if (filters?.sessionType && filters.sessionType !== "all") {
        query = query.eq("session_type", filters.sessionType);
      }

      // Limite explícito para evitar cap silencioso de 1000 rows do Supabase
      query = query.limit(2000);

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as SessionWithDetails[];
    },
  });
}
