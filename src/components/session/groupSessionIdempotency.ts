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
  data: Array<{ id: string; exercises?: Array<{ count: number }> | null }> | null;
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
  from(table: "workout_sessions"): { select(columns: string): SessionsQuery };
}

export async function hasRecentGroupSession(
  client: SessionsClient,
  key: GroupSessionKey,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const since = new Date(nowMs - GROUP_IDEMPOTENCY_WINDOW_MS).toISOString();
  let query = client
    .from("workout_sessions")
    // Só conta sessão COM exercícios: uma sessão vazia (rollback que falhou)
    // não pode esconder a pessoa como "já registrada" (revisão da #369).
    .select("id, exercises(count)")
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
  return (data ?? []).some((row) => (row.exercises?.[0]?.count ?? 0) > 0);
}

/**
 * Registro local de quem já entrou num salvamento em grupo INCOMPLETO
 * (sessionStorage, 12 h), por prescrição e data, guardando o HORÁRIO da aula.
 * Sobrevive a fechar/reabrir o diálogo e a trocar de página na mesma aba.
 * Só vale para a MESMA aula: o chamador compara o horário e ainda confirma no
 * banco antes de pular alguém (revisões da #369 — nunca perder gravação de
 * outra aula da mesma pessoa no mesmo dia).
 */
const LOCAL_KEY_PREFIX = "fabrik:group-manual-saved:";

const localKey = (prescriptionId: string | null, date: string) =>
  `${LOCAL_KEY_PREFIX}${prescriptionId ?? "none"}:${date}`;

export interface LocalSavedRecord {
  ids: string[];
  time: string;
  at: number;
}

export function readLocallySaved(
  prescriptionId: string | null,
  date: string,
  nowMs: number = Date.now(),
  storage: Pick<Storage, "getItem"> | undefined = globalThis.sessionStorage,
): LocalSavedRecord | null {
  try {
    const raw = storage?.getItem(localKey(prescriptionId, date));
    if (!raw) return null;
    const rec = JSON.parse(raw) as LocalSavedRecord;
    if (!Array.isArray(rec.ids) || typeof rec.at !== "number" || typeof rec.time !== "string") return null;
    if (nowMs - rec.at > GROUP_IDEMPOTENCY_WINDOW_MS) return null;
    return { ids: rec.ids.filter((id) => typeof id === "string"), time: rec.time, at: rec.at };
  } catch {
    return null;
  }
}

export function rememberLocallySaved(
  prescriptionId: string | null,
  date: string,
  time: string,
  ids: string[],
  nowMs: number = Date.now(),
  storage: Pick<Storage, "getItem" | "setItem"> | undefined = globalThis.sessionStorage,
): void {
  try {
    const prev = readLocallySaved(prescriptionId, date, nowMs, storage);
    // Outra aula (horário diferente) substitui o registro anterior.
    const base = prev && prev.time === time ? prev.ids : [];
    const merged = Array.from(new Set([...base, ...ids]));
    storage?.setItem(
      localKey(prescriptionId, date),
      JSON.stringify({ ids: merged, time, at: nowMs } satisfies LocalSavedRecord),
    );
  } catch {
    /* armazenamento indisponível: a checagem no banco continua valendo */
  }
}

export function forgetLocallySaved(
  prescriptionId: string | null,
  date: string,
  storage: Pick<Storage, "removeItem"> | undefined = globalThis.sessionStorage,
): void {
  try {
    storage?.removeItem(localKey(prescriptionId, date));
  } catch {
    /* ignore */
  }
}
