import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateServiceRoleOrUserRole } from '../_shared/auth.ts';
import { buildWorkPlan, hasBudgetFor, lookbackDates, todayInSaoPaulo } from '../oura-sync/lib.ts';

/**
 * Janela retroativa padrão: hoje, ontem e anteontem. O Oura finaliza scores ao
 * longo do dia e a aluna sincroniza o anel quando quer — só buscar "hoje"
 * deixava lacunas permanentes (dia que ficou pronto depois da última execução
 * nunca era rebuscado). O upsert preserva valores já gravados.
 */
const DEFAULT_LOOKBACK_DAYS = 2;
const MAX_LOOKBACK_DAYS = 6;
/**
 * Orçamento GLOBAL da execução: a edge function tem idle timeout de 150 s
 * (Supabase, qualquer plano). Cada passo (lote de até 5 alunas × 1 data) é
 * estimado no pior caso; passos que não cabem são PULADOS (status 'skipped',
 * sem log) e devolvidos como `truncated` — o cron seguinte os revisita. A
 * ordem do plano garante que "hoje" de todas as alunas vem antes de "ontem".
 */
const EXECUTION_BUDGET_MS = 110_000;
const STEP_ESTIMATE_MS = 35_000; // pior caso de um lote: 2 tentativas × 15 s + backoff + I/O

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SyncResult {
  student_id: string;
  student_name: string;
  date: string;
  status: 'success' | 'failed' | 'skipped';
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
    const startedAt = Date.now();
    const deadline = startedAt + EXECUTION_BUDGET_MS;
    let truncated = false;

    // OA-02: lotes de 5 alunas em paralelo; data mais recente primeiro para
    // TODAS as alunas. Cada aluna nunca tem duas datas em voo ao mesmo tempo
    // (um lote termina antes do próximo começar) — sem refresh concorrente
    // do token OAuth.
    const BATCH_SIZE = 5;
    const plan = buildWorkPlan(dates, connections, BATCH_SIZE);

    for (const step of plan) {
      const dateStr = step.date;
      if (!hasBudgetFor(Date.now(), deadline, STEP_ESTIMATE_MS)) {
        truncated = true;
        for (const connection of step.items) {
          results.push({
            student_id: connection.student_id,
            student_name: ((connection as Record<string, unknown>).students as Record<string, unknown>)?.name as string || 'Unknown',
            date: dateStr,
            status: 'skipped',
            attempt: 0,
            error: 'Orçamento de tempo da execução esgotado; o próximo cron revisita esta data.',
          });
        }
        continue;
      }

      // Orçamento por par: 3 tentativas só para HOJE; dias anteriores ganham 2.
      const maxAttempts = dateStr === dates[0] ? 3 : 2;

      const batchResults = await Promise.allSettled(
        step.items.map(async (connection): Promise<SyncResult> => {
          const studentId = connection.student_id;
          const studentName = ((connection as Record<string, unknown>).students as Record<string, unknown>)?.name as string || 'Unknown';
          let lastError = '';

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              if (attempt > 1) {
                const { error: retryLogError } = await supabase.from('oura_sync_logs').insert({
                  student_id: studentId, sync_date: dateStr, status: 'retrying',
                  attempt_number: attempt, error_message: lastError
                });
                if (retryLogError) console.warn('oura_sync_logs (retrying) insert failed:', retryLogError.message);
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
              const { error: successLogError } = await supabase.from('oura_sync_logs').insert({
                student_id: studentId, sync_date: dateStr, status: 'success',
                attempt_number: attempt, metrics_synced: syncData
              });
              if (successLogError) console.warn('oura_sync_logs (success) insert failed:', successLogError.message);

              return { student_id: studentId, student_name: studentName, date: dateStr, status: 'success', attempt, metrics_synced: syncData, outcome };
            } catch (error) {
              lastError = (error as Error).message || String(error);
              if (attempt === maxAttempts) {
                const { error: failedLogError } = await supabase.from('oura_sync_logs').insert({
                  student_id: studentId, sync_date: dateStr, status: 'failed',
                  attempt_number: attempt, error_message: lastError
                });
                if (failedLogError) console.warn('oura_sync_logs (failed) insert failed:', failedLogError.message);
                return { student_id: studentId, student_name: studentName, date: dateStr, status: 'failed', attempt, error: lastError };
              }
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
          return { student_id: studentId, student_name: studentName, date: dateStr, status: 'failed', attempt: maxAttempts, error: lastError };
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('oura-sync-all: unexpected rejection in batch:', result.reason);
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
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    return new Response(
      JSON.stringify({
        message: `Sync completed: ${studentsOk}/${byStudent.size} students ok (${studentsWithData} with data); pairs: ${successCount} success (${withDataCount} with data, ${noDataCount} no data), ${failedCount} failed, ${skippedCount} skipped${truncated ? ' (time budget)' : ''}`,
        total: results.length,
        dates,
        truncated,
        skipped: skippedCount,
        elapsed_ms: Date.now() - startedAt,
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
