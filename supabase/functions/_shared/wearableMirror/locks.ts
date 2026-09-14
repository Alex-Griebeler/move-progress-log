// Cliente interno com proprietário por requisição. Triggers SQL fazem o fencing na escrita.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
export function syncContext(url: string, key: string) {
  const owner = crypto.randomUUID();
  const deadline = Date.now() + 80_000;
  const db = createClient(url, key, {
    global: {
      headers: { "x-wearable-sync-owner": owner },
      fetch: (input, init) => {
        const releasing = String(input).endsWith("/rpc/wearable_sync_release");
        const timeout = AbortSignal.timeout(
          releasing ? 5000 : Math.max(1, deadline - Date.now()),
        );
        const headers = new Headers(init?.headers);
        const collection = [...held].find((k) => k.startsWith("collect:"));
        if (collection) headers.set("x-wearable-sync-collection", collection);
        return fetch(input, {
          ...init,
          headers,
          signal: init?.signal
            ? AbortSignal.any([init.signal, timeout])
            : timeout,
        });
      },
    },
    auth: { persistSession: false },
  });
  const held = new Set<string>();
  return {
    db,
    owner,
    remainingSignal: () =>
      AbortSignal.timeout(Math.max(1, deadline - Date.now())),
    signal: () =>
      AbortSignal.timeout(Math.max(1, Math.min(15000, deadline - Date.now()))),
    async acquire(lock: string) {
      const until = Math.min(deadline, Date.now() + 20000);
      do {
        const { data, error } = await db.rpc("wearable_sync_acquire", {
          p_key: lock,
          p_owner: owner,
        });
        // Chave bloqueada por limite do provedor: falha na hora, sem os 20 s de espera, levando os segundos restantes.
        if (error && /sync_blocked/.test(error.message ?? "")) {
          const seconds = Number(error.details);
          throw Object.assign(new Error("sync_blocked"), {
            retryAfter: Number.isFinite(seconds) && seconds > 0 ? Math.min(86400, Math.ceil(seconds)) : 60,
          });
        }
        if (error) throw new Error("lock_unavailable");
        if (data === true) {
          held.add(lock);
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
      } while (Date.now() < until);
      throw new Error("sync_busy");
    },
    async release(lock: string) {
      const { error } = await db.rpc("wearable_sync_release", {
        p_key: lock,
        p_owner: owner,
      });
      if (error) throw new Error("lock_release_failed");
      held.delete(lock);
    },
    /** Sem `key`, bloqueia todas as chaves deste dono (limite no endpoint de token); com `key`, só ela. */
    async block(seconds: number, key?: string) {
      await db.rpc("wearable_sync_block", {
        p_owner: owner,
        p_seconds: seconds,
        p_key: key ?? null,
      });
    },
    async close() {
      for (const lock of held) {
        await db.rpc("wearable_sync_release", {
          p_key: lock,
          p_owner: owner,
        });
      }
    },
  };
}

// Logger local de cada handler: não altera console global e nunca encaminha payloads/erros.
export const mirrorLogger = {
  log: (..._args: unknown[]) => console.log("wearable_sync_event"),
  warn: (..._args: unknown[]) => console.warn("wearable_sync_warning"),
  error: (..._args: unknown[]) => console.error("wearable_sync_failed"),
};
