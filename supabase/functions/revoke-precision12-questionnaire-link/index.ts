/**
 * E4.5 — Edge function: revoke-precision12-questionnaire-link
 *
 * Revoga manualmente o link ativo do Questionário Precision 12 sem
 * emitir um novo. Espelha o padrão de auth/ownership do
 * `create-precision12-questionnaire-link` (PR #136) — usa service role
 * pra UPDATE, mas só após validações:
 *
 *   1. JWT válido (caller autenticado).
 *   2. Caller é admin OU trainer dono do aluno.
 *   3. Assessment existe, pertence ao aluno, tipo
 *      `questionnaire_precision12`, status `in_progress`.
 *   4. UPDATE seta `revoked_at = now()` APENAS em rows com
 *      `used_at IS NULL AND revoked_at IS NULL` — links já usados ou
 *      já revogados nunca são tocados (defesa em profundidade do
 *      partial unique index do schema).
 *
 * Não cria link novo. Não toca `assessments`. Não toca
 * `questionnaire_responses`. Não toca outros assessments.
 *
 * Retorna `{ ok: true, revoked_at }` no sucesso. Erros são genéricos
 * (não expõem detalhes que vazam superfície).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

// ────────────────────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ASSESSMENT_TYPE = "questionnaire_precision12" as const;

/**
 * Mesma allowlist usada por `create-precision12-questionnaire-link`. Revogar
 * link de assessment `blocked` / `completed` / `aborted` não faz sentido
 * operacional: o link já não daria certo no submit.
 */
const REVOCABLE_ASSESSMENT_STATUSES = new Set(["in_progress"]);

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { headers: jsonHeaders, status });
}

// ────────────────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 0. Env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("[revoke-precision12-questionnaire-link] Missing env vars");
      return jsonResponse(
        { error: "Missing Supabase environment variables" },
        500,
      );
    }

    // 1. Autenticar caller via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // 2. Service-role client (bypassa RLS, só após validações abaixo)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verifica se caller é admin (libera revoke em alunos de outros trainers)
    const { data: adminRoleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRoleRow;

    // 3. Body
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return jsonResponse({ error: "Payload inválido" }, 400);
    }

    const studentId =
      typeof body.student_id === "string" ? body.student_id.trim() : "";
    const assessmentId =
      typeof body.assessment_id === "string" ? body.assessment_id.trim() : "";

    if (!studentId || !UUID_RE.test(studentId)) {
      return jsonResponse({ error: "student_id inválido" }, 400);
    }
    if (!assessmentId || !UUID_RE.test(assessmentId)) {
      return jsonResponse({ error: "assessment_id inválido" }, 400);
    }

    // 4. Validar ownership do student
    const { data: student, error: studentError } = await adminClient
      .from("students")
      .select("id, trainer_id")
      .eq("id", studentId)
      .maybeSingle();

    if (studentError) {
      console.error("[revoke-p12-link] student fetch error:", studentError);
      return jsonResponse({ error: "Falha ao buscar aluno" }, 500);
    }
    if (!student) {
      return jsonResponse({ error: "Aluno não encontrado" }, 404);
    }
    if (!isAdmin && student.trainer_id !== user.id) {
      return jsonResponse({ error: "Acesso negado a esse aluno" }, 403);
    }

    // 5. Validar assessment
    const { data: assessment, error: assessmentError } = await adminClient
      .from("assessments")
      .select("id, student_id, assessment_type, status")
      .eq("id", assessmentId)
      .maybeSingle();

    if (assessmentError) {
      console.error("[revoke-p12-link] assessment fetch error:", assessmentError);
      return jsonResponse({ error: "Falha ao buscar avaliação" }, 500);
    }
    if (!assessment) {
      return jsonResponse({ error: "Avaliação não encontrada" }, 404);
    }
    if (assessment.student_id !== studentId) {
      return jsonResponse(
        { error: "Avaliação não pertence ao aluno informado" },
        400,
      );
    }
    if (assessment.assessment_type !== ASSESSMENT_TYPE) {
      return jsonResponse(
        { error: "Avaliação não é do tipo questionnaire_precision12" },
        400,
      );
    }
    if (!REVOCABLE_ASSESSMENT_STATUSES.has(assessment.status)) {
      return jsonResponse(
        {
          error: `Não é possível revogar: status atual é '${assessment.status}'. Apenas avaliações 'in_progress' permitem revogação.`,
        },
        400,
      );
    }

    // 6. UPDATE: seta revoked_at = now() APENAS em rows ativas. Os filtros
    // `is("used_at", null) is("revoked_at", null)` garantem que links já
    // usados ou já revogados NUNCA são tocados — invariante crítica.
    const nowIso = new Date().toISOString();
    const { data: revokedRows, error: revokeError } = await adminClient
      .from("precision12_questionnaire_links")
      .update({ revoked_at: nowIso })
      .eq("assessment_id", assessmentId)
      .is("used_at", null)
      .is("revoked_at", null)
      .select("id");

    if (revokeError) {
      console.error("[revoke-p12-link] update error:", revokeError);
      return jsonResponse({ error: "Falha ao revogar link" }, 500);
    }

    const affectedCount = revokedRows?.length ?? 0;
    if (affectedCount === 0) {
      // Nenhum link ativo — pode ser que o coach já revogou de outra aba,
      // ou que nunca houve link. Mensagem genérica e segura.
      return jsonResponse({ error: "Nenhum link ativo para revogar." }, 404);
    }

    console.log("[revoke-p12-link] link revoked", {
      studentId,
      assessmentId,
      affectedCount,
    });

    return jsonResponse({
      ok: true,
      revoked_at: nowIso,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[revoke-precision12-questionnaire-link] uncaught:", error);
    return jsonResponse({ error: message }, 500);
  }
});
