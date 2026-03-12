import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Decode JWT payload without verification */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Bootstrap guard: only runs when explicitly enabled ---
    const bootstrapEnabled = Deno.env.get('ENABLE_AUDIT_ADMIN_BOOTSTRAP');
    if (bootstrapEnabled !== 'true') {
      return new Response(
        JSON.stringify({ error: 'Bootstrap disabled. Set ENABLE_AUDIT_ADMIN_BOOTSTRAP=true to enable.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Authentication: require service_role ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = decodeJwtPayload(token);

    if (!jwtPayload || jwtPayload.role !== 'service_role') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: service_role required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { adminKey } = await req.json();

    // Validar chave de segurança
    const expectedKey = Deno.env.get('ADMIN_CREATION_KEY');
    if (!expectedKey || adminKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid admin creation key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar usuário de auditoria
    const email = 'auditoria@adapta.ai';
    const password = crypto.randomUUID();

    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Adapta One 26 (Audit AI)',
        role: 'audit_admin'
      }
    });

    if (createError) {
      console.error('[create-audit-admin] User creation failed');
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar perfil de trainer
    const { error: profileError } = await supabaseAdmin
      .from('trainer_profiles')
      .insert({ id: user.user.id, full_name: 'Adapta One 26 (Audit AI)' });

    if (profileError) {
      console.error('[create-audit-admin] Profile creation failed');
    }

    // Atribuir role de admin
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: user.user.id, role: 'admin' });

    if (roleError) {
      console.error('[create-audit-admin] Role assignment failed');
      return new Response(
        JSON.stringify({ error: 'Failed to assign admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: No credentials, passwords, or tokens in logs or response
    console.log('[create-audit-admin] Audit admin provisioned successfully');

    return new Response(
      JSON.stringify({
        success: true,
        created: true,
        userId: user.user.id,
        email,
        message: 'Conta de auditoria criada. Utilize o painel de administração para gerenciar credenciais.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-audit-admin] Unexpected error');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
