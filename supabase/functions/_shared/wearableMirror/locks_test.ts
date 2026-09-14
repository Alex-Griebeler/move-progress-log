// Montado em supabase/functions/_shared/wearableMirror/locks_test.ts pelo scripts/verify-wearable-mirror.sh.
// Prova, sem rede, o que a revisão fria (rodada 3, A1) pediu: todo pedido do cliente de sincronização carrega o
// dono da trava; a coleta ativa segue no cabeçalho; bloqueio por limite falha na hora; release tem teto próprio.
import { assert, assertEquals, assertRejects } from "jsr:@std/assert";
import { syncContext } from "./locks.ts";

type Captured = { url: string; headers: Headers; body: string; signal?: AbortSignal | null };

function stubFetch(respond: (url: string, body: string) => Response) {
  const calls: Captured[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ url, headers: new Headers(init?.headers), body, signal: init?.signal });
    return respond(url, body);
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}

const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });
const SID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

Deno.test("todo pedido leva o dono; a coleta ativa vai no cabeçalho; release usa o mesmo dono", async () => {
  const f = stubFetch((url) => (url.includes("/rpc/") ? json(true) : json([])));
  try {
    const ctx = syncContext("https://origem.example", "chave-servico");
    await ctx.acquire(`collect:oura:${SID}:2026-09-14`);
    await ctx.db.from("oura_metrics").select("date").limit(1);
    await ctx.release(`collect:oura:${SID}:2026-09-14`);
    await ctx.db.from("oura_connections").select("id").limit(1);
    assert(f.calls.length >= 4);
    for (const c of f.calls) assertEquals(c.headers.get("x-wearable-sync-owner"), ctx.owner);
    const acquire = f.calls.find((c) => c.url.endsWith("/rpc/wearable_sync_acquire"))!;
    assertEquals(JSON.parse(acquire.body).p_owner, ctx.owner);
    assertEquals(f.calls[1].headers.get("x-wearable-sync-collection"), `collect:oura:${SID}:2026-09-14`);
    // Depois de soltar a coleta, pedidos seguintes não afirmam trava que não têm.
    assertEquals(f.calls.at(-1)!.headers.get("x-wearable-sync-collection"), null);
    const release = f.calls.find((c) => c.url.endsWith("/rpc/wearable_sync_release"))!;
    assertEquals(JSON.parse(release.body).p_owner, ctx.owner);
    assert(release.signal, "release precisa de teto de tempo próprio");
  } finally {
    f.restore();
  }
});

Deno.test("bloqueio por limite falha na hora (sem os 20 s de espera); erro de banco vira lock_unavailable", async () => {
  const blocked = stubFetch(() => json({ message: "sync_blocked", code: "P0001", details: "3600" }, 400));
  try {
    const t0 = Date.now();
    const err = await assertRejects(() => syncContext("https://origem.example", "k").acquire(`oauth:oura:${SID}`), Error, "sync_blocked");
    assertEquals((err as Error & { retryAfter?: number }).retryAfter, 3600);
    assert(Date.now() - t0 < 2000);
    assertEquals(blocked.calls.length, 1);
  } finally {
    blocked.restore();
  }
  const broken = stubFetch(() => json({ message: "connection refused" }, 500));
  try {
    await assertRejects(() => syncContext("https://origem.example", "k").acquire(`oauth:oura:${SID}`), Error, "lock_unavailable");
  } finally {
    broken.restore();
  }
});

Deno.test("block com chave restringe à coleta; sem chave vale para todas as chaves do dono", async () => {
  const f = stubFetch(() => json(null));
  try {
    const ctx = syncContext("https://origem.example", "k");
    await ctx.block(120, `collect:whoop:${SID}`);
    await ctx.block(60);
    const bodies = f.calls.filter((c) => c.url.endsWith("/rpc/wearable_sync_block")).map((c) => JSON.parse(c.body));
    assertEquals(bodies[0], { p_owner: ctx.owner, p_seconds: 120, p_key: `collect:whoop:${SID}` });
    assertEquals(bodies[1], { p_owner: ctx.owner, p_seconds: 60, p_key: null });
  } finally {
    f.restore();
  }
});
