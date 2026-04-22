// Smoke Health Edge Function
// GET /smoke-health
// Auth: (x-admin-key == ADMIN_CREATION_KEY) OR (Bearer JWT with role='admin')

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AuthOk { ok: true; mode: "admin_key" | "admin_jwt" }
interface AuthErr { ok: false; status: number; code: string; message: string }

async function authenticate(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceKey: string,
  expectedAdminKey: string | undefined,
): Promise<AuthOk | AuthErr> {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey) {
    if (!expectedAdminKey) {
      return { ok: false, status: 500, code: "CONFIG_MISSING_ENV", message: "ADMIN_CREATION_KEY not configured" };
    }
    if (adminKey === expectedAdminKey) {
      return { ok: true, mode: "admin_key" };
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

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, code: "UNAUTHORIZED_MISSING_AUTH", message: "Invalid or expired token" };
  }

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
    return { ok: false, status: 500, code: "INTERNAL_ERROR", message: "Failed to verify admin role" };
  }
  if (!roleData) {
    return { ok: false, status: 403, code: "FORBIDDEN_NOT_ADMIN", message: "User is not admin" };
  }
  return { ok: true, mode: "admin_jwt" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return jsonResponse({ error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const expectedAdminKey = Deno.env.get("ADMIN_CREATION_KEY");

  const envOk = Boolean(supabaseUrl && serviceRoleKey && anonKey && expectedAdminKey);

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({
      status: "error",
      service: "smoke-health",
      timestamp: new Date().toISOString(),
      checks: { env: false, db: false },
      error: { code: "CONFIG_MISSING_ENV", message: "Missing Supabase env vars" },
    }, 500);
  }

  const authResult = await authenticate(req, supabaseUrl, anonKey, serviceRoleKey, expectedAdminKey);
  if (!authResult.ok) {
    return jsonResponse({
      status: "error",
      service: "smoke-health",
      timestamp: new Date().toISOString(),
      error: { code: authResult.code, message: authResult.message },
    }, authResult.status);
  }

  // DB check: minimal read
  let dbOk = false;
  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from("user_roles").select("user_id", { count: "exact", head: true }).limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  return jsonResponse({
    status: envOk && dbOk ? "ok" : "degraded",
    service: "smoke-health",
    timestamp: new Date().toISOString(),
    auth_mode: authResult.mode,
    checks: {
      env: envOk,
      db: dbOk,
    },
  });
});
