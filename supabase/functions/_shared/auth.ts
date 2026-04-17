import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

type CorsHeaders = Record<string, string>;

interface AuthOptions {
  corsHeaders: CorsHeaders;
  allowedRoles: string[];
  missingAuthMessage?: string;
  invalidTokenMessage?: string;
  forbiddenMessage?: string;
}

interface AuthResult {
  supabaseUrl: string;
  supabaseServiceKey: string;
  supabaseAnonKey: string;
  isServiceRole: boolean;
  userId: string | null;
  userRole: string | null;
}

function jsonErrorResponse(
  corsHeaders: CorsHeaders,
  status: number,
  message: string
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function authenticateServiceRoleOrUserRole(
  req: Request,
  options: AuthOptions
): Promise<AuthResult | Response> {
  const {
    corsHeaders,
    allowedRoles,
    missingAuthMessage = "Missing or invalid authorization header",
    invalidTokenMessage = "Invalid or expired token",
    forbiddenMessage = "Forbidden",
  } = options;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    return jsonErrorResponse(corsHeaders, 500, "Missing Supabase environment variables");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonErrorResponse(corsHeaders, 401, missingAuthMessage);
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return jsonErrorResponse(corsHeaders, 401, missingAuthMessage);
  }

  if (token === supabaseServiceKey) {
    return {
      supabaseUrl,
      supabaseServiceKey,
      supabaseAnonKey,
      isServiceRole: true,
      userId: null,
      userRole: null,
    };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonErrorResponse(corsHeaders, 401, invalidTokenMessage);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleData, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .in("role", allowedRoles)
    .limit(1)
    .maybeSingle();

  if (roleError) {
    return jsonErrorResponse(corsHeaders, 500, "Failed to verify permissions");
  }

  if (!roleData) {
    return jsonErrorResponse(corsHeaders, 403, forbiddenMessage);
  }

  return {
    supabaseUrl,
    supabaseServiceKey,
    supabaseAnonKey,
    isServiceRole: false,
    userId: userData.user.id,
    userRole: roleData.role as string,
  };
}
