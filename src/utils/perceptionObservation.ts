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
  spDay: string;
  registeredAtDisplay: string;
  actorId: string | null;
}

export const buildPerceptionText = (r: PerceptionRecord): string =>
  [
    `[${PERCEPTION_CATEGORY} ${PERCEPTION_TEXT_VERSION}]`,
    `fonte=${r.source}`,
    `score=${r.score}`,
    `zona_base=${r.baseZoneLabel}`,
    `percepcao=${r.perception}`,
    `sintomas=${r.symptoms === null ? "nao_perguntado" : r.symptoms ? "sim" : "nao"}`,
    `conduta=${r.conductType}`,
    `vetos=${r.vetoes.length ? r.vetoes.join("; ") : "-"}`,
    `registrado=${r.registeredAtDisplay}`,
    `por=${r.actorId ?? "?"}`,
  ].join(" | ");

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
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return inserted.id;
};

/**
 * Vincula a percepção do dia à PRIMEIRA sessão criada depois dela —
 * session_id não-nulo nunca é sobrescrito (update condicionado no banco).
 */
export const linkPerceptionToSession = async (
  supabase: SupabaseClient,
  studentId: string,
  sessionId: string,
  spDay: string,
): Promise<void> => {
  const { startIso, endIso } = spDayUtcRange(spDay);
  const { data: candidates, error: findError } = await supabase
    .from("student_observations")
    .select("id")
    .eq("student_id", studentId)
    .contains("categories", [PERCEPTION_CATEGORY])
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .is("session_id", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (findError) {
    logger.warn("[percepcao] falha ao buscar observação pra vincular sessão", { findError });
    return;
  }
  const target = candidates?.[0];
  if (!target) return;
  const { error } = await supabase
    .from("student_observations")
    .update({ session_id: sessionId })
    .eq("id", target.id)
    .is("session_id", null);
  if (error) {
    logger.warn("[percepcao] falha ao vincular sessão à percepção", { error });
  }
};
