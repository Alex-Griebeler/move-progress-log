// @vitest-environment jsdom
/**
 * Auditoria técnica de 20/09 (fase 4) — editar uma sessão nunca pode apagar
 * os exercícios de outra.
 *
 * O diálogo não limpava o estado entre aberturas: se a leitura da sessão B
 * falhasse, a tela seguia mostrando os exercícios de A e "Salvar" rodava
 * `DELETE … WHERE session_id = B AND id NOT IN (ids de A)` — apagava tudo da
 * sessão B e ainda avisava sucesso.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const { state, deletedFrom } = vi.hoisted(() => ({
  state: { sessionLoadFails: false },
  deletedFrom: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const c: Record<string, unknown> = {};
    const self = () => c;
    for (const m of ["select", "eq", "in", "order", "limit", "insert", "update", "not"]) c[m] = vi.fn(self);
    c.delete = vi.fn(() => { deletedFrom.push(table); return c; });
    c.single = vi.fn(async () =>
      state.sessionLoadFails
        ? { data: null, error: { message: "rede indisponível" } }
        : {
            data: {
              id: "sess-A", date: "2026-09-20", time: "07:00", session_type: "individual",
              workout_name: "Força A", trainer_name: "Ana", room_name: null, is_finalized: false,
              student: { id: "s1", name: "Bruna", avatar_url: null },
            },
            error: null,
          },
    );
    c.then = (resolve: (v: unknown) => void) =>
      resolve({
        data: [
          { id: "ex-1", exercise_library_id: "lib1", exercise_name: "Agachamento", sets: 3, reps: 8, reserve_reps: null, load_kg: 40, load_breakdown: "2x20", observations: null, is_best_set: false },
        ],
        error: null,
      });
    return c;
  };
  return { supabase: { from: vi.fn((t: string) => chain(t)), functions: { invoke: vi.fn() } } };
});

vi.mock("@tanstack/react-query", async (orig) => {
  const actual = await orig<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: vi.fn(() => ({ data: undefined })), useQueryClient: vi.fn(() => ({})) };
});
vi.mock("@/hooks/sessionQueryInvalidation", () => ({ invalidateSessionQueries: vi.fn(async () => {}) }));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock("../ExerciseSelectionDialog", () => ({ ExerciseSelectionDialog: () => null }));

import { EditSessionDialog } from "../EditSessionDialog";

describe("EditSessionDialog — leitura que falha não deixa gravar", () => {
  beforeEach(() => {
    state.sessionLoadFails = false;
    deletedFrom.length = 0;
  });

  it("com a sessão carregada, o botão de salvar está na tela", async () => {
    render(<EditSessionDialog open onOpenChange={vi.fn()} sessionId="sess-A" />);
    expect(await screen.findByDisplayValue("Agachamento")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar rascunho" })).toBeInTheDocument();
  });

  it("quando a leitura falha, some o salvar e aparece 'Tentar novamente'", async () => {
    state.sessionLoadFails = true;
    render(<EditSessionDialog open onOpenChange={vi.fn()} sessionId="sess-B" />);

    expect(await screen.findByText("Não foi possível carregar a sessão")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar rascunho" })).not.toBeInTheDocument();
    expect(deletedFrom).toHaveLength(0);
  });

  it("trocar de sessão não deixa na tela os exercícios da anterior", async () => {
    const { rerender } = render(<EditSessionDialog open onOpenChange={vi.fn()} sessionId="sess-A" />);
    expect(await screen.findByDisplayValue("Agachamento")).toBeInTheDocument();

    state.sessionLoadFails = true;
    rerender(<EditSessionDialog open onOpenChange={vi.fn()} sessionId="sess-B" />);

    await waitFor(() => expect(screen.queryByDisplayValue("Agachamento")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Salvar rascunho" })).not.toBeInTheDocument();
    expect(deletedFrom).toHaveLength(0);
  });
});
