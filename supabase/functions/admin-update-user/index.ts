import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UpdateUserRequest {
  userId: string;
  fullName?: string;
  email?: string;
  role?: 'admin' | 'moderator' | 'user';
  newPassword?: string;
}

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
    if (!authHeader) {
      throw new Error("Authorization header missing");
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user: requestingUser }, error: authError } = await authClient.auth.getUser();

    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Verificar se o usuário é admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      throw new Error("Only admins can update users");
    }

    const { userId, fullName, email, role, newPassword }: UpdateUserRequest = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Prevenir que admin remova seu próprio role de admin
    if (userId === requestingUser.id && role && role !== 'admin') {
      throw new Error("Cannot remove your own admin role");
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
          .select("*", { count: 'exact', head: true })
          .eq("role", "admin");

        if (count && count <= 1) {
          throw new Error("Cannot remove the last admin user");
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "User updated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in admin-update-user:", error);
    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: message.includes("Unauthorized") || message.includes("Only admins") ? 403 : 400,
      }
    );
  }
});
