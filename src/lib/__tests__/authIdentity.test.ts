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
    await inflight;
    expect(client.getQueryData(["students"])).toBeUndefined();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
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
});
