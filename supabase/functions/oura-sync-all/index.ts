import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateServiceRoleOrUserRole } from '../_shared/auth.ts';
import { buildWorkPlan, hasBudgetFor, lookbackDates, todayInSaoPaulo } from '../oura-sync/lib.ts';

/**
 * Janela retroativa padrão: hoje, ontem e anteontem. O Oura finaliza scores ao
 * longo do dia e a aluna sincroniza o anel quando quer — só buscar "hoje"
 * deixava lacunas permanentes (dia que ficou pronto depois da última execução
 * nunca era rebuscado). O upsert preserva valores já gravados. Não há cursor
 * entre execuções: cada uma recomeça por "hoje".
 */
const DEFAULT_LOOKBACK_DAYS = 2;
const MAX_LOOKBACK_DAYS = 6;
/**
 * Orçamento GLOBAL da execução: a edge function tem idle timeout de 150 s
 * (Supabase, qualquer plano). Cada passo (lote de até 5 alunas × 1 data) é
 * estimado no pior caso; passos que não cabem são PULADOS (status 'skipped',
 * sem log) e devolvidos como `truncated`. Sem cursor entre execuções, uma
 * execução futura pode ou não alcançá-los. A ordem do plano prioriza "hoje"
 * de todas as alunas antes de "ontem".
 */
const EXECUTION_BUDGET_MS = 100_000;
/**
 * Pior caso de UMA tentativa do oura-sync: refresh OAuth (≤15 s, com signal)
 * + 10 chamadas em paralelo (≤15 s cada, com signal) + banco/logs.
 * Nenhuma tentativa começa sem este saldo; logo a última termina ≈ no prazo.
 */
const ATTEMPT_ESTIMATE_MS = 32_000;
/** Reserva para agregar, logar e responder depois da última espera. */
const RESPONSE_RESERVE_MS = 5_000;

/** Espera LIMITADA (não cancela a operação; garante que o chamador não fica preso). */
const boundedWait = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), Math.max(0, ms))),
  ]);

const DB_TIMEOUT_MS = 8_000;

/**
 * Chamada ao oura-sync com PRAZO EFETIVO: a espera é cancelada (AbortSignal)
 * quando o saldo do orçamento acaba — o chamador nunca fica pendurado além
 * do deadline. A execução filha pode continuar e gravar; isso é aceito e
 * fica registrado como falha por orçamento nesta execução.
 */
async function invokeOuraSyncWithDeadline(
  supabaseUrl: string,
  serviceKey: string,
  body: Record<string, unknown>,
  deadline: number,
): Promise<{ data: unknown; error: Error | null }> {
  const remaining = deadline - Date.now() - RESPONSE_RESERVE_MS;
  if (remaining <= 0) {
    return { data: null, error: new Error('Orçamento de tempo esgotado antes da chamada') };
  }
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/oura-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(remaining),
    });
    const text = await res.text();
    let parsed: unknown = null;
    let parseFailed = false;
    try { parsed = text ? JSON.parse(text) : null; } catch { parseFailed = true; }
    if (!res.ok) {
      const rec = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
      const message =
        typeof rec?.error === 'string' ? (rec.error as string)
        : typeof rec?.message === 'string' ? (rec.message as string)
        : text ? `oura-sync respondeu HTTP ${res.status}: ${text.slice(0, 200)}`
        : `oura-sync respondeu HTTP ${res.status}`;
      return { data: parsed, error: new Error(message) };
    }
    if (parseFailed || parsed === null || typeof parsed !== 'object') {
      return { data: null, error: new Error('oura-sync respondeu 2xx sem JSON válido') };
    }
    return { data: parsed, error: null };
  } catch (error) {
    const err = error as Error;
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return { data: null, error: new Error(timedOut ? 'Orçamento de tempo esgotado durante a chamada ao oura-sync' : err?.message || String(error)) };
  }
}

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

  // Relógio do orçamento começa na ENTRADA (autenticação e consultas contam).
  const startedAt = Date.now();
  const deadline = startedAt + EXECUTION_BUDGET_MS;

  try {
    // Auth (getUser + user_roles para JWT de admin) com espera limitada.
    const authResult = await boundedWait(
      authenticateServiceRoleOrUserRole(req, {
        corsHeaders,
        allowedRoles: ['admin'],
        missingAuthMessage: 'Missing or invalid authorization header',
        invalidTokenMessage: 'Invalid or expired token',
        forbiddenMessage: 'Admin privileges required for this operation',
      }),
      20_000,
      'auth',
    );

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
    const rawBody = await boundedWait(req.text(), 5_000, 'request body');
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
      .eq('is_active', true)
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));

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
    let truncated = false;

    /** Insert de log com teto e sem poder travar o fluxo (falha vira warn). */
    const writeLog = async (row: Record<string, unknown>, label: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('oura_sync_logs')
          .insert(row)
          .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
        if (error) console.warn(`oura_sync_logs (${label}) insert failed:`, error.message);
      } catch (error) {
        console.warn(`oura_sync_logs (${label}) insert threw:`, (error as Error).message);
      }
    };

    // OA-02: lotes de 5 alunas em paralelo; data mais recente primeiro para
    // TODAS as alunas. Cada aluna nunca tem duas datas em voo ao mesmo tempo
    // (um lote termina antes do próximo começar) — sem refresh concorrente
    // do token OAuth.
    const BATCH_SIZE = 5;
    const plan = buildWorkPlan(dates, connections, BATCH_SIZE);
    // Pares cuja primeira tentativa começou (para distinguir, no deadline,
    // "iniciado e ainda em voo" de "nunca iniciado").
    const started = new Set<string>();

    const runPlan = async (): Promise<void> => {
    for (const step of plan) {
      const dateStr = step.date;
      if (!hasBudgetFor(Date.now(), deadline, ATTEMPT_ESTIMATE_MS)) {
        truncated = true;
        for (const connection of step.items) {
          results.push({
            student_id: connection.student_id,
            student_name: ((connection as Record<string, unknown>).students as Record<string, unknown>)?.name as string || 'Unknown',
            date: dateStr,
            status: 'skipped',
            attempt: 0,
            error: 'Orçamento de tempo da execução esgotado nesta execução (sem cursor: uma execução futura pode ou não alcançar esta data).',
          });
        }
        continue;
      }

      // Orçamento por par: 3 tentativas só para HOJE; dias anteriores ganham 2.
      const maxAttempts = dateStr === dates[0] ? 3 : 2;

      // Cada par é PUBLICADO em `results` assim que conclui (não só ao fim do
      // lote): se a resposta sair no deadline com um par do lote ainda preso,
      // os já concluídos aparecem como o que são, não como 'skipped'.
      // O resultado TERMINAL é publicado ANTES de esperar o insert do log
      // (que pode levar até DB_TIMEOUT_MS): um par que concluiu a 94 s com
      // dados não pode virar 'skipped' porque o log demorou até o deadline.
      const publish = (r: SyncResult): SyncResult => {
        results.push(r);
        return r;
      };
      const batchResults = await Promise.allSettled(
        step.items.map(async (connection): Promise<SyncResult> => {
          const studentId = connection.student_id;
          const studentName = ((connection as Record<string, unknown>).students as Record<string, unknown>)?.name as string || 'Unknown';
          let lastError = '';
          started.add(`${studentId}|${dateStr}`);

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // Orçamento checado antes de CADA tentativa (não só do lote).
            if (!hasBudgetFor(Date.now(), deadline, ATTEMPT_ESTIMATE_MS)) {
              truncated = true;
              if (attempt === 1) {
                return publish({ student_id: studentId, student_name: studentName, date: dateStr, status: 'skipped', attempt: 0, error: 'Orçamento de tempo esgotado antes da primeira tentativa.' });
              }
              const budgetFailure = publish({ student_id: studentId, student_name: studentName, date: dateStr, status: 'failed', attempt: attempt - 1, error: `${lastError} (sem orçamento para nova tentativa)` });
              await writeLog({
                student_id: studentId, sync_date: dateStr, status: 'failed',
                attempt_number: attempt - 1, error_message: `${lastError} (sem orçamento para nova tentativa)`
              }, 'failed/budget');
              return budgetFailure;
            }
            try {
              if (attempt > 1) {
                await writeLog({
                  student_id: studentId, sync_date: dateStr, status: 'retrying',
                  attempt_number: attempt, error_message: lastError
                }, 'retrying');
              }

              // OA-01: service role key no Authorization; espera limitada ao
              // saldo do orçamento (cancela a espera, não a execução filha).
              const { data: syncData, error: syncError } = await invokeOuraSyncWithDeadline(
                supabaseUrl,
                supabaseKey,
                { student_id: studentId, date: dateStr, force_sync: true },
                deadline,
              );

              if (syncError) {
                if (syncError.message.includes('Orçamento de tempo')) truncated = true;
                throw syncError;
              }

              const syncRecord: Record<string, unknown> | undefined =
                syncData && typeof syncData === 'object' && !Array.isArray(syncData)
                  ? (syncData as Record<string, unknown>)
                  : undefined;
              const outcome = typeof syncRecord?.outcome === 'string' ? (syncRecord.outcome as string) : undefined;

              // `status` continua sendo o sucesso TÉCNICO da chamada (CHECK da
              // tabela: success/failed/retrying); o resultado de dados fica em
              // metrics_synced.outcome (no_data | partial | complete).
              const successResult = publish({ student_id: studentId, student_name: studentName, date: dateStr, status: 'success', attempt, metrics_synced: syncRecord, outcome });
              await writeLog({
                student_id: studentId, sync_date: dateStr, status: 'success',
                attempt_number: attempt, metrics_synced: syncRecord ?? null
              }, 'success');

              return successResult;
            } catch (error) {
              lastError = (error as Error).message || String(error);
              if (attempt === maxAttempts) {
                const finalFailure = publish({ student_id: studentId, student_name: studentName, date: dateStr, status: 'failed', attempt, error: lastError });
                await writeLog({
                  student_id: studentId, sync_date: dateStr, status: 'failed',
                  attempt_number: attempt, error_message: lastError
                }, 'failed');
                return finalFailure;
              }
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
          return publish({ student_id: studentId, student_name: studentName, date: dateStr, status: 'failed', attempt: maxAttempts, error: lastError });
        })
      );

      for (const result of batchResults) {
        if (result.status === 'rejected') {
          console.error('oura-sync-all: unexpected rejection in batch:', result.reason);
        }
      }
    }
    };

    // GARANTIA da resposta: o plano corre contra o relógio. Se qualquer espera
    // (filha, banco, log) ficar presa além do deadline, respondemos com o que
    // já foi agregado (`truncated`); pares não concluídos entram como
    // 'skipped' por orçamento. O que ainda estiver em voo pode terminar (ou
    // ser cortado pelo runtime) — os upserts são idempotentes; sem cursor, a
    // reconsulta dessas datas por uma execução futura não é garantida.
    const planSettled = await Promise.race([
      runPlan().then(() => true, (error) => { console.error('oura-sync-all: plan failed:', error); truncated = true; return false; }),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), Math.max(0, deadline - Date.now()))),
    ]);
    if (!planSettled) {
      truncated = true;
      const done = new Set(results.map((r) => `${r.student_id}|${r.date}`));
      for (const step of plan) {
        for (const connection of step.items) {
          const key = `${connection.student_id}|${step.date}`;
          if (done.has(key)) continue;
          // Só o que tem desfecho conhecido é success/failed; o resto é
          // 'skipped' — mas dizendo se chegou a iniciar (a chamada filha pode
          // ainda concluir e gravar; upsert idempotente).
          results.push({
            student_id: connection.student_id,
            student_name: ((connection as Record<string, unknown>).students as Record<string, unknown>)?.name as string || 'Unknown',
            date: step.date,
            status: 'skipped',
            attempt: 0,
            error: started.has(key)
              ? 'Execução respondeu no deadline com este par INICIADO e ainda sem desfecho (a chamada filha pode concluir por conta própria).'
              : 'Execução respondeu no deadline antes de iniciar este par.',
          });
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
    // …e por ALUNA: falhou se qualquer data falhou; INCOMPLETA se alguma data
    // foi pulada por orçamento (não é OK nem falha); OK = todas as datas
    // consultadas sem falha; tem dado se qualquer data trouxe dado.
    const byStudent = new Map<string, { failed: boolean; skipped: boolean; withData: boolean }>();
    for (const r of results) {
      const agg = byStudent.get(r.student_id) ?? { failed: false, skipped: false, withData: false };
      if (r.status === 'failed') agg.failed = true;
      if (r.status === 'skipped') agg.skipped = true;
      if (r.status === 'success' && r.outcome && r.outcome !== 'no_data') agg.withData = true;
      byStudent.set(r.student_id, agg);
    }
    const studentsFailed = Array.from(byStudent.values()).filter(a => a.failed).length;
    const studentsIncomplete = Array.from(byStudent.values()).filter(a => !a.failed && a.skipped).length;
    const studentsOk = byStudent.size - studentsFailed - studentsIncomplete;
    const studentsWithData = Array.from(byStudent.values()).filter(a => a.withData).length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    return new Response(
      JSON.stringify({
        message: `Sync completed: ${studentsOk}/${byStudent.size} students ok, ${studentsIncomplete} incomplete (${studentsWithData} with data); pairs: ${successCount} success (${withDataCount} with data, ${noDataCount} no data), ${failedCount} failed, ${skippedCount} skipped${truncated ? ' (time budget)' : ''}`,
        total: results.length,
        dates,
        truncated,
        skipped: skippedCount,
        elapsed_ms: Date.now() - startedAt,
        students_total: byStudent.size,
        students_ok: studentsOk,
        students_failed: studentsFailed,
        students_incomplete: studentsIncomplete,
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
