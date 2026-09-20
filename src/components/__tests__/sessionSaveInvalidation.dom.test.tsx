// @vitest-environment jsdom
/**
 * Auditoria técnica de 20/09 (fase 4) — a sessão gravada tem de aparecer na
 * tela sem recarregar a página.
 *
 * As queries de sessão têm `refetchOnMount: false` e `refetchOnWindowFocus:
 * false` (src/hooks/useAllSessions.ts) com `staleTime` de 2 min: quem grava
 * precisa invalidar. O caminho por voz em grupo já fazia isso pelo
 * `onSuccess` do hook de mutação; os caminhos MANUAIS gravam direto no banco
 * e não invalidavam nada — a aba Sessões, a carga sugerida e os indicadores
 * ficavam mostrando o estado anterior.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const { invalidateSessionQueries } = vi.hoisted(() => ({ invalidateSessionQueries: vi.fn(async () => {}) }));
vi.mock("@/hooks/sessionQueryInvalidation", () => ({ invalidateSessionQueries }));

// Banco de mentira: a criação da sessão devolve um id; o resto passa.
const { insertedTables } = vi.hoisted(() => ({ insertedTables: [] as string[] }));
const supabaseChain = (table: string) => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const m of ["select", "eq", "in", "order", "limit", "ilike", "update", "delete"]) chain[m] = vi.fn(self);
  chain.insert = vi.fn((...args: unknown[]) => {
    insertedTables.push(table);
    void args;
    return chain;
  });
  chain.single = vi.fn(async () => ({ data: { id: "sess-1" }, error: null }));
  chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
  return chain;
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn((table: string) => supabaseChain(table)), functions: { invoke: vi.fn() } },
}));

vi.mock("@tanstack/react-query", async (orig) => {
  const actual = await orig<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: vi.fn(() => ({ data: undefined })), useQueryClient: vi.fn(() => ({})) };
});

const prescriptionDetails = {
  id: "p1",
  name: "Força A",
  exercises: [
    { id: "pe1", exercise_library_id: "lib1", exercise_name: "Agachamento", sets: "3", reps: "8", rir: null, interval_seconds: 90, pse: "7", training_method: null, observations: null, should_track: true, category: "forca" },
  ],
};
vi.mock("@/hooks/usePrescriptions", () => ({
  usePrescriptionDetails: vi.fn((id: string | null) => ({ data: id ? prescriptionDetails : null })),
}));
vi.mock("@/hooks/useExercisesLibrary", () => ({ useExercisesLibrary: () => ({ data: [] }) }));
vi.mock("@/hooks/useExerciseReplacement", () => ({
  useExerciseReplacement: () => ({
    exerciseSelectionOpen: false,
    setExerciseSelectionOpen: vi.fn(),
    selectedExerciseForReplacement: null,
    openExerciseSelection: vi.fn(),
    handleExerciseSelected: vi.fn(),
  }),
}));
vi.mock("@/hooks/useExerciseLastSession", () => ({ useExerciseLastSession: () => ({ data: undefined }) }));
vi.mock("@/hooks/useSessionDraft", () => ({
  useSessionDraft: () => ({
    draft: null,
    saveDraft: vi.fn(),
    clearDraft: vi.fn(),
    restoreDraft: vi.fn(),
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: () => false,
  }),
}));
vi.mock("@/lib/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock("../ExerciseSelectionDialog", () => ({ ExerciseSelectionDialog: () => null }));
vi.mock("../DraftHistoryDialog", () => ({ DraftHistoryDialog: () => null }));
vi.mock("../SessionContextForm", () => ({
  SessionContextForm: ({ onTrainerNameChange }: { onTrainerNameChange: (v: string) => void }) => (
    <button type="button" onClick={() => onTrainerNameChange("Ana Treinadora")}>escolher treinador</button>
  ),
}));
vi.mock("../MultiSegmentRecorder", () => ({ MultiSegmentRecorder: () => null }));

import { RecordIndividualSessionDialog } from "../RecordIndividualSessionDialog";

describe("Gravação manual individual — a tela é atualizada depois de salvar", () => {
  it("salvar a sessão invalida as queries de sessão da aluna", async () => {
    const user = userEvent.setup();
    render(
      <RecordIndividualSessionDialog
        open
        onOpenChange={vi.fn()}
        studentId="s1"
        studentName="Bruna"
        initialPrescriptionId="p1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "escolher treinador" }));
    await user.click(screen.getByRole("button", { name: "Preencher manualmente" }));

    await user.type(screen.getByLabelText("Descrição da carga"), "2x24");
    await user.type(screen.getByLabelText("Reps"), "8");

    const save = screen.getByRole("button", { name: /Salvar sessão/ });
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() => expect(insertedTables).toContain("workout_sessions"));
    await waitFor(() =>
      expect(invalidateSessionQueries).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ studentId: "s1", includeStudentsData: true }),
      ),
    );
  });
});
