// Contrato de controle: nenhuma URL, origem, treinador ou janela arbitrária.
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validControl(b: Record<string, unknown>): boolean {
  const fields = b.action === "invite"
    ? [
      "action",
      "request_id",
      "destination_student_id",
      "provider",
      "registration_mode",
      "name",
      "history_from",
      "authorization_reference",
      "requested_at",
    ]
    : ["action", "request_id", "destination_student_id", "grant_id"];
  if (Object.keys(b).some((k) => !fields.includes(k))) return false;
  if (
    !UUID.test(String(b.request_id)) ||
    !UUID.test(String(b.destination_student_id))
  ) return false;
  if (!["invite", "refresh", "revoke"].includes(String(b.action))) return false;
  if (b.action !== "invite") return UUID.test(String(b.grant_id));
  return ["oura", "whoop"].includes(String(b.provider)) &&
    ["new", "existing"].includes(String(b.registration_mode)) &&
    typeof b.name === "string" && b.name.trim().length > 0 &&
    b.name.length <= 200 &&
    typeof b.authorization_reference === "string" &&
    b.authorization_reference.trim().length > 0 &&
    b.authorization_reference.length <= 500 &&
    typeof b.history_from === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(b.history_from) &&
    Number.isFinite(Date.parse(b.history_from)) &&
    new Date(b.history_from).toISOString().slice(0, 10) === b.history_from &&
    b.history_from <= new Date().toISOString().slice(0, 10) &&
    validRequestedAt(b.requested_at);
}
/** Horário do pedido no app pessoal (UTC ISO com Z), nunca mais de 5 min no futuro. */
export function validRequestedAt(v: unknown, nowMs = Date.now()): boolean {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(v)
  ) return false;
  const t = Date.parse(v);
  return Number.isFinite(t) && t <= nowMs + 5 * 60_000;
}
export function safeSyncResult(
  status: number,
  b: Record<string, unknown>,
): string {
  if (status === 429 || status === 423) return "retry";
  if (status >= 500) return "retry";
  if (status !== 200 || b.success === false) return "failed";
  if (
    b.outcome === "partial" || b.partial === true ||
    (Array.isArray(b.warnings) && b.warnings.length)
  ) return "partial";
  if (b.outcome === "no_data" || b.synced === 0) return "no_data";
  return "succeeded";
}
