/**
 * Persistência da percepção pré-treino (R8b) em `student_observations`,
 * SEM migration — contrato com as consultas clínicas existentes:
 * gravamos `severity: null` e `is_resolved: true`, e TODAS as consultas de
 * "observações importantes" filtram `severity IN (baixa,média,alta) AND
 * is_resolved = false` — percepção fica estruturalmente fora delas (e a
 * categoria 'percepcao_treino' permite consulta própria no card clínico).
 *
 * Idempotência é DE APLICAÇÃO (sem constraint no banco): 1 registro por
 * {aluna, dia SP, fonte}; múltiplos (corrida) → atualizamos o mais recente
 * de forma determinística e logamos diagnóstico. Limitação single-coach
 * aceita no plano (3 rodadas de revisão). created_at NUNCA muda em edição —
 * o horário novo vai dentro do texto versionado.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";
import type { Perception } from "@/utils/effectiveConduct";

export const PERCEPTION_CATEGORY = "percepcao_treino";
export const PERCEPTION_TEXT_VERSION = "v1";

/**
 * Dia SP → intervalo UTC [início, fim). Brasil não tem horário de verão
 * desde 2019: America/Sao_Paulo é UTC−3 fixo — documentado de propósito;
 * se o DST voltar um dia, este é O lugar a revisar.
 */
export const spDayUtcRange = (spDay: string): { startIso: string; endIso: string } => {
  const start = new Date(`${spDay}T03:00:00Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
};

export interface PerceptionRecord {
  source: "oura" | "whoop";
  score: number;
  baseZoneLabel: string;
  perception: Perception;
  symptoms: boolean | null;
  conductType: string;
  vetoes: string[];
  /** Dia SP do REGISTRO (chave do upsert). */
  spDay: string;
  /** Dia do SNAPSHOT avaliado — pode ser anterior ao registro (Whoop de
   *  hoje pendente → hero de ontem); sem este campo o prontuário
   *  apresentava score de ontem como medição de hoje (revisão fria R8b). */
  snapshotDate: string;
  registeredAtDisplay: string;
  actorId: string | null;
}

export const buildPerceptionText = (r: PerceptionRecord): string =>
  [
    `[${PERCEPTION_CATEGORY} ${PERCEPTION_TEXT_VERSION}]`,
    `fonte=${r.source}`,
    `score=${r.score}`,
    `zona_base=${r.baseZoneLabel}`,
    `dia_snapshot=${r.snapshotDate}`,
    `percepcao=${r.perception}`,
    `sintomas=${r.symptoms === null ? "nao_perguntado" : r.symptoms ? "sim" : "nao"}`,
    `conduta=${r.conductType}`,
    `vetos=${r.vetoes.length ? r.vetoes.join("; ") : "-"}`,
    `registrado=${r.registeredAtDisplay}`,
    `por=${r.actorId ?? "?"}`,
  ].join(" | ");

/** Campos parseados do texto versionado (round-trip com buildPerceptionText). */
export interface ParsedPerception {
  version: string | null;
  fields: Record<string, string>;
}

/**
 * Parse do texto estruturado — o card clínico exibe versão amigável e o
 * formato cru fica como fallback pra versões futuras desconhecidas.
 */
export const parsePerceptionText = (text: string): ParsedPerception => {
  const versionMatch = text.match(new RegExp(`^\\[${PERCEPTION_CATEGORY} (v\\d+)\\]`));
  const fields: Record<string, string> = {};
  for (const part of text.split(" | ").slice(1)) {
    const eq = part.indexOf("=");
    if (eq > 0) fields[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return { version: versionMatch?.[1] ?? null, fields };
};

/**
 * Grava/atualiza a percepção do dia (1 por {aluna, dia SP, fonte}).
 * Retorna o id da observação. Nunca altera created_at em edição.
 */
export const upsertPerceptionObservation = async (
  supabase: SupabaseClient,
  studentId: string,
  record: PerceptionRecord,
): Promise<string> => {
  const { startIso, endIso } = spDayUtcRange(record.spDay);
  const { data: existing, error: findError } = await supabase
    .from("student_observations")
    .select("id, created_at, observation_text")
    .eq("student_id", studentId)
    .contains("categories", [PERCEPTION_CATEGORY])
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (findError) throw findError;

  const sameSource = (existing ?? []).filter((row) =>
    typeof row.observation_text === "string" && row.observation_text.includes(`fonte=${record.source}`),
  );
  if (sameSource.length > 1) {
    logger.warn("[percepcao] múltiplas observações no mesmo dia/fonte — atualizando a mais recente", {
      studentId, spDay: record.spDay, count: sameSource.length,
    });
  }

  const text = buildPerceptionText(record);
  if (sameSource.length > 0) {
    const target = sameSource[0];
    const { error } = await supabase
      .from("student_observations")
      .update({ observation_text: text })
      .eq("id", target.id);
    if (error) throw error;
    return target.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("student_observations")
    .insert({
      student_id: studentId,
      observation_text: text,
      categories: [PERCEPTION_CATEGORY],
      severity: null,
      is_resolved: true, // percepção não é pendência clínica a resolver
      created_by: record.actorId,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return inserted.id;
};

/**
 * Registro do ID da percepção do dia — o vínculo à sessão usa o ID EXATO
 * devolvido pelo upsert (nunca "a mais recente do dia": com Oura e Whoop no
 * mesmo dia, a busca genérica podia vincular a fonte errada; revisão R8b).
 * Memória + espelho em sessionStorage: sobrevive a refresh/remount da SPA;
 * o registro só é CONSUMIDO após update bem-sucedido (falha de rede não
 * perde a tentativa — a próxima sessão criada tenta de novo).
 */
const rememberedPerception = new Map<string, { spDay: string; observationId: string; fingerprint: string }>();
const storageKey = (studentId: string) => `percepcao_treino:${studentId}`;

const readRemembered = (
  studentId: string,
): { spDay: string; observationId: string; fingerprint: string } | null => {
  const inMemory = rememberedPerception.get(studentId);
  if (inMemory) return inMemory;
  try {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(storageKey(studentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { spDay?: unknown; observationId?: unknown; fingerprint?: unknown };
    if (
      typeof parsed.spDay === "string" &&
      typeof parsed.observationId === "string" &&
      typeof parsed.fingerprint === "string"
    ) {
      return { spDay: parsed.spDay, observationId: parsed.observationId, fingerprint: parsed.fingerprint };
    }
  } catch {
    // storage indisponível/corrompido — segue sem vínculo
  }
  return null;
};

const forgetRemembered = (studentId: string): void => {
  rememberedPerception.delete(studentId);
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(storageKey(studentId));
  } catch {
    // ok
  }
};

export const rememberPerceptionObservation = (
  studentId: string,
  spDay: string,
  observationId: string,
  fingerprint: string,
): void => {
  rememberedPerception.set(studentId, { spDay, observationId, fingerprint });
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(storageKey(studentId), JSON.stringify({ spDay, observationId, fingerprint }));
    }
  } catch {
    // storage cheio/bloqueado — memória cobre a sessão atual da página
  }
};

/**
 * O vínculo só vale enquanto a RECOMENDAÇÃO que originou a percepção está
 * de pé: o dashboard chama isto a cada render com o fingerprint atual —
 * hero trocou de fonte/score no mesmo dia → o vínculo pendente é esquecido
 * (a observação persiste no banco; só o LINK automático morre). Revisão
 * fria R8b: sem isto, sessão iniciada sob Oura vinculava percepção Whoop.
 */
export const validateRememberedPerception = (
  studentId: string,
  currentFingerprint: string | null,
): void => {
  const remembered = readRemembered(studentId);
  if (!remembered) return;
  if (currentFingerprint === null || remembered.fingerprint !== currentFingerprint) {
    forgetRemembered(studentId);
  }
};

/** Exposto só pra teste. */
export const _clearRememberedPerceptions = (): void => rememberedPerception.clear();

/**
 * Vincula a percepção REGISTRADA à sessão criada — só quando a DATA da
 * sessão é o mesmo dia SP da percepção (sessão retroativa não recebe a
 * percepção de hoje) e só à PRIMEIRA sessão (`.is("session_id", null)`:
 * session_id não-nulo nunca é sobrescrito).
 */
export const linkPerceptionToSession = async (
  supabase: SupabaseClient,
  studentId: string,
  sessionId: string,
  sessionSpDay: string,
): Promise<void> => {
  const remembered = readRemembered(studentId);
  if (!remembered || remembered.spDay !== sessionSpDay) return;
  const { error } = await supabase
    .from("student_observations")
    .update({ session_id: sessionId })
    .eq("id", remembered.observationId)
    .is("session_id", null);
  if (error) {
    // NÃO consome: a próxima sessão criada tenta de novo.
    logger.warn("[percepcao] falha ao vincular sessão à percepção — vínculo mantido pra retry", { error });
    return;
  }
  forgetRemembered(studentId);
};
