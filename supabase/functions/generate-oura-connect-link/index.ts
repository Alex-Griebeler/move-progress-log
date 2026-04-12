import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
const LOVABLE_PREVIEW_SUFFIX = '.lovable.app';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { headers: jsonHeaders, status });
}

function toOrigin(rawUrl: string | null) {
  if (!rawUrl) return null;

  try {
    return new URL(rawUrl).origin;
  } catch (_error) {
    return null;
  }
}

function resolveFrontendUrl(req: Request) {
  const siteUrlOrigin = toOrigin(Deno.env.get('SITE_URL') ?? null);
  const requestOrigins = [
    toOrigin(req.headers.get('origin')),
    toOrigin(req.headers.get('referer')),
  ].filter((origin): origin is string => Boolean(origin));

  const isTrustedOrigin = (origin: string) => {
    if (siteUrlOrigin && origin === siteUrlOrigin) return true;

    return (
      origin.endsWith(LOVABLE_PREVIEW_SUFFIX) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('https://localhost:')
    );
  };

  for (const origin of requestOrigins) {
    if (isTrustedOrigin(origin)) return origin;
  }

  return siteUrlOrigin ?? DEFAULT_FRONTEND_URL;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse({ error: 'Payload inválido' }, 400);
    }

    const payload = body as Record<string, unknown>;
    const student_id = typeof payload.student_id === 'string' ? payload.student_id.trim() : '';

    if (!student_id) {
      return jsonResponse({ error: 'student_id é obrigatório' }, 400);
    }
    if (!UUID_RE.test(student_id)) {
      return jsonResponse({ error: 'student_id inválido' }, 400);
    }

    // Verify trainer owns this student
    const { data: student, error: studentError } = await supabaseClient
      .from('students')
      .select('id, name')
      .eq('id', student_id)
      .single();

    if (studentError || !student) {
      return jsonResponse({ error: 'Aluno não encontrado' }, 404);
    }

    // Check if already connected
    const { data: existingConnection, error: existingConnectionError } = await supabaseClient
      .from('oura_connections')
      .select('id, is_active')
      .eq('student_id', student_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (existingConnectionError) {
      console.error('Failed to verify existing Oura connection:', existingConnectionError);
      return jsonResponse({ error: 'Falha ao verificar conexão Oura atual' }, 500);
    }

    if (existingConnection?.is_active) {
      return jsonResponse({ error: 'Aluno já possui Oura Ring conectado' }, 400);
    }

    // Generate token and create invite entry (reusing student_invites with oura_connect marker)
    const invite_token = crypto.randomUUID();
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7);

    const { data: invite, error: insertError } = await supabaseClient
      .from('student_invites')
      .insert({
        trainer_id: user.id,
        invite_token,
        email: '__oura_connect__',
        expires_at: expires_at.toISOString(),
        created_student_id: student_id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return jsonResponse({ error: insertError.message }, 400);
    }

    // Use a trusted frontend origin instead of reflecting arbitrary request headers.
    const baseUrl = resolveFrontendUrl(req);
    const invite_url = `${baseUrl}/oura-connect/${invite_token}`;

    console.log('Oura connect link generated for student');

    return jsonResponse({
      invite_url,
      expires_at: invite.expires_at,
      student_name: student.name,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generate-oura-connect-link:', error);
    return jsonResponse({ error: message }, 500);
  }
});
