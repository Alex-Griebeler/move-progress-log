import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateServiceRoleOrUserRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

  // Upsert cron_service_role_key into vault
  const { data: existing } = await admin
    .schema("vault" as never)
    .from("secrets" as never)
    .select("id")
    .eq("name", "cron_service_role_key")
    .maybeSingle();

  let action = "created";
  if (existing) {
    await admin.rpc("_bootstrap_update_vault_secret" as never, {
      p_name: "cron_service_role_key",
      p_value: supabaseServiceKey,
    });
    action = "updated";
  } else {
    await admin.rpc("_bootstrap_create_vault_secret" as never, {
      p_name: "cron_service_role_key",
      p_value: supabaseServiceKey,
    });
  }

  return new Response(JSON.stringify({ ok: true, action }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
