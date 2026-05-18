/**
 * Edge function: delete-dexa-temp-pdf
 *
 * Remove APENAS PDFs DEXA temporários enviados ao bucket `dexa-pdfs`
 * antes da avaliação ser salva. É chamada pelo DexaForm quando o coach
 * remove/troca o arquivo ou cancela/fecha o modal após ter usado a
 * leitura automática.
 *
 * Segurança:
 *   1. OPTIONS responde CORS sem auth.
 *   2. POST exige Authorization: Bearer <jwt>.
 *   3. JWT é validado via anon client + auth.getUser().
 *   4. Service-role client só é criado após JWT válido.
 *   5. Caller precisa ser admin OU trainer dono do aluno.
 *   6. storage_path precisa começar com `${student_id}/`, não pode ter
 *      path traversal e precisa terminar em `.pdf`.
 *   7. Se `dexa_results.scan_pdf_storage_path` já referencia o path,
 *      a função retorna 409 e NÃO remove o objeto.
 *
 * Não toca em `assessments`, não toca em `dexa_results`, não roda SQL
 * destrutivo. Única mutação permitida: `storage.remove([storage_path])`
 * no bucket `dexa-pdfs` depois das validações acima.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

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

const BUCKET_ID = "dexa-pdfs";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { headers: jsonHeaders, status });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ ok: false, error: message }, status);
}

function isSafeStoragePath(storagePath: string, studentId: string): boolean {
  return (
    storagePath.startsWith(`${studentId}/`) &&
    !storagePath.includes("..") &&
    !storagePath.startsWith("/") &&
    /\.pdf$/i.test(storagePath)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Método não permitido", 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return errorResponse("Configuração indisponível", 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("Unauthorized", 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return errorResponse("Unauthorized", 401);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return errorResponse("Payload inválido", 400);
  }

  const studentId =
    typeof body.student_id === "string" ? body.student_id.trim() : "";
  const storagePath =
    typeof body.storage_path === "string" ? body.storage_path.trim() : "";

  if (!studentId || !UUID_RE.test(studentId)) {
    return errorResponse("student_id inválido", 400);
  }
  if (!storagePath || !isSafeStoragePath(storagePath, studentId)) {
    return errorResponse("storage_path inválido", 400);
  }

  const { data: adminRoleRow, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    return errorResponse("Falha ao validar permissões", 500);
  }
  const isAdmin = !!adminRoleRow;

  const { data: student, error: studentError } = await adminClient
    .from("students")
    .select("id, trainer_id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    return errorResponse("Falha ao buscar aluno", 500);
  }
  if (!student) {
    return errorResponse("Aluno não encontrado", 404);
  }
  if (!isAdmin && student.trainer_id !== user.id) {
    return errorResponse("Acesso negado", 403);
  }

  const { data: referencedDexa, error: referenceError } = await adminClient
    .from("dexa_results")
    .select("assessment_id")
    .eq("scan_pdf_storage_path", storagePath)
    .maybeSingle();

  if (referenceError) {
    return errorResponse("Falha ao validar vínculo do PDF", 500);
  }
  if (referencedDexa) {
    return errorResponse("PDF já vinculado a uma avaliação", 409);
  }

  const { error: removeError } = await adminClient.storage
    .from(BUCKET_ID)
    .remove([storagePath]);

  if (removeError) {
    return errorResponse("Falha ao remover PDF temporário", 500);
  }

  return jsonResponse({ ok: true });
});
