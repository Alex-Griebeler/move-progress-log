// wearable-mirror-export — exportador SOMENTE LEITURA do espelho Oura/Whoop para o app pessoal
// (ag_performance). Plano: docs/ESPELHO_WEARABLES.md no repo ag-performance.
//
// Autenticação própria: assinatura Ed25519 do app pessoal (cabeçalhos x-wearable-mirror-timestamp e
// x-wearable-mirror-signature, janela de 5 min) conferida contra a chave PÚBLICA abaixo, ANTES de qualquer
// acesso ao banco. A chave privada fica só no Vault do app pessoal; nenhum segredo é guardado aqui.
// verify_jwt=false no gateway.
// Entrada: { "schema_version": 1, "scope": "all" } ou
//          { "schema_version": 1, "scope": "one", "grant_id": uuid, "destination_student_id": uuid }.
// Saída: o snapshot montado por public.wearable_mirror_export_snapshot, conferido contra o contrato v1
// antes de sair. Scope "all": autorização fora do contrato é retirada e o manifesto sai incompleto
// (as outras seguem). Scope "one": qualquer violação vira 500; autorização inexistente vira 404.
// Não escreve em nada, não chama Oura/Whoop, não lê tokens, não loga payload nem cabeçalhos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { parseMirrorSnapshot } from "../_shared/wearableMirror/contract.ts";
import { readBodyLimited, verifyMirrorRequest } from "../_shared/wearableMirror/signature.ts";

// Chave pública Ed25519 do app pessoal (não é segredo). Trocar a chave = trocar esta linha.
const WEARABLE_MIRROR_PUBLIC_KEY = "GtHx-sSkM9oiUKr97_WgV-GlqFkLQubqWZiNvMh4PNQ";
// Destino que o app pessoal assina (host + caminho desta função); pedido assinado para outro endereço não vale.
const WEARABLE_MIRROR_AUDIENCE = "zrgfrdmywxlemcuiqtqg.supabase.co/functions/v1/wearable-mirror-export";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  let bodyText: string | null;
  try {
    bodyText = await readBodyLimited(req);
  } catch {
    return json(400, { error: "invalid_body" });
  }
  if (bodyText === null) return json(401, { error: "unauthorized" });
  const signed = await verifyMirrorRequest(
    WEARABLE_MIRROR_PUBLIC_KEY,
    WEARABLE_MIRROR_AUDIENCE,
    bodyText,
    req.headers.get("x-wearable-mirror-timestamp"),
    req.headers.get("x-wearable-mirror-signature"),
    Date.now() / 1000,
  );
  if (!signed) return json(401, { error: "unauthorized" });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bodyText);
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
