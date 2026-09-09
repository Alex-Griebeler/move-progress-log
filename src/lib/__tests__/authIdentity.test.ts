/**
 * A-001 — unidade do modelo de identidade (src/lib/authIdentity.ts):
 * redutor de época e revogação/descarte do QueryClient de uma identidade.
 */
import { describe, expect, it, vi } from "vitest";
import { MutationObserver } from "@tanstack/react-query";
import {
  INITIAL_AUTH_IDENTITY,
  createIdentityQueryClient,
  disposeIdentityQueryClient,
  nextAuthIdentity,
  revokeIdentityQueryClient,
} from "../authIdentity";

const session = (id: string) => ({ user: { id } }) as Parameters<typeof nextAuthIdentity>[1];

/** Resolve "settled" se a promessa concluir em `ms`; senão "pending". */
const settledWithin = (p: Promise<unknown>, ms = 50) =>
  Promise.race([
    p.then(() => "settled", () => "settled"),
    new Promise<string>((r) => setTimeout(() => r("pending"), ms)),
  ]);

describe("nextAuthIdentity — época por identidade", () => {
  it("desconhecida → sem sessão → A → logout → B: cada transição abre uma época nova", () => {
    const s0 = INITIAL_AUTH_IDENTITY;
    const s1 = nextAuthIdentity(s0, null);
    const s2 = nextAuthIdentity(s1, session("a"));
    const s3 = nextAuthIdentity(s2, null);
    const s4 = nextAuthIdentity(s3, session("b"));
    expect(s1).toEqual({ status: "signed-out", userId: null, epoch: 1 });
    expect(s2).toEqual({ status: "signed-in", userId: "a", epoch: 2 });
    expect(s3).toEqual({ status: "signed-out", userId: null, epoch: 3 });
    expect(s4).toEqual({ status: "signed-in", userId: "b", epoch: 4 });
  });

  it("troca direta A→B (sem logout) e re-login do mesmo usuário após logout abrem época nova", () => {
    const a = nextAuthIdentity(INITIAL_AUTH_IDENTITY, session("a"));
    expect(nextAuthIdentity(a, session("b")).epoch).toBe(a.epoch + 1);
    const out = nextAuthIdentity(a, null);
    const aAgain = nextAuthIdentity(out, session("a"));
    expect(aAgain.epoch).toBe(a.epoch + 2);
  });

  it("evento da MESMA identidade (renovação de token) devolve a mesma referência", () => {
    const a = nextAuthIdentity(INITIAL_AUTH_IDENTITY, session("a"));
    expect(nextAuthIdentity(a, session("a"))).toBe(a);
    const out = nextAuthIdentity(a, null);
    expect(nextAuthIdentity(out, null)).toBe(out);
    expect(nextAuthIdentity(out, undefined)).toBe(out);
  });
});

describe("disposeIdentityQueryClient — revogação do client da identidade anterior", () => {
  it("antes da revogação o client é um QueryClient normal (query e mutação concluem)", async () => {
    const client = createIdentityQueryClient();
    await expect(client.fetchQuery({ queryKey: ["k"], queryFn: async () => 1 })).resolves.toBe(1);
    const onSuccess = vi.fn();
    const observer = new MutationObserver(client, { mutationFn: async (v: number) => v * 2, onSuccess });
    await expect(observer.mutate(2)).resolves.toBe(4);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("limpa o cache e cancela o fetch pendente: a resposta tardia não é publicada", async () => {
    const client = createIdentityQueryClient();
    let release!: (v: string[]) => void;
    const queryFn = vi.fn(() => new Promise<string[]>((r) => { release = r; }));
    const inflight = client.fetchQuery({ queryKey: ["students"], queryFn }).catch(() => "cancelled");
    expect(client.getQueryCache().getAll()).toHaveLength(1);

    disposeIdentityQueryClient(client);
    expect(client.getQueryCache().getAll()).toHaveLength(0);

    release(["A-Alice"]);
    // o chamador do fetchQuery (closure de A) não continua: nem com o cancelamento do clear()
    expect(await settledWithin(inflight)).toBe("pending");
    expect(client.getQueryData(["students"])).toBeUndefined();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it("invalidação PENDENTE no momento da revogação: o clear() cancela a query, mas o `await invalidateQueries()` do callback de A nunca continua", async () => {
    const client = createIdentityQueryClient();
    let release!: (v: string[]) => void;
    let calls = 0;
    const queryFn = vi.fn(() => {
      calls += 1;
      return calls === 1 ? Promise.resolve(["A-Alice"]) : new Promise<string[]>((r) => { release = r; });
    });
    await client.fetchQuery({ queryKey: ["students"], queryFn, staleTime: 0 });
    const after = vi.fn();
    // onSuccess de A em andamento: await invalidateQueries() → refetch preso na rede
    const callback = (async () => {
      // refetchType "all": sem observer montado o refetch não seria disparado
      await client.invalidateQueries({ queryKey: ["students"], refetchType: "all" });
      after("toast de A na sessão B");
    })();
    await vi.waitFor(() => expect(calls).toBe(2));

    disposeIdentityQueryClient(client); // revoga e limpa (cancela o refetch preso)
    release(["A-Alice"]);
    expect(await settledWithin(callback)).toBe("pending");
    expect(after).not.toHaveBeenCalled();
  });

  it("mutação em voo que conclui depois da revogação: nem callbacks de hook, nem mutateAsync resolvem (o write já enviado não é cancelado)", async () => {
    const client = createIdentityQueryClient();
    let release!: (v: string) => void;
    const mutationFn = vi.fn(() => new Promise<string>((r) => { release = r; }));
    const onSuccess = vi.fn();
    const onSettled = vi.fn();
    const onError = vi.fn();
    const observer = new MutationObserver(client, { mutationFn, onSuccess, onSettled, onError });
    const pending = observer.mutate("payload");
    await vi.waitFor(() => expect(mutationFn).toHaveBeenCalledTimes(1));

    disposeIdentityQueryClient(client);
    release("ok"); // servidor respondeu à escrita de A
    expect(await settledWithin(pending)).toBe("pending");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("mutação em voo que FALHA depois da revogação também fica em silêncio", async () => {
    const client = createIdentityQueryClient();
    let reject!: (e: Error) => void;
    const mutationFn = vi.fn(() => new Promise<string>((_r, rj) => { reject = rj; }));
    const onError = vi.fn();
    const onSettled = vi.fn();
    const observer = new MutationObserver(client, { mutationFn, onError, onSettled, retry: 0 });
    const pending = observer.mutate("payload").catch(() => "rejected");
    await vi.waitFor(() => expect(mutationFn).toHaveBeenCalledTimes(1));

    disposeIdentityQueryClient(client);
    reject(new Error("boom"));
    expect(await settledWithin(pending)).toBe("pending");
    expect(onError).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
  });

  it("mutação NOVA de uma closure antiga (observer retido) nunca executa o mutationFn", async () => {
    const client = createIdentityQueryClient();
    const mutationFn = vi.fn(async (v: string) => v);
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const observer = new MutationObserver(client, { mutationFn, onSuccess, onError });

    disposeIdentityQueryClient(client);
    const late = observer.mutate("escrita de A com o token de B");
    expect(await settledWithin(late)).toBe("pending");
    expect(mutationFn).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("mutação construída ANTES da revogação cujo mutationFn ainda não começou: nunca executa (mutate + dispose imediato)", async () => {
    const client = createIdentityQueryClient();
    const mutationFn = vi.fn(async (v: string) => v);
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const observer = new MutationObserver(client, { mutationFn, onSuccess, onError });
    const pending = observer.mutate("escrita de A"); // execute() aguarda onMutate antes de chamar o mutationFn
    disposeIdentityQueryClient(client);
    expect(await settledWithin(pending)).toBe("pending");
    expect(mutationFn).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("revogação no ÚLTIMO intervalo do execute (depois do onSettled, antes do return): mutateAsync não entrega, mesmo com re-render reaplicando opções", async () => {
    const client = createIdentityQueryClient();
    const mutationFn = vi.fn(async (v: string) => `privado de A: ${v}`);
    const onSuccess = vi.fn();
    // onSettled roda; a revogação chega no microtask seguinte — depois do último
    // callback guardado e antes do `dispatch success; return data`
    const onSettled = vi.fn(() => {
      queueMicrotask(() => revokeIdentityQueryClient(client));
    });
    const observer = new MutationObserver(client, { mutationFn, onSuccess, onSettled });
    const consumer = vi.fn();
    const pending = observer.mutate("payload").then(consumer);
    observer.setOptions({ mutationFn, onSuccess, onSettled, meta: { rerender: true } }); // re-render
    expect(await settledWithin(pending)).toBe("pending");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(consumer, "continuação do mutateAsync de A rodou na sessão B").not.toHaveBeenCalled();
  });

  it("sem onSettled no consumidor: a entrega do execute ainda é guardada", async () => {
    const client = createIdentityQueryClient();
    let release!: (v: string) => void;
    const mutationFn = vi.fn((_v: string) => new Promise<string>((r) => { release = r; }));
    const observer = new MutationObserver(client, { mutationFn });
    const consumer = vi.fn();
    const pending = observer.mutate("payload").then(consumer, consumer);
    await vi.waitFor(() => expect(mutationFn).toHaveBeenCalledTimes(1));
    release("ok");
    // revoga num microtask: depois do início da conclusão, antes de entregar
    await Promise.resolve();
    revokeIdentityQueryClient(client);
    expect(await settledWithin(pending)).toBe("pending");
    expect(consumer).not.toHaveBeenCalled();
  });

  it("fetchQuery/ensureQueryData com cache FRESCO (sem passar pelo fetch) também não entregam depois da revogação", async () => {
    const client = createIdentityQueryClient();
    client.setQueryData(["x"], "A");
    const queryFn = vi.fn(async () => "rede");
    const pending = client.fetchQuery({ queryKey: ["x"], queryFn, staleTime: Infinity });
    const ensured = client.ensureQueryData({ queryKey: ["x"], queryFn });
    disposeIdentityQueryClient(client);
    expect(await settledWithin(pending)).toBe("pending");
    expect(await settledWithin(ensured)).toBe("pending");
    expect(queryFn).not.toHaveBeenCalled();
  });

  it("query NOVA ou refetch de uma closure antiga nunca executa o queryFn; dispose é idempotente", async () => {
    const client = createIdentityQueryClient();
    const queryFn = vi.fn(async () => ["B-Bruna"]);
    await expect(client.fetchQuery({ queryKey: ["students"], queryFn, staleTime: 0 })).resolves.toEqual(["B-Bruna"]);
    expect(queryFn).toHaveBeenCalledTimes(1);

    disposeIdentityQueryClient(client);
    disposeIdentityQueryClient(client);
    const late = client.fetchQuery({ queryKey: ["students"], queryFn, staleTime: 0 });
    expect(await settledWithin(late)).toBe("pending");
    const lateOther = client.fetchQuery({ queryKey: ["other"], queryFn });
    expect(await settledWithin(lateOther)).toBe("pending");
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("callback já em andamento: a API assíncrona do client revogado nunca conclui (a continuação depois do await não roda)", async () => {
    const client = createIdentityQueryClient();
    await client.fetchQuery({ queryKey: ["students"], queryFn: async () => ["A-Alice"] });
    const after = vi.fn();
    // simula um onSuccess assíncrono de A: `await invalidateQueries(); notify.success()`
    const callback = (async () => {
      await client.invalidateQueries({ queryKey: ["students"] });
      after("invalidate");
    })();
    // …e a revogação chega enquanto ele ainda está em andamento? Não: aqui a
    // revogação já aconteceu quando o callback CHAMA a API — o caso coberto.
    await callback;
    expect(after).toHaveBeenCalledTimes(1);

    revokeIdentityQueryClient(client);
    const late = (async () => {
      await client.invalidateQueries({ queryKey: ["students"] });
      after("late-invalidate");
    })();
    const lateRefetch = client.refetchQueries({ queryKey: ["students"] });
    const lateCancel = client.cancelQueries({ queryKey: ["students"] });
    const lateReset = client.resetQueries({ queryKey: ["students"] });
    expect(await settledWithin(late)).toBe("pending");
    expect(await settledWithin(lateRefetch)).toBe("pending");
    expect(await settledWithin(lateCancel)).toBe("pending");
    expect(await settledWithin(lateReset)).toBe("pending");
    expect(after).toHaveBeenCalledTimes(1);
    // clear() continua funcionando após a revogação (descarte)
    client.clear();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it("revogação é síncrona e desliga o GC das mutações pendentes (sem timer eterno de retenção)", async () => {
    vi.useFakeTimers();
    try {
      const client = createIdentityQueryClient();
      let release!: (v: string) => void;
      const mutationFn = vi.fn((_v: string) => new Promise<string>((r) => { release = r; }));
      const observer = new MutationObserver(client, { mutationFn, gcTime: 1000 });
      const unsubscribe = observer.subscribe(() => {});
      const pending = observer.mutate("payload");
      await vi.advanceTimersByTimeAsync(0);
      expect(mutationFn).toHaveBeenCalledTimes(1);
      const mutation = client.getMutationCache().getAll()[0];
      expect(mutation).toBeDefined();

      revokeIdentityQueryClient(client); // síncrono: já barra antes de qualquer commit do React
      expect(mutation.options.gcTime).toBe(Infinity);
      client.clear();
      // ordem hostil: o componente de A desmonta DEPOIS do descarte (reagendaria o GC)
      unsubscribe();
      release("ok");
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount(), "timer de GC vivo mantendo a mutação de A").toBe(0);
      await vi.advanceTimersByTimeAsync(10 * 60_000);
      expect(vi.getTimerCount()).toBe(0);
      expect(mutation.state.status).toBe("pending");
      void pending.catch(() => {});
    } finally {
      vi.useRealTimers();
    }
  });
});
