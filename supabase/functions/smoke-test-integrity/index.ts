// Smoke Test Integrity Edge Function
// Runs read-only integrity checks + service_role happy-path smoke tests.
// Security: requires x-admin-key header matching ADMIN_CREATION_KEY secret.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key, x-internal-trigger",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CheckResult {
  name: string;
  expected: string;
  found: number | string;
  status: "PASS" | "FAIL";
  sample_ids: string[];
}

interface SmokeResult {
  endpoint: string;
  status_code: number;
  status: "PASS" | "FAIL";
  summary?: string;
}

const SAMPLE_LIMIT = 20;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function truncateBody(text: string, max = 200): string {
  if (!text) return "";
  // Strip anything resembling a token (jwt-like) just in case
  const sanitized = text.replace(/eyJ[A-Za-z0-9_\-\.]{20,}/g, "[REDACTED]");
  return sanitized.length > max ? sanitized.slice(0, max) + "..." : sanitized;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const expectedKey = Deno.env.get("ADMIN_CREATION_KEY");

  // Auth: accept either x-admin-key OR service_role Bearer (internal trigger)
  const adminKey = req.headers.get("x-admin-key");
  const authHeader = req.headers.get("authorization") ?? "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const internalTrigger = req.headers.get("x-internal-trigger") === "true";

  const isAdminKeyValid =
    !!expectedKey && !!adminKey && adminKey === expectedKey;
  const isServiceRoleValid =
    internalTrigger && !!bearerToken && bearerToken === serviceRoleKey;

  if (!isAdminKeyValid && !isServiceRoleValid) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const checks: CheckResult[] = [];

  // 1) total workout_sessions
  try {
    const { count, error } = await admin
      .from("workout_sessions")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    checks.push({
      name: "workout_sessions_total",
      expected: ">= 0",
      found: count ?? 0,
      status: "PASS",
      sample_ids: [],
    });
  } catch (e) {
    checks.push({
      name: "workout_sessions_total",
      expected: ">= 0",
      found: `error: ${(e as Error).message}`,
      status: "FAIL",
      sample_ids: [],
    });
  }

  // 2) total exercises
  try {
    const { count, error } = await admin
      .from("exercises")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    checks.push({
      name: "exercises_total",
      expected: ">= 0",
      found: count ?? 0,
      status: "PASS",
      sample_ids: [],
    });
  } catch (e) {
    checks.push({
      name: "exercises_total",
      expected: ">= 0",
      found: `error: ${(e as Error).message}`,
      status: "FAIL",
      sample_ids: [],
    });
  }

  // 3) sessions without linked exercises
  try {
    const { data: sessions, error } = await admin
      .from("workout_sessions")
      .select("id");
    if (error) throw error;

    const allIds = (sessions ?? []).map((s: { id: string }) => s.id);
    const orphans: string[] = [];

    // batch query exercises grouped by session_id
    const { data: exRows, error: exErr } = await admin
      .from("exercises")
      .select("session_id");
    if (exErr) throw exErr;

    const linked = new Set(
      (exRows ?? []).map((e: { session_id: string }) => e.session_id)
    );
    for (const id of allIds) {
      if (!linked.has(id)) orphans.push(id);
    }

    checks.push({
      name: "sessions_without_exercises",
      expected: "0",
      found: orphans.length,
      status: orphans.length === 0 ? "PASS" : "FAIL",
      sample_ids: orphans.slice(0, SAMPLE_LIMIT),
    });
  } catch (e) {
    checks.push({
      name: "sessions_without_exercises",
      expected: "0",
      found: `error: ${(e as Error).message}`,
      status: "FAIL",
      sample_ids: [],
    });
  }

  // 4) duplicate (student_id, date, time)
  try {
    const { data, error } = await admin
      .from("workout_sessions")
      .select("id, student_id, date, time");
    if (error) throw error;

    const map = new Map<string, string[]>();
    for (const row of data ?? []) {
      const r = row as {
        id: string;
        student_id: string;
        date: string;
        time: string | null;
      };
      const key = `${r.student_id}|${r.date}|${r.time ?? ""}`;
      const arr = map.get(key) ?? [];
      arr.push(r.id);
      map.set(key, arr);
    }
    const dupIds: string[] = [];
    for (const ids of map.values()) {
      if (ids.length > 1) dupIds.push(...ids);
    }
    checks.push({
      name: "duplicate_sessions_student_date_time",
      expected: "0",
      found: dupIds.length,
      status: dupIds.length === 0 ? "PASS" : "FAIL",
      sample_ids: dupIds.slice(0, SAMPLE_LIMIT),
    });
  } catch (e) {
    checks.push({
      name: "duplicate_sessions_student_date_time",
      expected: "0",
      found: `error: ${(e as Error).message}`,
      status: "FAIL",
      sample_ids: [],
    });
  }

  // 5) student_reports completed without tracked_exercises
  try {
    const { data: reports, error } = await admin
      .from("student_reports")
      .select("id")
      .eq("status", "completed");
    if (error) throw error;

    const reportIds = (reports ?? []).map((r: { id: string }) => r.id);
    const missing: string[] = [];

    if (reportIds.length > 0) {
      const { data: tracked, error: tErr } = await admin
        .from("report_tracked_exercises")
        .select("report_id")
        .in("report_id", reportIds);
      if (tErr) throw tErr;
      const withTracked = new Set(
        (tracked ?? []).map((t: { report_id: string }) => t.report_id)
      );
      for (const id of reportIds) {
        if (!withTracked.has(id)) missing.push(id);
      }
    }

    checks.push({
      name: "completed_reports_without_tracked_exercises",
      expected: "0",
      found: missing.length,
      status: missing.length === 0 ? "PASS" : "FAIL",
      sample_ids: missing.slice(0, SAMPLE_LIMIT),
    });
  } catch (e) {
    checks.push({
      name: "completed_reports_without_tracked_exercises",
      expected: "0",
      found: `error: ${(e as Error).message}`,
      status: "FAIL",
      sample_ids: [],
    });
  }

  // 6) active oura connections without metrics in last 7 days
  try {
    const { data: conns, error } = await admin
      .from("oura_connections")
      .select("student_id")
      .eq("is_active", true);
    if (error) throw error;

    const studentIds = Array.from(
      new Set((conns ?? []).map((c: { student_id: string }) => c.student_id))
    );
    const stale: string[] = [];

    if (studentIds.length > 0) {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 7);
      const sinceDate = since.toISOString().slice(0, 10);

      const { data: metrics, error: mErr } = await admin
        .from("oura_metrics")
        .select("student_id")
        .in("student_id", studentIds)
        .gte("date", sinceDate);
      if (mErr) throw mErr;

      const recent = new Set(
        (metrics ?? []).map((m: { student_id: string }) => m.student_id)
      );
      for (const sid of studentIds) {
        if (!recent.has(sid)) stale.push(sid);
      }
    }

    checks.push({
      name: "active_oura_connections_without_recent_metrics_7d",
      expected: "0",
      found: stale.length,
      status: stale.length === 0 ? "PASS" : "FAIL",
      sample_ids: stale.slice(0, SAMPLE_LIMIT),
    });
  } catch (e) {
    checks.push({
      name: "active_oura_connections_without_recent_metrics_7d",
      expected: "0",
      found: `error: ${(e as Error).message}`,
      status: "FAIL",
      sample_ids: [],
    });
  }

  // 7) service_role happy-path smoke
  const serviceSmoke: SmokeResult[] = [];

  async function smokeCall(
    endpoint: string,
    body: unknown
  ): Promise<SmokeResult> {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      return {
        endpoint,
        status_code: res.status,
        status: res.status < 500 ? "PASS" : "FAIL",
        summary: truncateBody(text),
      };
    } catch (e) {
      return {
        endpoint,
        status_code: 0,
        status: "FAIL",
        summary: `network_error: ${(e as Error).message}`,
      };
    }
  }

  // Minimal non-destructive payloads
  serviceSmoke.push(
    await smokeCall("import-exercises", { exercises: [], dry_run: true })
  );
  serviceSmoke.push(await smokeCall("oura-sync-all", { dry_run: true }));
  serviceSmoke.push(
    await smokeCall("oura-sync-scheduled", { dry_run: true })
  );

  const allPass =
    checks.every((c) => c.status === "PASS") &&
    serviceSmoke.every((s) => s.status === "PASS");

  return jsonResponse({
    status: allPass ? "GO" : "NO-GO",
    checks,
    service_role_smoke: serviceSmoke,
    executed_at: new Date().toISOString(),
  });
});
