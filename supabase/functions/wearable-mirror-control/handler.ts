import {
  readBodyLimited,
  verifyMirrorRequest,
} from "../_shared/wearableMirror/signature.ts";
import { resolveFrontendUrl } from "../_shared/frontendOrigin.ts";
import { safeSyncResult, validControl } from "./control.ts";
const PUBLIC_KEY = "GtHx-sSkM9oiUKr97_WgV-GlqFkLQubqWZiNvMh4PNQ";
const AUDIENCE =
  "zrgfrdmywxlemcuiqtqg.supabase.co/functions/v1/wearable-mirror-control";
const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
// Dependência injetada permite provar que assinatura inválida não cria cliente de banco.
// deno-lint-ignore no-explicit-any
export async function handleControl(
  req: Request,
  makeClient: (
    url: string,
    key: string,
  ) => {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: any; error: unknown }>;
  },
) {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    const raw = await readBodyLimited(req);
    if (
      raw === null ||
      !await verifyMirrorRequest(
        PUBLIC_KEY,
        AUDIENCE,
        raw,
        req.headers.get("x-wearable-mirror-timestamp"),
        req.headers.get("x-wearable-mirror-signature"),
        Date.now() / 1000,
      )
    ) return json(401, { error: "unauthorized" });
    const body = JSON.parse(raw);
    if (!body || !validControl(body)) {
      return json(400, { error: "invalid_request" });
    }
    // Sem origem trazida pelo chamador. Resolve configuração pública antes da transação.
    const origin = resolveFrontendUrl(new Request("https://" + AUDIENCE), null);
    if (
      body.action === "invite" && (!origin || !origin.startsWith("https://"))
    ) return json(503, { error: "public_origin_missing" });
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = makeClient(url, key);
    const { data, error } = await db.rpc("wearable_mirror_control", {
      p_body: body,
    });
    if (error || !data) return json(503, { error: "control_failed" });
    if (data.error) {
      return json(
        data.error === "cooldown"
          ? 429
          : data.error === "grant_revoked"
          ? 410
          : 409,
        data,
      );
    }
    if (body.action === "refresh") {
      const owner = crypto.randomUUID();
      const args = {
        p_operation: data.operation_id,
        p_destination: body.destination_student_id,
        p_owner: owner,
      };
      const claimed = await db.rpc("wearable_mirror_refresh_step", args);
      if (claimed.error) return json(503, { error: "step_failed" });
      if (!claimed.data.step) return json(200, { ...data, ...claimed.data });
      const s = claimed.data.step;
      const payload = s.provider === "oura"
        ? {
          student_id: claimed.data.source_student_id,
          date: s.date,
          force_sync: true,
        }
        : {
          student_id: claimed.data.source_student_id,
          start: s.start,
          end: s.end,
        };
      let result = "retry", retry = 60;
      try {
        const res = await fetch(`${url}/functions/v1/${s.provider}-sync`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(90_000),
        });
        const ra = res.headers.get("Retry-After");
        if (ra) {
          retry = Math.max(
            60,
            Number(ra) || Math.ceil((Date.parse(ra) - Date.now()) / 1000) || 60,
          );
        }
        const reset = Number(res.headers.get("X-RateLimit-Reset"));
        if (reset > 0) {
          retry = Math.max(
            retry,
            reset > Date.now() / 1000
              ? reset - Math.floor(Date.now() / 1000)
              : reset,
          );
        }
        result = safeSyncResult(
          res.status,
          await res.json().catch(() => ({ success: false })),
        );
      } catch { /* Código fixo; não vaza resposta do fabricante. */ }
      const done = await db.rpc("wearable_mirror_refresh_step", {
        ...args,
        p_result: result,
        p_retry_seconds: Math.min(86400,Math.ceil(retry)),
      });
      if (done.error) return json(503, { error: "step_failed" });
      return json(200, { ...data, ...done.data });
    }
    const { invite_token, ...safe } = data;
    return json(200, {
      ...safe,
      invite_url: invite_token
        ? `${origin}/${body.provider}-connect/${invite_token}`
        : null,
    });
  } catch {
    return json(400, { error: "invalid_request" });
  }
}
