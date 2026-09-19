/**
 * Idempotência do salvamento manual em grupo (revisão da PR #369).
 *
 * O "já salvo" em memória do diálogo zera ao fechar, mas o rascunho guarda
 * todas as pessoas. Fechar após falha parcial e reabrir faria o "Salvar"
 * regravar quem já entrou. Antes de gravar cada pessoa, procuramos uma sessão
 * de grupo dela com a mesma data, horário e prescrição criada na janela
 * recente; se existir, conta como salva e não duplica.
 */

export const GROUP_IDEMPOTENCY_WINDOW_MS = 12 * 60 * 60 * 1000;

export interface GroupSessionKey {
  studentId: string;
  date: string;
  time: string;
  prescriptionId: string | null;
}

interface QueryResult {
  data: Array<{ id: string }> | null;
  error: unknown;
}

// Subconjunto do query builder do supabase-js usado aqui (injetável em teste).
interface SessionsQuery extends PromiseLike<QueryResult> {
  eq(column: string, value: string): SessionsQuery;
  is(column: string, value: null): SessionsQuery;
  gte(column: string, value: string): SessionsQuery;
  limit(n: number): SessionsQuery;
}

export interface SessionsClient {
  from(table: "workout_sessions"): { select(columns: "id"): SessionsQuery };
}

export async function hasRecentGroupSession(
  client: SessionsClient,
  key: GroupSessionKey,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const since = new Date(nowMs - GROUP_IDEMPOTENCY_WINDOW_MS).toISOString();
  let query = client
    .from("workout_sessions")
    .select("id")
    .eq("student_id", key.studentId)
    .eq("date", key.date)
    .eq("time", key.time)
    .eq("session_type", "group")
    .gte("created_at", since)
    .limit(1);
  query = key.prescriptionId
    ? query.eq("prescription_id", key.prescriptionId)
    : query.is("prescription_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
