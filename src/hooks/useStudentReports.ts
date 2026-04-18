import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { buildErrorDescription } from "@/utils/errorParsing";
import {
  isRecord,
  mapStudentReport,
  mapTrackedExercise,
} from "./reportMappers";

export type {
  OuraReportData,
  StudentReport,
  TrackedExercise,
  WeeklyProgressionPoint,
} from "./reportMappers";

const extractEdgeFunctionErrorMessage = async (error: unknown): Promise<string> => {
  if (!(error instanceof Error)) return "Erro inesperado ao gerar relatório";

  const maybeResponse = (
    error as Error & {
      context?: Response;
      response?: Response;
    }
  ).context ?? (
    error as Error & {
      context?: Response;
      response?: Response;
    }
  ).response;

  if (!(maybeResponse instanceof Response)) return error.message;

  try {
    const payload = await maybeResponse.clone().json();
    if (isRecord(payload)) {
      const message =
        typeof payload.error === "string"
          ? payload.error
          : typeof payload.message === "string"
            ? payload.message
            : null;
      if (message) return message;
    }
  } catch {
    // ignore JSON parsing failures and use fallback message below
  }

  return error.message;
};

export const useStudentReports = (studentId: string) => {
  return useQuery({
    queryKey: ["student-reports", studentId],
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_reports")
        .select("*")
        .eq("student_id", studentId)
        .order("period_end", { ascending: false });

      if (error) throw error;
      return (data || []).map(mapStudentReport);
    },
  });
};

export const useReportById = (reportId: string | null) => {
  return useQuery({
    queryKey: ["student-report", reportId],
    enabled: !!reportId,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    queryFn: async () => {
      if (!reportId) return null;

      const { data, error } = await supabase
        .from("student_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (error) throw error;
      return mapStudentReport(data);
    },
  });
};

export const useReportTrackedExercises = (reportId: string | null) => {
  return useQuery({
    queryKey: ["report-tracked-exercises", reportId],
    enabled: !!reportId,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    queryFn: async () => {
      if (!reportId) return [];

      const { data, error } = await supabase
        .from("report_tracked_exercises")
        .select("*")
        .eq("report_id", reportId)
        .order("load_variation_percentage", { ascending: false });

      if (error) throw error;
      return (data || []).map(mapTrackedExercise);
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

      if (error) {
        const message = await extractEdgeFunctionErrorMessage(error);
        throw new Error(message);
      }
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["student-reports", variables.studentId] });
      const reportId =
        isRecord(data) && typeof data.reportId === "string" ? data.reportId : null;
      if (reportId) {
        queryClient.invalidateQueries({ queryKey: ["student-report", reportId] });
        queryClient.invalidateQueries({ queryKey: ["report-tracked-exercises", reportId] });
      }
      toast.success("Relatório gerado com sucesso!");
    },
    onError: (error: Error) => {
      logger.error("Error generating report:", error);
      toast.error("Erro ao gerar relatório", {
        description: buildErrorDescription(error, "Tente novamente em instantes."),
      });
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
      return mapStudentReport(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-report", data.id] });
      queryClient.invalidateQueries({ queryKey: ["student-reports", data.student_id] });
      toast.success("Notas atualizadas com sucesso!");
    },
    onError: (error: Error) => {
      logger.error("Error updating trainer notes:", error);
      toast.error("Erro ao atualizar notas", {
        description: buildErrorDescription(error, "Tente novamente em instantes."),
      });
    },
  });
};
