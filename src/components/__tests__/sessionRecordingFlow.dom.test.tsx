// @vitest-environment jsdom
/**
 * Onda 2 · Superfície 2 — testes COMPORTAMENTAIS do registro de sessão:
 *  - individual: entrada manual é o caminho padrão (voz vira atalho) e reusa
 *    ExerciseFirstSessionEntry com 1 pessoa;
 *  - guarda de saída: com gravação transcrita, o X e o "Voltar" pedem
 *    confirmação antes de descartar;
 *  - ExerciseFirstSessionEntry: Enter encadeia os campos; com 1 pessoa somem
 *    os controles de grupo;
 *  - grupo: a frase de erro parcial diz quem salvou e quem não.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

// ── Mocks de dados (nenhuma chamada de rede) ────────────────────────────────
const supabaseChain = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const m of ["select", "eq", "in", "order", "limit", "ilike", "insert", "update", "delete"]) chain[m] = vi.fn(self);
  chain.single = vi.fn(async () => ({ data: null, error: null }));
  chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
  return chain;
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(() => supabaseChain()), functions: { invoke: vi.fn() } },
}));

vi.mock("@tanstack/react-query", async (orig) => {
  const actual = await orig<typeof import("@tanstack/react-query")>();
  // Sem Provider no render: o diálogo usa useQueryClient para invalidar as
  // queries de sessão depois de gravar.
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

// Peças pesadas substituídas por stubs com o mesmo contrato de props.
vi.mock("../ExerciseSelectionDialog", () => ({ ExerciseSelectionDialog: () => null }));
vi.mock("../DraftHistoryDialog", () => ({ DraftHistoryDialog: () => null }));
vi.mock("../SessionContextForm", () => ({
  SessionContextForm: ({ onTrainerNameChange }: { onTrainerNameChange: (v: string) => void }) => (
    <button type="button" onClick={() => onTrainerNameChange("Ana Treinadora")}>escolher treinador</button>
  ),
}));
vi.mock("../MultiSegmentRecorder", () => ({
  MultiSegmentRecorder: ({ onSegmentsChange }: { onSegmentsChange?: (n: number) => void }) => (
    <button type="button" onClick={() => onSegmentsChange?.(1)}>simular trecho transcrito</button>
  ),
}));

import { RecordIndividualSessionDialog } from "../RecordIndividualSessionDialog";
import { ExerciseFirstSessionEntry } from "../ExerciseFirstSessionEntry";
import { describePartialGroupSave } from "../session/groupSaveOutcome";

const renderIndividual = (onOpenChange = vi.fn()) => {
  render(
    <RecordIndividualSessionDialog
      open
      onOpenChange={onOpenChange}
      studentId="s1"
      studentName="Bruna"
      initialPrescriptionId="p1"
    />,
  );
  return onOpenChange;
};

describe("RecordIndividualSessionDialog — manual como caminho padrão", () => {
  it("a ação primária é preencher manualmente; a voz é secundária", () => {
    renderIndividual();
    const manual = screen.getByRole("button", { name: "Preencher manualmente" });
    const voice = screen.getByRole("button", { name: "Gravar por voz" });
    expect(manual).toBeInTheDocument();
    expect(voice).toBeInTheDocument();
    // Um CTA: só o manual tem o estilo primário (bg-primary).
    expect(manual.className).toContain("bg-primary");
    expect(voice.className).not.toContain("bg-primary");
  });

  it("com prescrição, abre a entrada por exercício para uma pessoa só (sem controles de grupo)", async () => {
    const user = userEvent.setup();
    renderIndividual();
    await user.click(screen.getByRole("button", { name: "escolher treinador" }));
    await user.click(screen.getByRole("button", { name: "Preencher manualmente" }));
    expect(screen.getByText("Agachamento", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição da carga")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aplicar carga a todos/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/pessoas$/)).not.toBeInTheDocument();
  });
});

describe("RecordIndividualSessionDialog — guarda antes de descartar gravações", () => {
  beforeEach(() => vi.clearAllMocks());

  it("o X com trecho transcrito pede confirmação; 'Continuar registrando' mantém o diálogo", async () => {
    const user = userEvent.setup();
    const onOpenChange = renderIndividual();
    await user.click(screen.getByRole("button", { name: "escolher treinador" }));
    await user.click(screen.getByRole("button", { name: "Gravar por voz" }));
    await user.click(screen.getByRole("button", { name: "simular trecho transcrito" }));

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByText("A gravação transcrita será descartada.")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await user.click(within(confirm).getByRole("button", { name: "Continuar registrando" }));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: "simular trecho transcrito" })).toBeInTheDocument();
  });

  it("confirmar 'Descartar' fecha o diálogo", async () => {
    const user = userEvent.setup();
    const onOpenChange = renderIndividual();
    await user.click(screen.getByRole("button", { name: "escolher treinador" }));
    await user.click(screen.getByRole("button", { name: "Gravar por voz" }));
    await user.click(screen.getByRole("button", { name: "simular trecho transcrito" }));
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Descartar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sem nada gravado, 'Voltar' na gravação volta direto à configuração", async () => {
    const user = userEvent.setup();
    renderIndividual();
    await user.click(screen.getByRole("button", { name: "escolher treinador" }));
    await user.click(screen.getByRole("button", { name: "Gravar por voz" }));
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preencher manualmente" })).toBeInTheDocument();
  });

  it("com trecho gravado, 'Voltar' também pede confirmação", async () => {
    const user = userEvent.setup();
    renderIndividual();
    await user.click(screen.getByRole("button", { name: "escolher treinador" }));
    await user.click(screen.getByRole("button", { name: "Gravar por voz" }));
    await user.click(screen.getByRole("button", { name: "simular trecho transcrito" }));
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });
});

describe("ExerciseFirstSessionEntry — teclado e grupo", () => {
  const exercises = [
    { id: "pe1", exercise_library_id: "lib1", exercise_name: "Remada", sets: "3", reps: "10", interval_seconds: 60, pse: null, training_method: null, observations: null },
  ];
  const students = [
    { id: "a", name: "Ana" },
    { id: "b", name: "Bia" },
  ];

  it("Enter na carga vai para Reps; Enter no Total vai para a carga da próxima pessoa", async () => {
    const user = userEvent.setup();
    render(
      <ExerciseFirstSessionEntry
        prescriptionExercises={exercises}
        selectedStudents={students}
        date="2026-09-19"
        time="07:00"
        trainer="T"
        prescriptionId="p1"
        onSave={vi.fn()}
      />,
    );
    const loads = screen.getAllByLabelText("Descrição da carga");
    const reps = screen.getAllByLabelText("Reps");
    const totals = screen.getAllByLabelText("Total");
    await user.click(loads[0]);
    await user.keyboard("{Enter}");
    expect(reps[0]).toHaveFocus();
    await user.click(totals[0]);
    await user.keyboard("{Enter}");
    expect(loads[1]).toHaveFocus();
    expect(loads[0]).toHaveAttribute("enterkeyhint", "next");
    expect(totals[1]).toHaveAttribute("enterkeyhint", "done");
  });

  it("com várias pessoas mostra 'Aplicar carga a todos' com alvo de toque", () => {
    render(
      <ExerciseFirstSessionEntry
        prescriptionExercises={exercises}
        selectedStudents={students}
        date="2026-09-19"
        time="07:00"
        trainer="T"
        prescriptionId="p1"
        onSave={vi.fn()}
      />,
    );
    const apply = screen.getByRole("button", { name: /Aplicar carga a todos/ });
    expect(apply.className).toContain("min-h-11");
  });
});

describe("grupo — erro parcial fiel", () => {
  it("diz quem salvou, quem não, e que tentar de novo só envia as que faltam", () => {
    const text = describePartialGroupSave({
      saved: ["Ana", "Bia"],
      failed: [{ name: "Carla", reason: "rede" }],
    });
    expect(text).toBe("Salvas: Ana, Bia. Não salvas: Carla. Tentar de novo envia só as que faltam.");
  });

  it("quando nada entrou, não fala em 'salvas'", () => {
    const text = describePartialGroupSave({ saved: [], failed: [{ name: "Ana", reason: "rede" }] });
    expect(text).toBe("Nenhuma sessão foi salva (Ana). Tente de novo.");
  });
});
