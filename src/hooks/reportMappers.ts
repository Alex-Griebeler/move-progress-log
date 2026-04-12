import type { Database, Json } from "@/integrations/supabase/types";

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
  status: "generating" | "completed" | "failed";
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

export const isRecord = (value: Json | Record<string, unknown> | null): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

export const mapOuraReportData = (value: Json | null): OuraReportData | null => {
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

export const mapWeeklyProgression = (value: Json | null): WeeklyProgressionPoint[] | null => {
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

  return points.sort((a, b) => a.week - b.week);
};

export const mapStudentReport = (row: StudentReportRow): StudentReport => ({
  ...row,
  status:
    row.status === "generating" || row.status === "completed" || row.status === "failed"
      ? row.status
      : "failed",
  weekly_average: row.weekly_average ?? 0,
  oura_data: mapOuraReportData(row.oura_data),
});

export const mapTrackedExercise = (row: TrackedExerciseRow): TrackedExercise => ({
  ...row,
  weekly_progression: mapWeeklyProgression(row.weekly_progression),
});
