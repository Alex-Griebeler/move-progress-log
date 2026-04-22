// Smoke Test Integrity Edge Function v2
// Auth: (x-admin-key == ADMIN_CREATION_KEY) OR (Bearer JWT with role='admin')
// Modes: quick (default, integrity only) | full (integrity + service_role smoke)
// Security: never expose secrets in response/logs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AuthMode = "admin_key" | "admin_jwt";
type RunMode = "quick" | "full";

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

interface ErrorEntry {
  code: string;
  message: string;
  cause?: string;
}

const SAMPLE_LIMIT = 20;

function uuid(): string {
  return crypto.randomUUID();
}

function jlog(execution_id: string, phase: string, status: string, extra: Record<string, unknown> = {}) {
  try {
    console.log(JSON.stringify({ execution_id, phase, status, ts: new Date().toISOString(), ...extra }));
  } catch {
    // ignore
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function truncateBody(text: string, max = 200): string {
  if (!text) return "";
  // Strip anything resembling a token (jwt-like) just in case
  const sanitized = text.replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "[REDACTED]");
  return sanitized.length > max ? sanitized.slice(0, max) + "..." : sanitized;
}

interface AuthOk { ok: true; mode: AuthMode; user_id: string | null }
interface AuthErr { ok: false; status: number; code: string; message: string }

async function authenticate(req: Request, supabaseUrl: string, anonKey: string, serviceKey: string, expectedAdminKey: string | undefined): Promise<AuthOk | AuthErr> {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey) {
    if (!expectedAdminKey) {
      return { ok: false, status: 500, code: "CONFIG_MISSING_ENV", message: "ADMIN_CREATION_KEY not configured" };
    }
    if (adminKey === expectedAdminKey) {
      return { ok: true, mode: "admin_key", user_id: null };
    }
    return { ok: false, status: 401, code: "UNAUTHORIZED_INVALID_ADMIN_KEY", message: "Invalid admin key" };
  }

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, code: "UNAUTHORIZED_MISSING_AUTH", message: "Missing x-admin-key or Bearer token" };
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, code: "UNAUTHORIZED_MISSING_AUTH", message: "Empty bearer token" };
  }

  // Validate JWT
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, code: "UNAUTHORIZED_MISSING_AUTH", message: "Invalid or expired token" };
  }

  // Check admin role with service role
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: roleData, error: roleErr } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (roleErr) {
    return { ok: false, status: 500, code: "INTERNAL_ERROR", message: "Failed to verify admin role", cause: roleErr.message } as AuthErr & { cause?: string };
  }
  if (!roleData) {
    return { ok: false, status: 403, code: "FORBIDDEN_NOT_ADMIN", message: "User is not admin" };
  }
  return { ok: true, mode: "admin_jwt", user_id: userData.user.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } }, 405);
  }

  const execution_id = uuid();
  const startedAt = Date.now();
  const errors: ErrorEntry[] = [];

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const expectedAdminKey = Deno.env.get("ADMIN_CREATION_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    jlog(execution_id, "config", "FAIL", { failure_code: "CONFIG_MISSING_ENV" });
    return jsonResponse({
      execution_id,
      status: "NO-GO",
      errors: [{ code: "CONFIG_MISSING_ENV", message: "Missing Supabase environment variables" }],
      executed_at: new Date().toISOString(),
    }, 500);
  }

  // Auth
  jlog(execution_id, "auth", "START");
  const authResult = await authenticate(req, supabaseUrl, anonKey, serviceRoleKey, expectedAdminKey);
  if (!authResult.ok) {
    jlog(execution_id, "auth", "FAIL", { failure_code: authResult.code });
    return jsonResponse({
      execution_id,
      status: "NO-GO",
      errors: [{ code: authResult.code, message: authResult.message }],
      executed_at: new Date().toISOString(),
    }, authResult.status);
  }
  const auth_mode: AuthMode = authResult.mode;
  jlog(execution_id, "auth", "PASS", { auth_mode });

  // Parse body
  let mode: RunMode = "quick";
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const text = await req.text();
      if (text.trim().length > 0) {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && (parsed.mode === "quick" || parsed.mode === "full")) {
          mode = parsed.mode;
        }
      }
    }
  } catch (_e) {
    // ignore body parse, default quick
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const checks: CheckResult[] = [];

  async function runCheck(name: string, fn: () => Promise<CheckResult>) {
    const t0 = Date.now();
    try {
      const c = await fn();
      checks.push(c);
      jlog(execution_id, `check:${name}`, c.status, { duration_ms: Date.now() - t0 });
    } catch (e) {
      const msg = (e as Error).message;
      checks.push({ name, expected: "no error", found: `error: ${msg}`, status: "FAIL", sample_ids: [] });
      errors.push({ code: "CHECK_EXECUTION_FAILED", message: `Check ${name} failed`, cause: msg });
      jlog(execution_id, `check:${name}`, "FAIL", { duration_ms: Date.now() - t0, failure_code: "CHECK_EXECUTION_FAILED" });
    }
  }

  // 1) workout_sessions total
  await runCheck("workout_sessions_total", async () => {
    const { count, error } = await admin.from("workout_sessions").select("id", { count: "exact", head: true });
    if (error) throw error;
    return { name: "workout_sessions_total", expected: ">= 0", found: count ?? 0, status: "PASS", sample_ids: [] };
  });

  // 2) exercises total
  await runCheck("exercises_total", async () => {
    const { count, error } = await admin.from("exercises").select("id", { count: "exact", head: true });
    if (error) throw error;
    return { name: "exercises_total", expected: ">= 0", found: count ?? 0, status: "PASS", sample_ids: [] };
  });

  // 3) sessions without linked exercises
  await runCheck("sessions_without_exercises", async () => {
    const { data: sessions, error } = await admin.from("workout_sessions").select("id");
    if (error) throw error;
    const allIds = (sessions ?? []).map((s: { id: string }) => s.id);
    const { data: exRows, error: exErr } = await admin.from("exercises").select("session_id");
    if (exErr) throw exErr;
    const linked = new Set((exRows ?? []).map((e: { session_id: string }) => e.session_id));
    const orphans = allIds.filter((id: string) => !linked.has(id));
    return {
      name: "sessions_without_exercises",
      expected: "0",
      found: orphans.length,
      status: orphans.length === 0 ? "PASS" : "FAIL",
      sample_ids: orphans.slice(0, SAMPLE_LIMIT),
    };
  });

  // 4) duplicate sessions
  await runCheck("duplicate_sessions_student_date_time", async () => {
    const { data, error } = await admin.from("workout_sessions").select("id, student_id, date, time");
    if (error) throw error;
    const map = new Map<string, string[]>();
    for (const row of data ?? []) {
      const r = row as { id: string; student_id: string; date: string; time: string | null };
      const key = `${r.student_id}|${r.date}|${r.time ?? ""}`;
      const arr = map.get(key) ?? [];
      arr.push(r.id);
      map.set(key, arr);
    }
    const dupIds: string[] = [];
    for (const ids of map.values()) if (ids.length > 1) dupIds.push(...ids);
    return {
      name: "duplicate_sessions_student_date_time",
      expected: "0",
      found: dupIds.length,
      status: dupIds.length === 0 ? "PASS" : "FAIL",
      sample_ids: dupIds.slice(0, SAMPLE_LIMIT),
    };
  });

  // 5) completed reports without tracked
  await runCheck("completed_reports_without_tracked_exercises", async () => {
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
      const withTracked = new Set((tracked ?? []).map((t: { report_id: string }) => t.report_id));
      for (const id of reportIds) if (!withTracked.has(id)) missing.push(id);
    }
    return {
      name: "completed_reports_without_tracked_exercises",
      expected: "0",
      found: missing.length,
      status: missing.length === 0 ? "PASS" : "FAIL",
      sample_ids: missing.slice(0, SAMPLE_LIMIT),
    };
  });

  // 6) active oura connections without recent metrics
  await runCheck("active_oura_connections_without_recent_metrics_7d", async () => {
    const { data: conns, error } = await admin
      .from("oura_connections")
      .select("student_id")
      .eq("is_active", true);
    if (error) throw error;
    const studentIds = Array.from(new Set((conns ?? []).map((c: { student_id: string }) => c.student_id)));
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
      const recent = new Set((metrics ?? []).map((m: { student_id: string }) => m.student_id));
      for (const sid of studentIds) if (!recent.has(sid)) stale.push(sid);
    }
    return {
      name: "active_oura_connections_without_recent_metrics_7d",
      expected: "0",
      found: stale.length,
      status: stale.length === 0 ? "PASS" : "FAIL",
      sample_ids: stale.slice(0, SAMPLE_LIMIT),
    };
  });

  // 7) service_role smoke (only in full mode)
  const serviceSmoke: SmokeResult[] = [];
  if (mode === "full") {
    async function smokeCall(
      endpoint: string,
      body: unknown,
      timeoutMs: number,
      expectedStatuses: number[],
    ): Promise<SmokeResult> {
      const t0 = Date.now();
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        const text = await res.text();
        const statusOk = expectedStatuses.includes(res.status);

        if (!statusOk) {
          errors.push({
            code: "SMOKE_BAD_STATUS",
            message: `smoke ${endpoint} returned unexpected status`,
            cause: `expected=${expectedStatuses.join(",")} got=${res.status}`,
          });
        }

        const r: SmokeResult = {
          endpoint,
          status_code: res.status,
          status: statusOk ? "PASS" : "FAIL",
          summary: truncateBody(text),
        };
        jlog(execution_id, `smoke:${endpoint}`, r.status, { status_code: res.status, duration_ms: Date.now() - t0 });
        return r;
      } catch (e) {
        clearTimeout(tid);
        const isAbort = (e as Error).name === "AbortError";
        const msg = (e as Error).message;
        if (isAbort) {
          errors.push({
            code: "SMOKE_TIMEOUT",
            message: `smoke ${endpoint} timed out`,
            cause: `timeout_ms=${timeoutMs}`,
          });
          jlog(execution_id, `smoke:${endpoint}`, "FAIL", {
            duration_ms: Date.now() - t0,
            failure_code: "SMOKE_TIMEOUT",
            timeout_ms: timeoutMs,
          });
          return { endpoint, status_code: 0, status: "FAIL", summary: `timeout_after_${timeoutMs}ms` };
        }
        errors.push({ code: "CHECK_EXECUTION_FAILED", message: `smoke ${endpoint} failed`, cause: msg });
        jlog(execution_id, `smoke:${endpoint}`, "FAIL", { duration_ms: Date.now() - t0, failure_code: "CHECK_EXECUTION_FAILED" });
        return { endpoint, status_code: 0, status: "FAIL", summary: `network_error: ${msg}` };
      }
    }
    serviceSmoke.push(await smokeCall("import-exercises", { exercises: [], dry_run: true }, 10000, [200]));
    serviceSmoke.push(await smokeCall("oura-sync-all", { dry_run: true }, 70000, [200]));
    serviceSmoke.push(await smokeCall("oura-sync-scheduled", { dry_run: true }, 30000, [200]));
  }

  const allChecksPass = checks.every((c) => c.status === "PASS");
  const allSmokePass = serviceSmoke.every((s) => s.status === "PASS");
  const status = allChecksPass && allSmokePass ? "GO" : "NO-GO";

  const duration_ms = Date.now() - startedAt;
  jlog(execution_id, "complete", status, { duration_ms, mode, auth_mode });

  return jsonResponse({
    execution_id,
    auth_mode,
    mode,
    status,
    duration_ms,
    executed_at: new Date().toISOString(),
    checks,
    service_role_smoke: serviceSmoke,
    errors,
  });
});
