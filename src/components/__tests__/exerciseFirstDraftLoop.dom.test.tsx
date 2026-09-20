// @vitest-environment jsdom
/**
 * Auditoria técnica de 20/09 (fase 4) — o salvamento automático não pode
 * desfazer o que está sendo digitado.
 *
 * A restauração de rascunho escutava `draft`, que muda TAMBÉM a cada
 * salvamento automático. Cerca de um segundo depois da primeira digitação, o
 * componente restaurava o rascunho que ele mesmo tinha acabado de gravar: a
 * PSE voltava à prescrita e a tela pulava para o primeiro exercício.
 *
 * Aqui o hook é dublê: emite a mudança de `draft` (autosave) mantendo
 * `storedDraft` nulo, que é o caso de uma sessão sem rascunho anterior.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const { draftState } = vi.hoisted(() => ({
  draftState: { emitAutosave: null as null | (() => void) },
}));

vi.mock("@/hooks/useSessionDraft", async () => {
  const { useState } = await import("react");
  return {
    useSessionDraft: () => {
      const [draft, setDraft] = useState<unknown>(null);
      draftState.emitAutosave = () => setDraft({ timestamp: new Date().toISOString(), studentExercises: { s1: [] } });
      return {
        draft,
        storedDraft: null, // nada gravado antes: a tela não deve ser repovoada
        saveDraft: vi.fn(),
        clearDraft: vi.fn(),
        restoreDraft: vi.fn(),
        isSaving: false,
        lastSaved: null,
        hasUnsavedChanges: () => false,
      };
    },
  };
});
vi.mock("@/hooks/useExerciseLastSession", () => ({ useExerciseLastSession: () => ({ data: undefined }) }));
vi.mock("@/hooks/useExercisesLibrary", () => ({ useExercisesLibrary: () => ({ data: [] }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock("../ExerciseSelectionDialog", () => ({ ExerciseSelectionDialog: () => null }));
vi.mock("../DraftHistoryDialog", () => ({ DraftHistoryDialog: () => null }));

import { ExerciseFirstSessionEntry } from "../ExerciseFirstSessionEntry";

const prescriptionExercises = [
  { id: "pe1", exercise_library_id: "lib1", exercise_name: "Agachamento", sets: "3", reps: "8", interval_seconds: 60, pse: "7", training_method: null, observations: null },
  { id: "pe2", exercise_library_id: "lib2", exercise_name: "Remada", sets: "3", reps: "10", interval_seconds: 60, pse: "7", training_method: null, observations: null },
];

const renderEntry = () =>
  render(
    <ExerciseFirstSessionEntry
      prescriptionExercises={prescriptionExercises}
      selectedStudents={[{ id: "s1", name: "Bruna" }]}
      date="2026-09-20"
      time="07:00"
      trainer="Ana"
      prescriptionId="p1"
      onSave={vi.fn()}
    />,
  );

describe("ExerciseFirstSessionEntry — o autosave não desfaz a digitação", () => {
  it("a PSE digitada sobrevive ao salvamento automático", async () => {
    const user = userEvent.setup();
    renderEntry();

    const pse = screen.getByLabelText("PSE");
    await user.clear(pse);
    await user.type(pse, "9, últimas difíceis");
    expect(pse).toHaveValue("9, últimas difíceis");

    // O autosave grava e o hook publica o novo rascunho.
    act(() => { draftState.emitAutosave?.(); });

    expect(screen.getByLabelText("PSE")).toHaveValue("9, últimas difíceis");
  });

  it("a tela não volta para o primeiro exercício depois do salvamento", async () => {
    const user = userEvent.setup();
    renderEntry();

    await user.click(screen.getByRole("button", { name: "Ir para próximo exercício" }));
    expect(screen.getByText("Remada", { selector: "h3" })).toBeInTheDocument();

    act(() => { draftState.emitAutosave?.(); });

    expect(screen.getByText("Remada", { selector: "h3" })).toBeInTheDocument();
  });
});
