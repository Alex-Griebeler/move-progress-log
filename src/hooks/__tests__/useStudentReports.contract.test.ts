import { describe, expect, it } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import {
  mapOuraReportData,
  mapStudentReport,
  mapTrackedExercise,
  mapWeeklyProgression,
  toNullableNumber,
} from "../reportMappers";

type StudentReportRow = Database["public"]["Tables"]["student_reports"]["Row"];
type TrackedExerciseRow = Database["public"]["Tables"]["report_tracked_exercises"]["Row"];

const baseStudentReportRow: StudentReportRow = {
  id: "report-1",
  student_id: "student-1",
  trainer_id: "trainer-1",
  period_start: "2026-01-01",
  period_end: "2026-03-31",
  report_type: "quarterly",
  status: "completed",
  total_sessions: 10,
  weekly_average: 2.5,
  adherence_percentage: 80,
  sessions_proposed: 12,
  trainer_highlights: null,
  attention_points: null,
  next_cycle_plan: null,
  oura_data: null,
  consistency_analysis: null,
  strength_analysis: null,
  generated_at: null,
  created_at: "2026-04-12T10:00:00.000Z",
  updated_at: "2026-04-12T10:00:00.000Z",
};

const baseTrackedExerciseRow: TrackedExerciseRow = {
  id: "tracked-1",
  report_id: "report-1",
  exercise_library_id: "exercise-1",
  exercise_name: "Back Squat",
  initial_load: 60,
  final_load: 70,
  load_variation_percentage: 16.7,
  initial_total_work: 1200,
  final_total_work: 1400,
  work_variation_percentage: 16.7,
  weekly_progression: null,
  created_at: "2026-04-12T10:00:00.000Z",
};

describe("useStudentReports contract mappers", () => {
  it("parses numeric values from number and numeric string", () => {
    expect(toNullableNumber(12)).toBe(12);
    expect(toNullableNumber("12.5")).toBe(12.5);
    expect(toNullableNumber("  18.2 ")).toBe(18.2);
    expect(toNullableNumber("abc")).toBeNull();
  });

  it("maps oura_data defensively and accepts numeric strings", () => {
    const mapped = mapOuraReportData({
      source: ["oura", 1, null],
      avgReadiness: "78.3",
      avgSleep: 80,
      avgHrv: "65",
      avgRhr: 58,
      avgVo2Max: "43.7",
      vo2Initial: "41",
      vo2Final: 44,
      vo2VariationPercentage: "7.3",
      dataPoints: "25",
      vo2DataPoints: 10,
    });

    expect(mapped).not.toBeNull();
    expect(mapped?.source).toEqual(["oura"]);
    expect(mapped?.avgReadiness).toBe(78.3);
    expect(mapped?.avgVo2Max).toBe(43.7);
    expect(mapped?.dataPoints).toBe(25);
  });

  it("sanitizes and sorts weekly progression points", () => {
    const progression = mapWeeklyProgression([
      { week: "3", avgLoad: "80", totalWork: 2400 },
      { week: 1, avgLoad: 70, totalWork: 2100 },
      { week: 2, avgLoad: "x", totalWork: 2200 },
      { week: 2, avgLoad: 75, totalWork: 2200 },
    ]);

    expect(progression).toEqual([
      { week: 1, avgLoad: 70, totalWork: 2100 },
      { week: 2, avgLoad: 75, totalWork: 2200 },
      { week: 3, avgLoad: 80, totalWork: 2400 },
    ]);
  });

  it("forces invalid report status to failed and maps nullable weekly average", () => {
    const mapped = mapStudentReport({
      ...baseStudentReportRow,
      status: "unexpected" as StudentReportRow["status"],
      weekly_average: null,
      oura_data: {
        avgReadiness: 70,
      },
    });

    expect(mapped.status).toBe("failed");
    expect(mapped.weekly_average).toBe(0);
    expect(mapped.oura_data?.avgReadiness).toBe(70);
  });

  it("maps tracked exercise weekly progression using contract parser", () => {
    const mapped = mapTrackedExercise({
      ...baseTrackedExerciseRow,
      weekly_progression: [{ week: "2", avgLoad: "72.5", totalWork: "2200" }],
    });

    expect(mapped.weekly_progression).toEqual([
      { week: 2, avgLoad: 72.5, totalWork: 2200 },
    ]);
  });

  it("returns null for invalid oura_data payload shape", () => {
    expect(mapOuraReportData(null)).toBeNull();
    expect(mapOuraReportData(["invalid"])).toBeNull();
  });

  it("returns null weekly progression when payload is not an array", () => {
    const mapped = mapTrackedExercise({
      ...baseTrackedExerciseRow,
      weekly_progression: { week: 1, avgLoad: 70, totalWork: 2100 } as unknown as TrackedExerciseRow["weekly_progression"],
    });

    expect(mapped.weekly_progression).toBeNull();
  });

  it("keeps valid status values untouched", () => {
    const generating = mapStudentReport({
      ...baseStudentReportRow,
      status: "generating",
    });
    const completed = mapStudentReport({
      ...baseStudentReportRow,
      status: "completed",
    });

    expect(generating.status).toBe("generating");
    expect(completed.status).toBe("completed");
  });
});
