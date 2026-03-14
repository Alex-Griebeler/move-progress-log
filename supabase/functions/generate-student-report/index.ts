import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TrainerNotes {
  highlights?: string;
  attentionPoints?: string;
  nextCyclePlan?: string;
}

interface GenerateReportRequest {
  studentId: string;
  periodStart: string;
  periodEnd: string;
  trackedExercises: string[];
  trainerNotes?: TrainerNotes;
}

interface StudentRow {
  id: string;
  name: string;
  trainer_id: string;
  weekly_sessions_proposed: number | null;
}

interface ReportWindowRow {
  id: string;
  period_start: string;
  period_end: string;
  status: "generating" | "completed" | "failed";
}

interface SessionExerciseRow {
  id: string;
  exercise_name: string;
  load_kg: number | null;
  reps: number | null;
  sets: number | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  date: string;
  prescription_id: string | null;
  exercises: SessionExerciseRow[] | null;
}

interface FlattenedExecution {
  exercise_name: string;
  load_kg: number;
  reps: number;
  sets: number;
  created_at: string;
  prescription_id: string | null;
}

interface ExerciseLibraryRow {
  id: string;
  name: string;
  category: string | null;
}

interface OuraMetricsRow {
  date: string;
  readiness_score: number | null;
  sleep_score: number | null;
  average_sleep_hrv: number | null;
  resting_heart_rate: number | null;
  vo2_max: number | null;
}

interface ProgramAggregate {
  programId: string;
  avgLoad: number;
  avgWork: number;
  firstAt: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const parseDateOnly = (value: string): Date | null => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const averageIgnoringNulls = (values: Array<number | null | undefined>): number | null => {
  const valid = values.filter((value): value is number => value !== null && value !== undefined);
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const normalizeComparableText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

const isEligibleStrengthCategory = (category: string | null): boolean => {
  if (!category) {
    return false;
  }
  const normalized = normalizeComparableText(category);
  if (normalized.includes("potencia")) {
    return false;
  }
  return normalized.includes("forca") || normalized.includes("hipertrofia");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let reportId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: userError } = await authClient.auth.getUser();

    if (userError || !authData.user) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const trainerId = authData.user.id;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = (await req.json()) as GenerateReportRequest;
    const { studentId, periodStart, periodEnd, trackedExercises, trainerNotes } = payload;

    if (!studentId || !periodStart || !periodEnd) {
      return jsonResponse(400, { error: "Missing required fields" });
    }
    if (!Array.isArray(trackedExercises) || trackedExercises.length === 0) {
      return jsonResponse(400, { error: "Select at least one exercise" });
    }

    const parsedStart = parseDateOnly(periodStart);
    const parsedEnd = parseDateOnly(periodEnd);
    if (!parsedStart || !parsedEnd) {
      return jsonResponse(400, { error: "Invalid date format" });
    }
    if (parsedStart > parsedEnd) {
      return jsonResponse(400, { error: "Invalid period: start date must be before end date" });
    }

    const daysDiffInclusive = Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / MS_PER_DAY) + 1;
    if (daysDiffInclusive < 7) {
      return jsonResponse(400, { error: "Período mínimo para relatório é de 7 dias" });
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name, trainer_id, weekly_sessions_proposed")
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return jsonResponse(404, { error: "Student not found" });
    }

    const typedStudent = student as unknown as StudentRow;
    if (typedStudent.trainer_id !== trainerId) {
      return jsonResponse(403, { error: "Student not found or unauthorized" });
    }

    const { data: existingReports, error: existingReportsError } = await supabase
      .from("student_reports")
      .select("id, period_start, period_end, status")
      .eq("student_id", studentId)
      .eq("trainer_id", trainerId)
      .neq("status", "failed");

    if (existingReportsError) {
      return jsonResponse(500, { error: "Failed to validate existing report windows" });
    }

    const overlappingReport = ((existingReports || []) as unknown as ReportWindowRow[]).find((candidate) => {
      const start = parseDateOnly(candidate.period_start);
      const end = parseDateOnly(candidate.period_end);
      if (!start || !end) {
        return false;
      }
      return !(end < parsedStart || start > parsedEnd);
    });

    if (overlappingReport) {
      return jsonResponse(409, {
        error: "Já existe um relatório para período sobreposto. Escolha outro intervalo.",
      });
    }

    const { data: trackedExerciseRows, error: trackedExerciseRowsError } = await supabase
      .from("exercises_library")
      .select("id, name, category")
      .in("id", trackedExercises);

    if (trackedExerciseRowsError) {
      return jsonResponse(500, { error: "Failed to validate tracked exercises" });
    }

    const trackedLibrary = (trackedExerciseRows || []) as unknown as ExerciseLibraryRow[];
    const eligibleTrackedExercises = trackedLibrary.filter((exercise) =>
      isEligibleStrengthCategory(exercise.category)
    );

    if (eligibleTrackedExercises.length === 0) {
      return jsonResponse(400, {
        error: "Selecione pelo menos um exercício elegível (força/hipertrofia)",
      });
    }

    const { data: report, error: reportError } = await supabase
      .from("student_reports")
      .insert({
        student_id: studentId,
        trainer_id: trainerId,
        period_start: periodStart,
        period_end: periodEnd,
        report_type: "personalizado",
        status: "generating",
        trainer_highlights: trainerNotes?.highlights,
        attention_points: trainerNotes?.attentionPoints,
        next_cycle_plan: trainerNotes?.nextCyclePlan,
      })
      .select("id")
      .single();

    if (reportError || !report) {
      return jsonResponse(500, { error: "Failed to create report" });
    }
    reportId = (report as { id: string }).id;

    const { data: sessions, error: sessionsError } = await supabase
      .from("workout_sessions")
      .select("id, date, prescription_id, exercises(id, exercise_name, load_kg, reps, sets, created_at)")
      .eq("student_id", studentId)
      .gte("date", periodStart)
      .lte("date", periodEnd)
      .order("date", { ascending: true });

    if (sessionsError) {
      throw new Error("Failed to fetch sessions");
    }

    const typedSessions = (sessions || []) as unknown as SessionRow[];
    const totalSessions = typedSessions.length;
    const weeksDiff = Math.max(1, daysDiffInclusive / 7);
    const weeklyAverage = totalSessions / weeksDiff;

    const sessionsProposed =
      typedStudent.weekly_sessions_proposed && typedStudent.weekly_sessions_proposed > 0
        ? Math.ceil(typedStudent.weekly_sessions_proposed * weeksDiff)
        : null;
    const adherencePercentage =
      sessionsProposed && sessionsProposed > 0 ? (totalSessions / sessionsProposed) * 100 : null;

    const allExecutions: FlattenedExecution[] = typedSessions.flatMap((session) =>
      (session.exercises || [])
        .filter(
          (exercise) =>
            typeof exercise.load_kg === "number" &&
            typeof exercise.reps === "number" &&
            exercise.reps > 0
        )
        .map((exercise) => ({
          exercise_name: exercise.exercise_name,
          load_kg: exercise.load_kg as number,
          reps: exercise.reps as number,
          sets: exercise.sets ?? 1,
          created_at: exercise.created_at || `${session.date}T00:00:00.000Z`,
          prescription_id: session.prescription_id,
        }))
    );

    const trackedExercisesData: Array<{
      exerciseName: string;
      loadVariation: number | null;
      basis: "program" | "timeline" | "insufficient";
    }> = [];

    const insertTrackedExerciseRow = async ({
      exerciseLibraryId,
      exerciseName,
      initialLoad,
      finalLoad,
      loadVariation,
      initialTotalWork,
      finalTotalWork,
      workVariation,
      weeklyProgression,
    }: {
      exerciseLibraryId: string;
      exerciseName: string;
      initialLoad: number | null;
      finalLoad: number | null;
      loadVariation: number | null;
      initialTotalWork: number | null;
      finalTotalWork: number | null;
      workVariation: number | null;
      weeklyProgression: Array<{ week: number; avgLoad: number; totalWork: number }>;
    }) => {
      const { error: trackedInsertError } = await supabase.from("report_tracked_exercises").insert({
        report_id: reportId,
        exercise_library_id: exerciseLibraryId,
        exercise_name: exerciseName,
        initial_load: initialLoad,
        final_load: finalLoad,
        load_variation_percentage: loadVariation,
        initial_total_work: initialTotalWork,
        final_total_work: finalTotalWork,
        work_variation_percentage: workVariation,
        weekly_progression: weeklyProgression,
      });

      if (trackedInsertError) {
        throw new Error(`Failed to insert tracked exercise: ${exerciseName}`);
      }
    };

    for (const trackedExercise of eligibleTrackedExercises) {
      const exerciseName = trackedExercise.name;
      const exerciseExecutions = allExecutions
        .filter(
          (execution) =>
            normalizeComparableText(execution.exercise_name) === normalizeComparableText(exerciseName)
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (exerciseExecutions.length === 0) {
        await insertTrackedExerciseRow({
          exerciseLibraryId: trackedExercise.id,
          exerciseName,
          initialLoad: null,
          finalLoad: null,
          loadVariation: null,
          initialTotalWork: null,
          finalTotalWork: null,
          workVariation: null,
          weeklyProgression: [],
        });
        trackedExercisesData.push({
          exerciseName,
          loadVariation: null,
          basis: "insufficient",
        });
        continue;
      }

      const repsBuckets = new Map<number, FlattenedExecution[]>();
      for (const execution of exerciseExecutions) {
        const list = repsBuckets.get(execution.reps) || [];
        list.push(execution);
        repsBuckets.set(execution.reps, list);
      }

      const preferredBucket = [...repsBuckets.entries()].sort((a, b) => b[1].length - a[1].length)[0];
      if (!preferredBucket || preferredBucket[1].length < 2) {
        await insertTrackedExerciseRow({
          exerciseLibraryId: trackedExercise.id,
          exerciseName,
          initialLoad: null,
          finalLoad: null,
          loadVariation: null,
          initialTotalWork: null,
          finalTotalWork: null,
          workVariation: null,
          weeklyProgression: [],
        });
        trackedExercisesData.push({
          exerciseName,
          loadVariation: null,
          basis: "insufficient",
        });
        continue;
      }

      const sameRepsExecutions = preferredBucket[1];
      const byProgram = new Map<string, FlattenedExecution[]>();
      for (const execution of sameRepsExecutions) {
        const programId = execution.prescription_id || "sem-prescricao";
        const list = byProgram.get(programId) || [];
        list.push(execution);
        byProgram.set(programId, list);
      }

      const programAggregates: ProgramAggregate[] = [...byProgram.entries()]
        .map(([programId, list]) => {
          const avgLoad = list.reduce((sum, item) => sum + item.load_kg, 0) / list.length;
          const avgWork =
            list.reduce((sum, item) => sum + item.load_kg * item.reps * (item.sets || 1), 0) / list.length;
          const firstAt = list
            .map((item) => item.created_at)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
          return { programId, avgLoad, avgWork, firstAt };
        })
        .sort((a, b) => new Date(a.firstAt).getTime() - new Date(b.firstAt).getTime());

      let initialLoad: number | null = null;
      let finalLoad: number | null = null;
      let initialTotalWork: number | null = null;
      let finalTotalWork: number | null = null;
      let basis: "program" | "timeline" = "timeline";

      if (programAggregates.length >= 2) {
        basis = "program";
        initialLoad = programAggregates[0].avgLoad;
        finalLoad = programAggregates[programAggregates.length - 1].avgLoad;
        initialTotalWork = programAggregates[0].avgWork;
        finalTotalWork = programAggregates[programAggregates.length - 1].avgWork;
      } else {
        const first = sameRepsExecutions[0];
        const last = sameRepsExecutions[sameRepsExecutions.length - 1];
        initialLoad = first.load_kg;
        finalLoad = last.load_kg;
        initialTotalWork = first.load_kg * first.reps * (first.sets || 1);
        finalTotalWork = last.load_kg * last.reps * (last.sets || 1);
      }

      const loadVariation =
        initialLoad && initialLoad > 0 && finalLoad !== null
          ? ((finalLoad - initialLoad) / initialLoad) * 100
          : null;
      const workVariation =
        initialTotalWork && initialTotalWork > 0 && finalTotalWork !== null
          ? ((finalTotalWork - initialTotalWork) / initialTotalWork) * 100
          : null;

      const weeklyData = new Map<number, { totalLoad: number; count: number; totalWork: number }>();
      for (const execution of sameRepsExecutions) {
        const executionDate = new Date(execution.created_at);
        const weekNumber =
          Math.floor((executionDate.getTime() - parsedStart.getTime()) / (MS_PER_DAY * 7)) + 1;

        const current = weeklyData.get(weekNumber) || { totalLoad: 0, count: 0, totalWork: 0 };
        current.totalLoad += execution.load_kg;
        current.count += 1;
        current.totalWork += execution.load_kg * execution.reps * (execution.sets || 1);
        weeklyData.set(weekNumber, current);
      }

      const weeklyProgression = [...weeklyData.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([week, data]) => ({
          week,
          avgLoad: data.totalLoad / data.count,
          totalWork: data.totalWork,
        }));

      await insertTrackedExerciseRow({
        exerciseLibraryId: trackedExercise.id,
        exerciseName,
        initialLoad,
        finalLoad,
        loadVariation,
        initialTotalWork,
        finalTotalWork,
        workVariation,
        weeklyProgression,
      });

      trackedExercisesData.push({
        exerciseName,
        loadVariation,
        basis,
      });
    }

    const { data: ouraMetricsRaw } = await supabase
      .from("oura_metrics")
      .select("date, readiness_score, sleep_score, average_sleep_hrv, resting_heart_rate, vo2_max")
      .eq("student_id", studentId)
      .gte("date", periodStart)
      .lte("date", periodEnd)
      .order("date", { ascending: true });

    const ouraMetrics = (ouraMetricsRaw || []) as unknown as OuraMetricsRow[];
    let ouraData: Record<string, unknown> | null = null;

    if (ouraMetrics.length > 0) {
      const avgReadiness = averageIgnoringNulls(ouraMetrics.map((metric) => metric.readiness_score));
      const avgSleep = averageIgnoringNulls(ouraMetrics.map((metric) => metric.sleep_score));
      const avgHrv = averageIgnoringNulls(ouraMetrics.map((metric) => metric.average_sleep_hrv));
      const avgRhr = averageIgnoringNulls(ouraMetrics.map((metric) => metric.resting_heart_rate));

      const vo2Series = ouraMetrics
        .filter((metric) => metric.vo2_max !== null)
        .map((metric) => ({ date: metric.date, value: metric.vo2_max as number }));
      const avgVo2Max = averageIgnoringNulls(vo2Series.map((item) => item.value));
      const firstVo2 = vo2Series.length > 0 ? vo2Series[0].value : null;
      const lastVo2 = vo2Series.length > 0 ? vo2Series[vo2Series.length - 1].value : null;
      const vo2VariationPercentage =
        firstVo2 && firstVo2 > 0 && lastVo2 !== null
          ? ((lastVo2 - firstVo2) / firstVo2) * 100
          : null;

      ouraData = {
        source: ["oura"],
        avgReadiness,
        avgSleep,
        avgHrv,
        avgRhr,
        avgVo2Max,
        vo2Initial: firstVo2,
        vo2Final: lastVo2,
        vo2VariationPercentage,
        dataPoints: ouraMetrics.length,
        vo2DataPoints: vo2Series.length,
      };
    }

    let consistencyAnalysis = "";
    if (weeklyAverage >= 3) {
      consistencyAnalysis = `${typedStudent.name} manteve frequência excelente com ${weeklyAverage.toFixed(1)} treinos por semana em média.`;
    } else if (weeklyAverage >= 2) {
      consistencyAnalysis = `${typedStudent.name} manteve frequência adequada com ${weeklyAverage.toFixed(1)} treinos por semana em média.`;
    } else {
      consistencyAnalysis = `${typedStudent.name} teve frequência de ${weeklyAverage.toFixed(1)} treinos por semana. Há espaço para elevar consistência.`;
    }

    const numericVariations = trackedExercisesData
      .map((item) => item.loadVariation)
      .filter((value): value is number => value !== null);
    const positiveGains = trackedExercisesData.filter((item) => (item.loadVariation || 0) > 10);
    const moderateGains = trackedExercisesData.filter(
      (item) => (item.loadVariation || 0) > 0 && (item.loadVariation || 0) <= 10
    );
    const byProgramCount = trackedExercisesData.filter((item) => item.basis === "program").length;
    const byTimelineCount = trackedExercisesData.filter((item) => item.basis === "timeline").length;
    const insufficientCount = trackedExercisesData.filter((item) => item.basis === "insufficient").length;

    let strengthAnalysis = "";
    if (positiveGains.length > 0) {
      strengthAnalysis = `Ganhos relevantes de força em ${positiveGains
        .map((item) => item.exerciseName)
        .join(", ")} (acima de 10%). `;
    }
    if (moderateGains.length > 0) {
      strengthAnalysis += `Progressão moderada em ${moderateGains
        .map((item) => item.exerciseName)
        .join(", ")}. `;
    }
    if (numericVariations.length === 0) {
      strengthAnalysis = "Dados insuficientes para análise confiável de progressão de força no período.";
    }
    if (byProgramCount > 0) {
      strengthAnalysis += `${byProgramCount} exercício(s) foram comparados entre programações diferentes mantendo reps equivalentes. `;
    }
    if (byTimelineCount > 0) {
      strengthAnalysis += `${byTimelineCount} exercício(s) foram avaliados por linha do tempo (sem blocos suficientes para comparação entre programações). `;
    }
    if (insufficientCount > 0) {
      strengthAnalysis += `${insufficientCount} exercício(s) ficaram com dados insuficientes para cálculo robusto.`;
    }

    const { error: updateError } = await supabase
      .from("student_reports")
      .update({
        status: "completed",
        total_sessions: totalSessions,
        weekly_average: weeklyAverage,
        adherence_percentage: adherencePercentage,
        sessions_proposed: sessionsProposed,
        oura_data: ouraData,
        consistency_analysis: consistencyAnalysis,
        strength_analysis: strengthAnalysis,
        generated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (updateError) {
      await supabase.from("student_reports").update({ status: "failed" }).eq("id", reportId);
      return jsonResponse(500, { error: "Failed to finalize report generation" });
    }

    return jsonResponse(200, { reportId, status: "completed" });
  } catch (error) {
    if (reportId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase.from("student_reports").update({ status: "failed" }).eq("id", reportId);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { error: message });
  }
});
