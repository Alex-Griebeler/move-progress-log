import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("[integrity] Missing required env vars: SUPABASE_SERVICE_ROLE_KEY");
  console.error(
    "[integrity] Optional: SUPABASE_URL. Fallback to VITE_SUPABASE_URL is supported."
  );
  console.error(
    "[integrity] Run example: SUPABASE_SERVICE_ROLE_KEY=... npm run verify:data-integrity"
  );
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: { persistSession: false },
  }
);

const printSection = (title) => {
  console.log(`\n=== ${title} ===`);
};

const requireNoError = (error, context) => {
  if (!error) return;
  const details = error.message ? `: ${error.message}` : "";
  throw new Error(`[integrity] ${context}${details}`);
};

const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

const main = async () => {
  printSection("Global counts");
  const [{ count: sessionsCount, error: sessionsCountError }, { count: exercisesCount, error: exercisesCountError }] =
    await Promise.all([
      supabase.from("workout_sessions").select("id", { count: "exact", head: true }),
      supabase.from("exercises").select("id", { count: "exact", head: true }),
    ]);
  requireNoError(sessionsCountError, "count workout_sessions");
  requireNoError(exercisesCountError, "count exercises");

  console.table([
    { metric: "workout_sessions", value: sessionsCount ?? 0 },
    { metric: "exercises", value: exercisesCount ?? 0 },
  ]);

  printSection("Sessions without exercises");
  const { data: sessionsWithExercises, error: sessionsWithExercisesError } = await supabase
    .from("workout_sessions")
    .select("id, date, time, student_id, created_at, exercises(id)");
  requireNoError(sessionsWithExercisesError, "load sessions with exercises");

  const emptySessions = (sessionsWithExercises ?? []).filter((row) => {
    const exercises = Array.isArray(row.exercises) ? row.exercises : [];
    return exercises.length === 0;
  });

  const emptyRatio =
    (sessionsWithExercises?.length ?? 0) > 0
      ? emptySessions.length / sessionsWithExercises.length
      : 0;

  console.table([
    {
      metric: "sessions_without_exercises",
      value: emptySessions.length,
    },
    {
      metric: "sessions_without_exercises_ratio",
      value: formatPercent(emptyRatio),
    },
  ]);

  if (emptySessions.length > 0) {
    console.log("[integrity] Sample (up to 10) empty sessions:");
    console.table(
      emptySessions.slice(0, 10).map((row) => ({
        session_id: row.id,
        student_id: row.student_id,
        date: row.date,
        time: row.time,
        created_at: row.created_at,
      }))
    );
  }

  printSection("Potential duplicate sessions");
  const { data: sessionKeys, error: sessionKeysError } = await supabase
    .from("workout_sessions")
    .select("id, student_id, date, time");
  requireNoError(sessionKeysError, "load session keys");

  const buckets = new Map();
  for (const row of sessionKeys ?? []) {
    const key = `${row.student_id}|${row.date}|${row.time}`;
    const current = buckets.get(key);
    if (!current) {
      buckets.set(key, { count: 1, ids: [row.id] });
      continue;
    }
    current.count += 1;
    current.ids.push(row.id);
  }

  const duplicates = [...buckets.entries()]
    .filter(([, value]) => value.count > 1)
    .map(([key, value]) => {
      const [student_id, date, time] = key.split("|");
      return {
        student_id,
        date,
        time,
        duplicate_count: value.count,
        session_ids: value.ids.join(", "),
      };
    });

  console.table([
    {
      metric: "duplicate_session_keys",
      value: duplicates.length,
    },
  ]);
  if (duplicates.length > 0) {
    console.log("[integrity] Sample (up to 10) duplicate keys:");
    console.table(duplicates.slice(0, 10));
  }

  printSection("Reports integrity");
  const [{ data: reports, error: reportsError }, { data: trackedRows, error: trackedRowsError }] =
    await Promise.all([
      supabase.from("student_reports").select("id, status, created_at"),
      supabase.from("report_tracked_exercises").select("report_id"),
    ]);
  requireNoError(reportsError, "load student_reports");
  requireNoError(trackedRowsError, "load report_tracked_exercises");

  const trackedCountByReport = new Map();
  for (const row of trackedRows ?? []) {
    const current = trackedCountByReport.get(row.report_id) ?? 0;
    trackedCountByReport.set(row.report_id, current + 1);
  }

  const completedReports = (reports ?? []).filter((row) => row.status === "completed");
  const completedWithoutTracked = completedReports.filter(
    (row) => (trackedCountByReport.get(row.id) ?? 0) === 0
  );

  console.table([
    { metric: "student_reports_total", value: reports?.length ?? 0 },
    { metric: "student_reports_completed", value: completedReports.length },
    {
      metric: "completed_reports_without_tracked_exercises",
      value: completedWithoutTracked.length,
    },
  ]);

  if (completedWithoutTracked.length > 0) {
    console.log("[integrity] Sample (up to 10) completed reports without tracked exercises:");
    console.table(
      completedWithoutTracked.slice(0, 10).map((row) => ({
        report_id: row.id,
        created_at: row.created_at,
      }))
    );
  }

  printSection("Oura freshness (last 7 days)");
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [{ data: activeConnections, error: activeConnectionsError }, { data: recentMetrics, error: recentMetricsError }] =
    await Promise.all([
      supabase
        .from("oura_connections")
        .select("student_id")
        .eq("is_active", true),
      supabase
        .from("oura_metrics")
        .select("student_id, date")
        .gte("date", sevenDaysAgo),
    ]);
  requireNoError(activeConnectionsError, "load active oura connections");
  requireNoError(recentMetricsError, "load recent oura metrics");

  const activeStudentIds = new Set((activeConnections ?? []).map((row) => row.student_id));
  const studentsWithRecentMetrics = new Set((recentMetrics ?? []).map((row) => row.student_id));
  let activeWithoutRecentMetrics = 0;
  for (const studentId of activeStudentIds) {
    if (!studentsWithRecentMetrics.has(studentId)) {
      activeWithoutRecentMetrics += 1;
    }
  }

  console.table([
    { metric: "active_oura_connections", value: activeStudentIds.size },
    { metric: "students_with_oura_metrics_last_7d", value: studentsWithRecentMetrics.size },
    { metric: "active_without_recent_oura_metrics", value: activeWithoutRecentMetrics },
  ]);

  printSection("Integrity summary");
  const issues = [];
  if (emptySessions.length > 0) issues.push("sessions_without_exercises");
  if (duplicates.length > 0) issues.push("duplicate_session_keys");
  if (completedWithoutTracked.length > 0) issues.push("completed_reports_without_tracked");
  if (activeWithoutRecentMetrics > 0) issues.push("oura_active_without_recent_metrics");

  if (issues.length === 0) {
    console.log("PASS: no integrity issues detected by automated checks.");
    return;
  }

  console.log(`WARN: issues detected -> ${issues.join(", ")}`);
  process.exitCode = 2;
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
