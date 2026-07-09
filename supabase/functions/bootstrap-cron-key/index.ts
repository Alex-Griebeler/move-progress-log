import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateServiceRoleOrUserRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticateServiceRoleOrUserRole(req, {
    corsHeaders,
    allowedRoles: ["admin"],
  });
  if (auth instanceof Response) return auth;

  const { supabaseUrl, supabaseServiceKey } = auth;
  const admin = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await admin.rpc("_bootstrap_upsert_vault_secret" as never, {
    p_name: "cron_service_role_key",
    p_value: supabaseServiceKey,
  } as never);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
