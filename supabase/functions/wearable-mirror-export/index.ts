// wearable-mirror-export — exportador SOMENTE LEITURA do espelho Oura/Whoop para o app pessoal
// (ag_performance). Plano: docs/ESPELHO_WEARABLES.md no repo ag-performance.
//
// Autenticação própria: cabeçalho x-wearable-mirror-secret comparado em tempo constante com o secret
// WEARABLE_MIRROR_SECRET, ANTES de qualquer acesso ao banco. verify_jwt=false no gateway.
// Entrada: { "schema_version": 1, "scope": "all" } ou
//          { "schema_version": 1, "scope": "one", "grant_id": uuid, "destination_student_id": uuid }.
// Saída: o snapshot montado por public.wearable_mirror_export_snapshot, conferido contra o contrato v1
// antes de sair. Scope "all": autorização fora do contrato é retirada e o manifesto sai incompleto
// (as outras seguem). Scope "one": qualquer violação vira 500; autorização inexistente vira 404.
// Não escreve em nada, não chama Oura/Whoop, não lê tokens, não loga payload nem cabeçalhos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { parseMirrorSnapshot } from "../_shared/wearableMirror/contract.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function secretsMatch(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected || expected.length < 32) return false;
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!secretsMatch(req.headers.get("x-wearable-mirror-secret"), Deno.env.get("WEARABLE_MIRROR_SECRET"))) {
    return json(401, { error: "unauthorized" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_body" });
  }
  if (body === null || typeof body !== "object" || Array.isArray(body) || body.schema_version !== 1) {
    return json(400, { error: "unsupported_schema_version" });
  }

  const scope = body.scope;
  let grantId: string | null = null;
  let destinationStudentId: string | null = null;
  if (scope === "one") {
    if (typeof body.grant_id !== "string" || !UUID_RE.test(body.grant_id) ||
        typeof body.destination_student_id !== "string" || !UUID_RE.test(body.destination_student_id)) {
      return json(400, { error: "invalid_scope" });
    }
    grantId = body.grant_id;
    destinationStudentId = body.destination_student_id;
  } else if (scope !== "all") {
    return json(400, { error: "invalid_scope" });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc("wearable_mirror_export_snapshot", {
    p_scope: scope,
    p_grant_id: grantId,
    p_destination_student_id: destinationStudentId,
  });
  if (error) {
    console.error("wearable-mirror-export: snapshot failed", error.code);
    return json(500, { error: "snapshot_failed" });
  }

  if (scope === "one" && Array.isArray((data as { grants?: unknown[] } | null)?.grants) &&
      (data as { grants: unknown[] }).grants.length === 0) {
    return json(404, { error: "grant_not_found" });
  }

  const parsed = parseMirrorSnapshot(data, {
    scope,
    grantId: grantId ?? undefined,
    destinationStudentId: destinationStudentId ?? undefined,
  });
  if (!parsed.ok) {
    // Nunca envia algo fora do contrato; o motivo fica só no log, sem dados.
    console.error("wearable-mirror-export: contract violation (snapshot)");
    return json(500, { error: "contract_violation" });
  }
  if (parsed.value.rejected.length > 0) {
    // Só no scope "all" (no "one" o parse já recusa): segue com as válidas, manifesto incompleto.
    console.error("wearable-mirror-export: grants rejected by contract", parsed.value.rejected.length);
  }

  return json(200, parsed.value.snapshot);
});
