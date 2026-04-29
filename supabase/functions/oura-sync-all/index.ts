import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateServiceRoleOrUserRole } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SyncResult {
  student_id: string;
  student_name: string;
  status: 'success' | 'failed';
  attempt: number;
  error?: string;
  metrics_synced?: Record<string, unknown>;
}

Deno.serve(async (req) => {
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

    if (authResult instanceof Response) {
      return authResult;
    }

    const { supabaseUrl, supabaseServiceKey: supabaseKey, isServiceRole, userId } = authResult;

    if (isServiceRole) {
      console.log('Service role initiated Oura sync for all students');
    } else {
      console.log(`Admin ${userId} initiated Oura sync for all students`);
    }

    let body: Record<string, unknown> = {};
    const rawBody = await req.text();
    if (rawBody.trim().length > 0) {
      try {
        const parsed = JSON.parse(rawBody);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          body = parsed as Record<string, unknown>;
        } else {
          return new Response(
            JSON.stringify({ error: 'Invalid JSON body' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Malformed JSON body' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    const dryRun =
      body.dry_run === true ||
      (typeof body.dry_run === 'string' && body.dry_run.toLowerCase() === 'true');

    // --- Sync Logic ---
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all students with active Oura connections
    const { data: connections, error: connectionsError } = await supabase
      .from('oura_connections')
      .select(`
        id,
        student_id,
        students (
          id,
          name
        )
      `)
      .eq('is_active', true);

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      throw connectionsError;
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active Oura connections found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          message: `Dry-run OK: ${connections.length} active Oura connections ready for sync`,
          total_connections: connections.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${connections.length} students with active Oura connections`);

    // OA-04: Use Intl.DateTimeFormat for consistent Brazil date calculation
    const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());

    const results: SyncResult[] = [];

    // OA-02: Process in parallel with concurrency limit of 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < connections.length; i += BATCH_SIZE) {
      const batch = connections.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (connection) => {
          const studentId = connection.student_id;
          const studentName = ((connection as Record<string, unknown>).students as Record<string, unknown>)?.name as string || 'Unknown';
          let lastError = '';

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              if (attempt > 1) {
                await supabase.from('oura_sync_logs').insert({
                  student_id: studentId, sync_date: dateStr, status: 'retrying',
                  attempt_number: attempt, error_message: lastError
                });
              }

              // OA-01: Pass service role key as Authorization header
              const { data: syncData, error: syncError } = await supabase.functions.invoke('oura-sync', {
                body: { student_id: studentId, date: dateStr, force_sync: true },
                headers: { Authorization: `Bearer ${supabaseKey}` }
              });

              if (syncError) throw syncError;

              await supabase.from('oura_sync_logs').insert({
                student_id: studentId, sync_date: dateStr, status: 'success',
                attempt_number: attempt, metrics_synced: syncData
              });

              return { student_id: studentId, student_name: studentName, status: 'success' as const, attempt, metrics_synced: syncData };
            } catch (error) {
              lastError = (error as Error).message || String(error);
              if (attempt === 3) {
                await supabase.from('oura_sync_logs').insert({
                  student_id: studentId, sync_date: dateStr, status: 'failed',
                  attempt_number: attempt, error_message: lastError
                });
                return { student_id: studentId, student_name: studentName, status: 'failed' as const, attempt: 3, error: lastError };
              }
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
          return { student_id: studentId, student_name: studentName, status: 'failed' as const, attempt: 3, error: lastError };
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value as SyncResult);
        }
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return new Response(
      JSON.stringify({
        message: `Sync completed: ${successCount} success, ${failedCount} failed`,
        total: results.length,
        success: successCount,
        failed: failedCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in oura-sync-all:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
