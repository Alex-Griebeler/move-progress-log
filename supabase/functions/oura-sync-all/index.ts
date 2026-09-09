import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateServiceRoleOrUserRole } from '../_shared/auth.ts';
import { lookbackDates, todayInSaoPaulo } from '../oura-sync/lib.ts';

/**
 * Janela retroativa padrão: hoje, ontem e anteontem. O Oura finaliza scores ao
 * longo do dia e a aluna sincroniza o anel quando quer — só buscar "hoje"
 * deixava lacunas permanentes (dia que ficou pronto depois da última execução
 * nunca era rebuscado). O upsert preserva valores já gravados.
 */
const DEFAULT_LOOKBACK_DAYS = 2;
const MAX_LOOKBACK_DAYS = 6;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SyncResult {
  student_id: string;
  student_name: string;
  date: string;
  status: 'success' | 'failed';
  attempt: number;
  error?: string;
  metrics_synced?: Record<string, unknown>;
  /** no_data | partial | complete (vem do oura-sync); ausente em falha */
  outcome?: string;
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
    const lookbackRaw = Number(body.lookback_days);
    const lookbackDays = Number.isInteger(lookbackRaw)
      ? Math.min(MAX_LOOKBACK_DAYS, Math.max(0, lookbackRaw))
      : DEFAULT_LOOKBACK_DAYS;

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

    // OA-04: data de hoje em America/Sao_Paulo + janela retroativa
    const dates = lookbackDates(todayInSaoPaulo(), lookbackDays);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          message: `Dry-run OK: ${connections.length} active Oura connections ready for sync`,
          total_connections: connections.length,
          dates,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${connections.length} students with active Oura connections; dates: ${dates.join(', ')}`);

    const results: SyncResult[] = [];

    // OA-02: Process in parallel with concurrency limit of 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < connections.length; i += BATCH_SIZE) {
      const batch = connections.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (connection) => {
          const studentId = connection.student_id;
          const studentName = ((connection as Record<string, unknown>).students as Record<string, unknown>)?.name as string || 'Unknown';
          const studentResults: SyncResult[] = [];

          // Datas em SEQUÊNCIA por aluna (evita refresh concorrente do mesmo token
          // e mantém ~10 chamadas em voo por aluna, como antes).
          for (const dateStr of dates) {
            let lastError = '';
            let settled: SyncResult | null = null;

            // Orçamento de tempo: 3 tentativas só para HOJE; dias anteriores
            // ganham 2 (o cron seguinte os revisita). Pior caso por aluna
            // ≈ 3×15s + 2×(2×15s) + backoff ≈ 110s, abaixo do idle timeout
            // de 150s da edge function.
            const maxAttempts = dateStr === dates[0] ? 3 : 2;
            for (let attempt = 1; attempt <= maxAttempts && !settled; attempt++) {
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

                const outcome =
                  syncData && typeof syncData === 'object' && typeof (syncData as Record<string, unknown>).outcome === 'string'
                    ? ((syncData as Record<string, unknown>).outcome as string)
                    : undefined;

                // `status` continua sendo o sucesso TÉCNICO da chamada (CHECK da
                // tabela: success/failed/retrying); o resultado de dados fica em
                // metrics_synced.outcome (no_data | partial | complete).
                await supabase.from('oura_sync_logs').insert({
                  student_id: studentId, sync_date: dateStr, status: 'success',
                  attempt_number: attempt, metrics_synced: syncData
                });

                settled = { student_id: studentId, student_name: studentName, date: dateStr, status: 'success', attempt, metrics_synced: syncData, outcome };
              } catch (error) {
                lastError = (error as Error).message || String(error);
                if (attempt === maxAttempts) {
                  await supabase.from('oura_sync_logs').insert({
                    student_id: studentId, sync_date: dateStr, status: 'failed',
                    attempt_number: attempt, error_message: lastError
                  });
                  settled = { student_id: studentId, student_name: studentName, date: dateStr, status: 'failed', attempt, error: lastError };
                } else {
                  await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
              }
            }

            studentResults.push(
              settled ?? { student_id: studentId, student_name: studentName, date: dateStr, status: 'failed', attempt: maxAttempts, error: lastError },
            );
          }

          return studentResults;
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(...(result.value as SyncResult[]));
        }
      }
    }

    // Contagens por PAR (aluna, data)…
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const noDataCount = results.filter(r => r.status === 'success' && r.outcome === 'no_data').length;
    const withDataCount = results.filter(r => r.status === 'success' && r.outcome && r.outcome !== 'no_data').length;
    // …e por ALUNA (o que a UI mostra): falhou se qualquer data falhou; tem
    // dado se qualquer data trouxe dado.
    const byStudent = new Map<string, { failed: boolean; withData: boolean }>();
    for (const r of results) {
      const agg = byStudent.get(r.student_id) ?? { failed: false, withData: false };
      if (r.status === 'failed') agg.failed = true;
      if (r.status === 'success' && r.outcome && r.outcome !== 'no_data') agg.withData = true;
      byStudent.set(r.student_id, agg);
    }
    const studentsFailed = Array.from(byStudent.values()).filter(a => a.failed).length;
    const studentsOk = byStudent.size - studentsFailed;
    const studentsWithData = Array.from(byStudent.values()).filter(a => a.withData).length;

    return new Response(
      JSON.stringify({
        message: `Sync completed: ${studentsOk}/${byStudent.size} students ok (${studentsWithData} with data); pairs: ${successCount} success (${withDataCount} with data, ${noDataCount} no data), ${failedCount} failed`,
        total: results.length,
        dates,
        students_total: byStudent.size,
        students_ok: studentsOk,
        students_failed: studentsFailed,
        students_with_data: studentsWithData,
        success: successCount,
        with_data: withDataCount,
        no_data: noDataCount,
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
