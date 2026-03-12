import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

export interface StudentReport {
  id: string;
  student_id: string;
  trainer_id: string;
  period_start: string;
  period_end: string;
  report_type: string;
  status: 'generating' | 'completed' | 'failed';
  total_sessions: number;
  weekly_average: number;
  adherence_percentage: number | null;
  sessions_proposed: number | null;
  trainer_highlights: string | null;
  attention_points: string | null;
  next_cycle_plan: string | null;
  oura_data: OuraReportData | null;
  consistency_analysis: string | null;
  strength_analysis: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackedExercise {
  id: string;
  report_id: string;
  exercise_library_id: string | null;
  exercise_name: string;
  initial_load: number | null;
  final_load: number | null;
  load_variation_percentage: number | null;
  initial_total_work: number | null;
  final_total_work: number | null;
  work_variation_percentage: number | null;
  weekly_progression: Record<string, unknown> | null;
  created_at: string;
}

export const useStudentReports = (studentId: string) => {
  return useQuery({
    queryKey: ["student-reports", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_reports")
        .select("*")
        .eq("student_id", studentId)
        .order("period_end", { ascending: false });

      if (error) throw error;
      return data as unknown as StudentReport[];
    },
  });
};

export const useReportById = (reportId: string | null) => {
  return useQuery({
    queryKey: ["student-report", reportId],
    enabled: !!reportId,
    queryFn: async () => {
      if (!reportId) return null;

      const { data, error } = await supabase
        .from("student_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (error) throw error;
      return data as unknown as StudentReport;
    },
  });
};

export const useReportTrackedExercises = (reportId: string | null) => {
  return useQuery({
    queryKey: ["report-tracked-exercises", reportId],
    enabled: !!reportId,
    queryFn: async () => {
      if (!reportId) return [];

      const { data, error } = await supabase
        .from("report_tracked_exercises")
        .select("*")
        .eq("report_id", reportId)
        .order("load_variation_percentage", { ascending: false });

      if (error) throw error;
      return data as unknown as TrackedExercise[];
    },
  });
};

export const useGenerateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      periodStart,
      periodEnd,
      trackedExercises,
      trainerNotes,
    }: {
      studentId: string;
      periodStart: string;
      periodEnd: string;
      trackedExercises: string[];
      trainerNotes?: {
        highlights?: string;
        attentionPoints?: string;
        nextCyclePlan?: string;
      };
    }) => {
      const { data, error } = await supabase.functions.invoke("generate-student-report", {
        body: {
          studentId,
          periodStart,
          periodEnd,
          trackedExercises,
          trainerNotes,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["student-reports", variables.studentId] });
      toast.success("Relatório gerado com sucesso!");
    },
    onError: (error: Error) => {
      logger.error("Error generating report:", error);
      toast.error("Erro ao gerar relatório: " + error.message);
    },
  });
};

export const useUpdateTrainerNotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      highlights,
      attentionPoints,
      nextCyclePlan,
    }: {
      reportId: string;
      highlights?: string;
      attentionPoints?: string;
      nextCyclePlan?: string;
    }) => {
      const { data, error } = await supabase
        .from("student_reports")
        .update({
          trainer_highlights: highlights,
          attention_points: attentionPoints,
          next_cycle_plan: nextCyclePlan,
        })
        .eq("id", reportId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as StudentReport;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-report", data.id] });
      toast.success("Notas atualizadas com sucesso!");
    },
    onError: (error: Error) => {
      logger.error("Error updating trainer notes:", error);
      toast.error("Erro ao atualizar notas: " + error.message);
    },
  });
};