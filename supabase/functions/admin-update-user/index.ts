import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const VALID_ROLES = new Set(["admin", "moderator", "user"]);
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_FULL_NAME_LENGTH = 120;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verificar se o usuário que está fazendo a requisição é admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { error: "Authorization header missing" });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: requestingUser }, error: authError } = await authClient.auth.getUser();

    if (authError || !requestingUser) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    // Verificar se o usuário é admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .maybeSingle();

    if (roleError || roleData?.role !== 'admin') {
      return jsonResponse(403, { error: "Only admins can update users" });
    }

    const rawPayload = await req.json().catch(() => null);
    if (!isPlainObject(rawPayload)) {
      return jsonResponse(400, { error: "Invalid request body" });
    }

    const userId =
      typeof rawPayload.userId === "string" ? rawPayload.userId.trim() : "";
    const fullName =
      typeof rawPayload.fullName === "string" ? rawPayload.fullName.trim() : undefined;
    const email =
      typeof rawPayload.email === "string"
        ? rawPayload.email.trim().toLowerCase()
        : undefined;
    const role = typeof rawPayload.role === "string" ? rawPayload.role : undefined;
    const newPassword =
      typeof rawPayload.newPassword === "string" ? rawPayload.newPassword : undefined;

    if (!userId) {
      return jsonResponse(400, { error: "User ID is required" });
    }
    if (!UUID_RE.test(userId)) {
      return jsonResponse(400, { error: "Invalid user ID" });
    }
    if (
      fullName === undefined &&
      email === undefined &&
      role === undefined &&
      newPassword === undefined
    ) {
      return jsonResponse(400, { error: "No updates provided" });
    }
    if (fullName !== undefined && (fullName.length < 2 || fullName.length > MAX_FULL_NAME_LENGTH)) {
      return jsonResponse(400, { error: "Full name must be between 2 and 120 characters" });
    }
    if (email !== undefined && !EMAIL_RE.test(email)) {
      return jsonResponse(400, { error: "Invalid email" });
    }
    if (role !== undefined && !VALID_ROLES.has(role)) {
      return jsonResponse(400, { error: "Invalid role" });
    }
    if (
      newPassword !== undefined &&
      (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH)
    ) {
      return jsonResponse(400, {
        error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      });
    }

    // Prevenir que admin remova seu próprio role de admin
    if (userId === requestingUser.id && role && role !== 'admin') {
      return jsonResponse(400, { error: "Cannot remove your own admin role" });
    }

    // Verificar se está tentando alterar role de admin
    if (role) {
      const { data: targetUserRole } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      // Se está removendo último admin, bloquear
      if (targetUserRole?.role === 'admin' && role !== 'admin') {
        const { count } = await supabaseClient
          .from("user_roles")
          .select("id", { count: 'exact', head: true })
          .eq("role", "admin");

        if (count && count <= 1) {
          return jsonResponse(400, { error: "Cannot remove the last admin user" });
        }
      }
    }

    console.log(`Updating user: ${userId}`);

    // Atualizar dados de autenticação
    const authUpdates: Record<string, unknown> = {};
    if (email) authUpdates.email = email;
    if (newPassword) authUpdates.password = newPassword;
    if (fullName) {
      authUpdates.user_metadata = { full_name: fullName };
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authUpdateError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        authUpdates
      );

      if (authUpdateError) {
        console.error("Error updating auth user:", authUpdateError);
        throw new Error("Failed to update user authentication data");
      }
    }

    // Atualizar perfil de treinador se existir
    if (fullName) {
      const { data: profile } = await supabaseClient
        .from("trainer_profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (profile) {
        const { error: profileError } = await supabaseClient
          .from("trainer_profiles")
          .update({ full_name: fullName })
          .eq("id", userId);

        if (profileError) {
          console.error("Error updating trainer profile:", profileError);
        }
      }
    }

    // Atualizar role se fornecido
    if (role) {
      // Verificar se precisa criar/atualizar perfil de treinador
      const { data: currentRole } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      // Se está mudando para admin/moderator e não tem perfil de treinador
      if ((role === 'admin' || role === 'moderator') && currentRole?.role === 'user') {
        const { data: profile } = await supabaseClient
          .from("trainer_profiles")
          .select("id")
          .eq("id", userId)
          .single();

        if (!profile) {
          await supabaseClient
            .from("trainer_profiles")
            .insert({
              id: userId,
              full_name: fullName || "Sem nome",
            });
        }
      }

      const { error: roleUpdateError } = await supabaseClient
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (roleUpdateError) {
        console.error("Error updating user role:", roleUpdateError);
        throw new Error("Failed to update user role");
      }

      console.log(`User role updated to: ${role} for ${userId}`);
    }

    return jsonResponse(200, {
      success: true,
      message: "User updated successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in admin-update-user:", error);
    return jsonResponse(500, { error: message });
  }
});
