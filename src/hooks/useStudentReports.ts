import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

export interface OuraReportData {
  source?: string[];
  avgReadiness?: number;
  avgSleep?: number;
  avgHrv?: number;
  avgRhr?: number;
  avgVo2Max?: number;
  vo2Initial?: number;
  vo2Final?: number;
  vo2VariationPercentage?: number;
  dataPoints?: number;
  vo2DataPoints?: number;
}

export interface WeeklyProgressionPoint {
  week: number;
  avgLoad: number;
  totalWork: number;
}

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
  weekly_progression: WeeklyProgressionPoint[] | null;
  created_at: string;
}

type StudentReportRow = Database["public"]["Tables"]["student_reports"]["Row"];
type TrackedExerciseRow = Database["public"]["Tables"]["report_tracked_exercises"]["Row"];

const STUDENT_REPORT_COLUMNS = `
  id,
  student_id,
  trainer_id,
  period_start,
  period_end,
  report_type,
  status,
  total_sessions,
  weekly_average,
  adherence_percentage,
  sessions_proposed,
  trainer_highlights,
  attention_points,
  next_cycle_plan,
  oura_data,
  consistency_analysis,
  strength_analysis,
  generated_at,
  created_at,
  updated_at
`;

const TRACKED_EXERCISE_COLUMNS = `
  id,
  report_id,
  exercise_library_id,
  exercise_name,
  initial_load,
  final_load,
  load_variation_percentage,
  initial_total_work,
  final_total_work,
  work_variation_percentage,
  weekly_progression,
  created_at
`;

const isRecord = (value: Json | Record<string, unknown> | null): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toNullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const mapOuraReportData = (value: Json | null): OuraReportData | null => {
  if (!isRecord(value)) {
    return null;
  }

  const source = Array.isArray(value.source)
    ? value.source.filter((item): item is string => typeof item === "string")
    : undefined;

  return {
    source,
    avgReadiness: toNullableNumber(value.avgReadiness),
    avgSleep: toNullableNumber(value.avgSleep),
    avgHrv: toNullableNumber(value.avgHrv),
    avgRhr: toNullableNumber(value.avgRhr),
    avgVo2Max: toNullableNumber(value.avgVo2Max),
    vo2Initial: toNullableNumber(value.vo2Initial),
    vo2Final: toNullableNumber(value.vo2Final),
    vo2VariationPercentage: toNullableNumber(value.vo2VariationPercentage),
    dataPoints: toNullableNumber(value.dataPoints),
    vo2DataPoints: toNullableNumber(value.vo2DataPoints),
  };
};

const mapWeeklyProgression = (value: Json | null): WeeklyProgressionPoint[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const points = (value.filter(isRecord) as Record<string, unknown>[])
    .map((point) => {
      const week = toNullableNumber(point.week);
      const avgLoad = toNullableNumber(point.avgLoad);
      const totalWork = toNullableNumber(point.totalWork);

      if (week === null || avgLoad === null || totalWork === null) {
        return null;
      }

      return { week, avgLoad, totalWork };
    })
    .filter((point): point is WeeklyProgressionPoint => point !== null);

  return points;
};

const mapStudentReport = (row: StudentReportRow): StudentReport => ({
  ...row,
  status:
    row.status === "generating" || row.status === "completed" || row.status === "failed"
      ? row.status
      : "failed",
  weekly_average: row.weekly_average ?? 0,
  oura_data: mapOuraReportData(row.oura_data),
});

const mapTrackedExercise = (row: TrackedExerciseRow): TrackedExercise => ({
  ...row,
  weekly_progression: mapWeeklyProgression(row.weekly_progression),
});

const extractInvokeErrorMessage = async (error: unknown): Promise<string> => {
  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown; context?: unknown };
    if (maybeError.context instanceof Response) {
      const payload = await maybeError.context.json().catch(() => null);
      if (isRecord(payload) && typeof payload.error === "string" && payload.error.trim() !== "") {
        return payload.error;
      }
    }
    if (typeof maybeError.message === "string" && maybeError.message.trim() !== "") {
      return maybeError.message;
    }
  }
  return "Falha ao gerar relatório";
};

export const useStudentReports = (studentId: string) => {
  return useQuery({
    queryKey: ["student-reports", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_reports")
        .select(STUDENT_REPORT_COLUMNS)
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
    queryFn: async () => {
      if (!reportId) return null;

      const { data, error } = await supabase
        .from("student_reports")
        .select(STUDENT_REPORT_COLUMNS)
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
    queryFn: async () => {
      if (!reportId) return [];

      const { data, error } = await supabase
        .from("report_tracked_exercises")
        .select(TRACKED_EXERCISE_COLUMNS)
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
        const message = await extractInvokeErrorMessage(error);
        throw new Error(message);
      }
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
      return mapStudentReport(data);
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
