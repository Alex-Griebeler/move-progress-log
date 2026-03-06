import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'moderator' | 'user';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);

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
      throw new Error("Only admins can create users");
    }

    const { email, password, fullName, role }: CreateUserRequest = await req.json();

    // Validações
    if (!email || !password || !fullName || !role) {
      throw new Error("Missing required fields");
    }

    if (!['admin', 'moderator', 'user'].includes(role)) {
      throw new Error("Invalid role");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
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

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: fullName,
          role: role,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in admin-create-user:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.message === "Unauthorized" || error.message === "Only admins can create users" ? 403 : 400,
      }
    );
  }
});
