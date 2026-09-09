// @vitest-environment jsdom
/**
 * A-001 — toasters REAIS (sonner + shadcn) na troca de identidade.
 *
 * Toast é estado global fora da casca privada. Prova, com os componentes e o
 * `notify` de produção (sem mock), que: (a) notificação publicada na época de
 * A — visível OU ainda na fila de inserção do sonner (setTimeout) — nunca
 * aparece na sessão B; (b) B publica normalmente depois; (c) renovação de
 * token da mesma identidade não derruba um toast legítimo.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeUser = { id: string; email: string };
type FakeSession = { user: FakeUser; access_token: string } | null;
type AuthCallback = (event: string, session: FakeSession) => void;

const fake = vi.hoisted(() => {
  const state = { session: null as FakeSession, listeners: new Set<AuthCallback>() };
  const emit = (event: string, session: FakeSession) => {
    for (const cb of Array.from(state.listeners)) cb(event, session);
  };
  const client = {
    from: vi.fn(),
    auth: {
      onAuthStateChange: (cb: AuthCallback) => {
        state.listeners.add(cb);
        queueMicrotask(() => {
          if (state.listeners.has(cb)) cb("INITIAL_SESSION", state.session);
        });
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                state.listeners.delete(cb);
              },
            },
          },
        };
      },
      getSession: async () => ({ data: { session: state.session }, error: null }),
    },
  };
  return { state, client, emit };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: fake.client }));

import { AuthProvider } from "@/contexts/AuthContext";
import { AppToasters } from "@/components/AppToasters";
import { notify } from "@/lib/notify";
import { toast as shadcnToast } from "@/hooks/use-toast";

const userA: FakeUser = { id: "user-a", email: "a@example.test" };
const userB: FakeUser = { id: "user-b", email: "b@example.test" };
const sessionOf = (user: FakeUser, token = "t1"): FakeSession => ({ user, access_token: `${user.id}-${token}` });

const flushTimers = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });

beforeEach(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  fake.state.session = sessionOf(userA);
  fake.state.listeners.clear();
});
afterEach(cleanup);

describe("A-001 — toasters reais remontados por época de identidade", () => {
  it("toasts de A (visíveis e ainda na fila do sonner) somem na troca para B; B publica normalmente; refresh do token preserva", async () => {
    render(
      <AuthProvider>
        <AppToasters />
      </AuthProvider>,
    );
    await flushTimers();

    // A publica nos DOIS sistemas (e guarda o handle do shadcn para atualizar depois)
    let shadcnHandle!: ReturnType<typeof shadcnToast>;
    await act(async () => {
      notify.success("sonner: aluna privada de A");
      shadcnHandle = shadcnToast({ title: "shadcn: dado privado de A" });
    });
    await flushTimers();
    expect(screen.getByText("sonner: aluna privada de A")).toBeInTheDocument();
    expect(screen.getByText("shadcn: dado privado de A")).toBeInTheDocument();

    // renovação de token da MESMA identidade: nada é derrubado
    await act(async () => {
      fake.state.session = sessionOf(userA, "t2");
      fake.emit("TOKEN_REFRESHED", fake.state.session);
    });
    await flushTimers();
    expect(screen.getByText("sonner: aluna privada de A")).toBeInTheDocument();

    // troca direta A→B; uma continuação antiga ainda publica no microtask
    // seguinte ao evento (inserção do sonner agendada DEPOIS do evento)
    await act(async () => {
      fake.state.session = sessionOf(userB);
      fake.emit("SIGNED_IN", fake.state.session);
      queueMicrotask(() => notify.loading("sonner tardio: Aluno: aluna de A"));
      await Promise.resolve();
    });
    await flushTimers();
    await flushTimers();
    expect(screen.queryByText("sonner: aluna privada de A")).not.toBeInTheDocument();
    expect(screen.queryByText("sonner tardio: Aluno: aluna de A")).not.toBeInTheDocument();
    expect(screen.queryByText("shadcn: dado privado de A")).not.toBeInTheDocument();
    // update antigo por id no store do shadcn (reabrir) não ressuscita o toast de A
    await act(async () => {
      shadcnHandle.update({ id: shadcnHandle.id, title: "shadcn: dado privado de A (update)", open: true });
    });
    await flushTimers();
    expect(screen.queryByText("shadcn: dado privado de A (update)")).not.toBeInTheDocument();

    // B publica depois de montar: aparece
    await act(async () => {
      notify.success("sonner: Login realizado de B");
      shadcnToast({ title: "shadcn: aviso de B" });
    });
    await flushTimers();
    expect(screen.getByText("sonner: Login realizado de B")).toBeInTheDocument();
    expect(screen.getByText("shadcn: aviso de B")).toBeInTheDocument();
  });

  it("logout: toasts privados não ficam na tela pública", async () => {
    render(
      <AuthProvider>
        <AppToasters />
      </AuthProvider>,
    );
    await flushTimers();
    await act(async () => {
      notify.error("erro privado de A", { description: "Aluno: aluna de A" });
    });
    await flushTimers();
    expect(screen.getByText("Aluno: aluna de A")).toBeInTheDocument();

    await act(async () => {
      fake.state.session = null;
      fake.emit("SIGNED_OUT", null);
    });
    await flushTimers();
    expect(screen.queryByText("Aluno: aluna de A")).not.toBeInTheDocument();
    expect(screen.queryByText("erro privado de A")).not.toBeInTheDocument();
  });
});
