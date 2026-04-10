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
      return jsonResponse(403, { error: "Only admins can create users" });
    }

    const rawPayload = await req.json().catch(() => null);
    if (!isPlainObject(rawPayload)) {
      return jsonResponse(400, { error: "Invalid request body" });
    }

    const email =
      typeof rawPayload.email === "string" ? rawPayload.email.trim().toLowerCase() : "";
    const password = typeof rawPayload.password === "string" ? rawPayload.password : "";
    const fullName =
      typeof rawPayload.fullName === "string" ? rawPayload.fullName.trim() : "";
    const role = typeof rawPayload.role === "string" ? rawPayload.role : "";

    if (!email || !password || !fullName || !role) {
      return jsonResponse(400, { error: "Missing required fields" });
    }

    if (!EMAIL_RE.test(email)) {
      return jsonResponse(400, { error: "Invalid email" });
    }

    if (fullName.length < 2 || fullName.length > MAX_FULL_NAME_LENGTH) {
      return jsonResponse(400, { error: "Full name must be between 2 and 120 characters" });
    }

    if (!VALID_ROLES.has(role)) {
      return jsonResponse(400, { error: "Invalid role" });
    }

    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      return jsonResponse(400, {
        error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      });
    }

    console.log(`Creating user: ${email} with role: ${role}`);

    // Criar usuário na autenticação
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      console.error("Error creating auth user:", createError);
      throw createError;
    }

    if (!newUser.user) {
      throw new Error("Failed to create user");
    }

    console.log(`Auth user created: ${newUser.user.id}`);

    // Criar perfil de treinador (para admin e moderator)
    if (role === 'admin' || role === 'moderator') {
      const { error: profileError } = await supabaseClient
        .from("trainer_profiles")
        .upsert({
          id: newUser.user.id,
          full_name: fullName,
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error("Error creating trainer profile:", profileError);
        // Tentar deletar o usuário criado
        await supabaseClient.auth.admin.deleteUser(newUser.user.id);
        throw new Error("Failed to create trainer profile");
      }

      console.log(`Trainer profile created for: ${newUser.user.id}`);
    }

    // Criar role
    const { error: roleInsertError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: role,
      });

    if (roleInsertError) {
      console.error("Error creating user role:", roleInsertError);
      // Tentar deletar o usuário e perfil criados
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      if (role === 'admin' || role === 'moderator') {
        await supabaseClient
          .from("trainer_profiles")
          .delete()
          .eq("id", newUser.user.id);
      }
      throw new Error("Failed to create user role");
    }

    console.log(`User role assigned: ${role} for ${newUser.user.id}`);

    return jsonResponse(200, {
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name: fullName,
        role: role,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in admin-create-user:", error);
    const status =
      message.includes("already been registered") || message.includes("already exists")
        ? 409
        : 500;
    return jsonResponse(status, { error: message });
  }
});
