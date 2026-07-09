import { assertEquals } from "jsr:@std/assert";
import { ensureAccessToken, isPermanentTokenFailure, validateWindow } from "./handler.ts";
import { TokenHttpError } from "../_shared/wearable/tokens.ts";

Deno.test("validateWindow defaults to last 30 days when start/end omitted", () => {
  const r = validateWindow({});
  if ("error" in r) throw new Error("expected ok");
  const diff = Date.parse(r.end) - Date.parse(r.start);
  const days = diff / (24 * 3600 * 1000);
  assertEquals(days >= 29.9 && days <= 30.1, true);
});

Deno.test("validateWindow rejects non-ISO strings", () => {
  const r = validateWindow({ start: "not-a-date", end: "2026-07-01T00:00:00Z" });
  assertEquals("error" in r, true);
});

Deno.test("validateWindow rejects start >= end", () => {
  const r = validateWindow({ start: "2026-07-01T00:00:00Z", end: "2026-07-01T00:00:00Z" });
  assertEquals("error" in r && r.error.includes("anterior"), true);
});

Deno.test("validateWindow rejects window > 90 days", () => {
  const r = validateWindow({ start: "2026-01-01T00:00:00Z", end: "2026-06-01T00:00:00Z" });
  assertEquals("error" in r && r.error.includes("90"), true);
});

Deno.test("validateWindow accepts a valid <=90d window", () => {
  const r = validateWindow({ start: "2026-06-01T00:00:00Z", end: "2026-07-01T00:00:00Z" });
  if ("error" in r) throw new Error("expected ok");
  assertEquals(r.start.startsWith("2026-06-01"), true);
});

Deno.test("isPermanentTokenFailure: 400/401 permanent, 5xx/429 transient", () => {
  assertEquals(isPermanentTokenFailure(new TokenHttpError("t", 400, "invalid_grant")), true);
  assertEquals(isPermanentTokenFailure(new TokenHttpError("t", 401, "unauthorized")), true);
  assertEquals(isPermanentTokenFailure(new TokenHttpError("t", 429, "rate")), false);
  assertEquals(isPermanentTokenFailure(new TokenHttpError("t", 503, "down")), false);
  assertEquals(isPermanentTokenFailure(new Error("network")), false);
});

// Minimal fluent stub for the Supabase client used by handler.ts.
// deno-lint-ignore no-explicit-any
function makeSupa(rpcRefreshTok: string | null = "r0") {
  // deno-lint-ignore no-explicit-any
  const calls: { logs: any[]; updates: any[] } = { logs: [], updates: [] };
  const supa = {
    // deno-lint-ignore no-explicit-any
    rpc(name: string, _args: any) {
      if (name === "get_whoop_refresh_token") return Promise.resolve({ data: rpcRefreshTok, error: null });
      if (name === "store_whoop_tokens") return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    from(table: string) {
      return {
        // deno-lint-ignore no-explicit-any
        insert(row: any) { calls.logs.push({ table, row }); return Promise.resolve({ error: null }); },
        // deno-lint-ignore no-explicit-any
        update(row: any) {
          calls.updates.push({ table, row });
          return { eq: () => Promise.resolve({ error: null }) };
        },
      };
    },
  };
  return { supa, calls };
}

Deno.test("ensureAccessToken: permanent (401) failure logs and deactivates connection", async () => {
  const { supa, calls } = makeSupa("r0");
  const res = await ensureAccessToken(
    { supa, refreshAccessToken: () => Promise.reject(new TokenHttpError("token refresh", 401, "invalid_grant")) },
    { student_id: "s1", tokenExpiresAt: null, currentAccessToken: null },
  );
  assertEquals(res.ok, false);
  if (res.ok) throw new Error();
  assertEquals(res.permanent, true);
  assertEquals(res.status, 401);
  assertEquals(calls.logs[0].table, "whoop_sync_logs");
  assertEquals(calls.logs[0].row.status, "failed");
  assertEquals(calls.logs[0].row.error_message.startsWith("token_refresh: "), true);
  const deact = calls.updates.find((u) => u.table === "whoop_connections" && u.row.is_active === false);
  assertEquals(!!deact, true);
});

Deno.test("ensureAccessToken: transient (network) failure logs but keeps connection active", async () => {
  const { supa, calls } = makeSupa("r0");
  const res = await ensureAccessToken(
    { supa, refreshAccessToken: () => Promise.reject(new Error("network down")) },
    { student_id: "s1", tokenExpiresAt: null, currentAccessToken: null },
  );
  assertEquals(res.ok, false);
  if (res.ok) throw new Error();
  assertEquals(res.permanent, false);
  assertEquals(res.status, 502);
  assertEquals(calls.logs[0].row.status, "failed");
  const deact = calls.updates.find((u) => u.table === "whoop_connections" && u.row.is_active === false);
  assertEquals(!!deact, false);
});

Deno.test("ensureAccessToken: fresh token skips refresh", async () => {
  const { supa, calls } = makeSupa("r0");
  const future = new Date(Date.now() + 3600_000).toISOString();
  const res = await ensureAccessToken(
    { supa, refreshAccessToken: () => Promise.reject(new Error("should not be called")) },
    { student_id: "s1", tokenExpiresAt: future, currentAccessToken: "a1" },
  );
  assertEquals(res.ok, true);
  if (!res.ok) throw new Error();
  assertEquals(res.accessToken, "a1");
  assertEquals(calls.logs.length, 0);
});
