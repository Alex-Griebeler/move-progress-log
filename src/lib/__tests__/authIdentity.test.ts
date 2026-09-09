/**
 * A-001 — unidade do modelo de identidade (src/lib/authIdentity.ts):
 * redutor de época e descarte do QueryClient de uma identidade anterior.
 */
import { describe, expect, it, vi } from "vitest";
import { MutationObserver } from "@tanstack/react-query";
import {
  INITIAL_AUTH_IDENTITY,
  createAppQueryClient,
  disposeIdentityQueryClient,
  nextAuthIdentity,
} from "../authIdentity";

const session = (id: string) => ({ user: { id } }) as Parameters<typeof nextAuthIdentity>[1];

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

describe("disposeIdentityQueryClient — descarte do client da identidade anterior", () => {
  it("limpa o cache e cancela o fetch pendente: a resposta tardia não é publicada", async () => {
    const client = createAppQueryClient();
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

  it("desarma os callbacks de hook de uma mutação em voo; o write em si não é cancelado", async () => {
    const client = createAppQueryClient();
    let release!: (v: string) => void;
    const mutationFn = vi.fn(() => new Promise<string>((r) => { release = r; }));
    const onSuccess = vi.fn();
    const onSettled = vi.fn();
    const onError = vi.fn();
    const observer = new MutationObserver(client, { mutationFn, onSuccess, onSettled, onError });
    const pending = observer.mutate("payload");
    await vi.waitFor(() => expect(mutationFn).toHaveBeenCalledTimes(1));

    disposeIdentityQueryClient(client);
    release("ok");
    await expect(pending).resolves.toBe("ok"); // a promessa do write continua, sem callbacks de publicação
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
