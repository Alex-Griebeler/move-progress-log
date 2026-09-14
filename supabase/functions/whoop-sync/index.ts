import {syncContext,mirrorLogger} from '../_shared/wearableMirror/locks.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateServiceRoleOrUserRole } from '../_shared/auth.ts';
import { getAccessToken } from '../_shared/wearable/tokens.ts';
import { RateLimited, errorMessage, fetchCollectionsReal, syncStudent } from './sync.ts';
import { ensureAccessToken, validateWindow } from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { headers: jsonHeaders, status });
}

Deno.serve(async (req) => {
  const console = mirrorLogger;
  let mirrorSync: ReturnType<typeof syncContext> | undefined;
  let studentIdForLock = '';
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await authenticateServiceRoleOrUserRole(req, {
      corsHeaders,
      allowedRoles: ['admin'],
      missingAuthMessage: 'Missing or invalid authorization header',
      invalidTokenMessage: 'Invalid or expired token',
      forbiddenMessage: 'Admin privileges required for this operation',
    });
    if (authResult instanceof Response) return authResult;
    const { supabaseUrl, supabaseServiceKey } = authResult;

    let body: Record<string, unknown> = {};
    const raw = await req.text();
    if (raw.trim().length > 0) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
      } catch {
        return jsonResponse({ error: 'Malformed JSON body' }, 400);
      }
    }

    const student_id = typeof body.student_id === 'string' ? body.student_id.trim() : '';
    if (!student_id || !UUID_RE.test(student_id)) return jsonResponse({ error: 'student_id inválido' }, 400);

    const window = validateWindow(body);
    if ('error' in window) return jsonResponse({ error: window.error }, 400);

    mirrorSync = syncContext(supabaseUrl, supabaseServiceKey);
    const supa = mirrorSync.db;
    studentIdForLock = student_id;
    await mirrorSync.acquire(`collect:whoop:${student_id}`);
    await mirrorSync.acquire(`oauth:whoop:${student_id}`);

    const { data: conn, error: connErr } = await supa
      .from('whoop_connections')
      .select('token_expires_at, is_active')
      .eq('student_id', student_id)
      .maybeSingle();
    if (connErr || !conn) return jsonResponse({ error: 'Nenhuma conexão Whoop encontrada' }, 404);
    if (!conn.is_active) return jsonResponse({ error: 'Conexão Whoop inativa' }, 409);

    const currentAccessToken = await getAccessToken(supa, 'whoop', student_id);
    const refresh = await ensureAccessToken(
      { supa },
      { student_id, tokenExpiresAt: (conn.token_expires_at as string | null) ?? null, currentAccessToken },
    );
    if (!refresh.ok) {
      if (refresh.status === 429) {
        const seconds=refresh.retryAfter ?? 60;
        await mirrorSync.block(seconds);
        return new Response(JSON.stringify({error:'rate_limited'}),{status:429,headers:{...jsonHeaders,'Retry-After':String(seconds)}});
      }
      return jsonResponse({error:refresh.error,permanent:refresh.permanent},refresh.status);
    }

    try {
      await mirrorSync.release(`oauth:whoop:${student_id}`);
    } catch (_releaseError) {
      // Tokens já gravados: segue a coleta; o finally close() tenta de novo e o lease vence sozinho.
    }
    const result = await syncStudent(
      { supa, fetchCollections: (t,s,e) => fetchCollectionsReal(t,s,e,mirrorSync!.remainingSignal()) },
      { student_id, start: window.start, end: window.end, accessToken: refresh.accessToken },
    );
    await supa.from('whoop_connections').update({ last_sync_at: new Date().toISOString() }).eq('student_id', student_id);

    return jsonResponse({ success: true, ...result });
  } catch (error) {
    if (error instanceof RateLimited) {
      // Limite de dados bloqueia só a coleta do cliente; a reconexão OAuth continua possível.
      if (studentIdForLock) await mirrorSync?.block(error.seconds, `collect:whoop:${studentIdForLock}`);
      return new Response(JSON.stringify({error:'rate_limited'}),{status:429,headers:{...jsonHeaders,'Retry-After':String(error.seconds)}});
    }
    const code = error instanceof Error ? error.message : '';
    if (code === 'sync_busy') return jsonResponse({ error: 'sync_busy' }, 423);
    if (code === 'sync_blocked') {
      const retryAfter = String((error as { retryAfter?: number }).retryAfter ?? 60);
      return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { ...jsonHeaders, 'Retry-After': retryAfter } });
    }
    return jsonResponse({ error: 'sync_unavailable' }, 500);
  } finally { await mirrorSync?.close(); }
});

