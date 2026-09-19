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
 * Registro local de quem já entrou num salvamento em grupo, por prescrição e
 * data (sessionStorage, 12 h). Sobrevive a fechar/reabrir o diálogo e a trocar
 * de página na mesma aba — o horário NÃO entra na chave, porque ao reabrir o
 * diálogo o horário volta para "agora" (revisão da #369).
 */
const LOCAL_KEY_PREFIX = "fabrik:group-manual-saved:";

const localKey = (prescriptionId: string | null, date: string) =>
  `${LOCAL_KEY_PREFIX}${prescriptionId ?? "none"}:${date}`;

interface LocalRecord {
  ids: string[];
  at: number;
}

export function readLocallySaved(
  prescriptionId: string | null,
  date: string,
  nowMs: number = Date.now(),
  storage: Pick<Storage, "getItem"> | undefined = globalThis.sessionStorage,
): string[] {
  try {
    const raw = storage?.getItem(localKey(prescriptionId, date));
    if (!raw) return [];
    const rec = JSON.parse(raw) as LocalRecord;
    if (!Array.isArray(rec.ids) || typeof rec.at !== "number") return [];
    if (nowMs - rec.at > GROUP_IDEMPOTENCY_WINDOW_MS) return [];
    return rec.ids.filter((id) => typeof id === "string");
  } catch {
    return [];
  }
}

export function rememberLocallySaved(
  prescriptionId: string | null,
  date: string,
  ids: string[],
  nowMs: number = Date.now(),
  storage: Pick<Storage, "getItem" | "setItem"> | undefined = globalThis.sessionStorage,
): void {
  try {
    const merged = Array.from(new Set([...readLocallySaved(prescriptionId, date, nowMs, storage), ...ids]));
    storage?.setItem(localKey(prescriptionId, date), JSON.stringify({ ids: merged, at: nowMs } satisfies LocalRecord));
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
