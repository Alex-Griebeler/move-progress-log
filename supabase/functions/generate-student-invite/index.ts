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
const DEFAULT_EXPIRY_DAYS = 7;
const MIN_EXPIRY_DAYS = 1;
const MAX_EXPIRY_DAYS = 30;
const LOVABLE_PREVIEW_SUFFIX = '.lovable.app';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function clampInviteExpiry(rawValue: unknown) {
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    return DEFAULT_EXPIRY_DAYS;
  }

  return Math.min(MAX_EXPIRY_DAYS, Math.max(MIN_EXPIRY_DAYS, Math.trunc(rawValue)));
}

function normalizeInviteEmail(rawValue: unknown) {
  if (rawValue === undefined || rawValue === null) return null;
  if (typeof rawValue !== 'string') {
    throw new Error('E-mail inválido');
  }

  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) return null;
  if (!emailPattern.test(normalized)) {
    throw new Error('E-mail inválido');
  }

  return normalized;
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

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const expiresInDays = clampInviteExpiry(body?.expires_in_days);
    let email: string | null;

    try {
      email = normalizeInviteEmail(body?.email);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Dados inválidos';
      return jsonResponse({ error: message }, 400);
    }

    console.log(`Generating invite, expires in ${expiresInDays} days`);

    // Generate unique token
    const invite_token = crypto.randomUUID();

    // Calculate expiration date
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expiresInDays);

    // Insert invite
    const { data: invite, error: insertError } = await supabaseClient
      .from('student_invites')
      .insert({
        trainer_id: user.id,
        invite_token,
        email,
        expires_at: expires_at.toISOString(),
      })
      .select('id, expires_at')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return jsonResponse({ error: insertError.message }, 400);
    }

    // Prefer trusted frontend origins instead of blindly trusting request headers.
    const baseUrl = resolveFrontendUrl(req);
    const invite_url = `${baseUrl}/onboarding/${invite_token}`;

    console.log('Invite generated successfully');

    return jsonResponse({
      invite_url,
      expires_at: invite.expires_at,
      token: invite_token,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generate-student-invite:', error);
    return jsonResponse({ error: message }, 500);
  }
});
