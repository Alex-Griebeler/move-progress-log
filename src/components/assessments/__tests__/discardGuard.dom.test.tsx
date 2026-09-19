// @vitest-environment jsdom
/**
 * UX-01 (revisão UX 18/09) — guarda de saída dos formulários de avaliação.
 * Fechar (Esc, toque fora, "Cancelar") com dados digitados pede confirmação;
 * formulário limpo fecha direto. Usa o HandgripForm como representante: DEXA,
 * VO₂ bike/esteira e sentar-levantar usam o mesmo `useDiscardGuard`.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAssessments", () => ({
  useCreateAssessment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { HandgripForm } from "../HandgripForm";

afterEach(cleanup);

const setup = () => {
  const onOpenChange = vi.fn();
  render(<HandgripForm open onOpenChange={onOpenChange} studentId="s1" />);
  return { onOpenChange, user: userEvent.setup() };
};

describe("guarda de saída dos formulários de avaliação", () => {
  it("formulário limpo: Cancelar fecha direto, sem confirmação", async () => {
    const { onOpenChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText("Descartar teste de preensão não salvo?")).not.toBeInTheDocument();
  });

  it("com dado digitado: Esc pede confirmação; 'Continuar editando' preserva; 'Descartar' fecha", async () => {
    const { onOpenChange, user } = setup();
    const [firstAttempt] = screen.getAllByLabelText("Tentativa 1 (kg)");
    await user.type(firstAttempt, "32");

    await user.keyboard("{Escape}");
    expect(await screen.findByText("Descartar teste de preensão não salvo?")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Continuar editando" }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getAllByLabelText("Tentativa 1 (kg)")[0]).toHaveValue(32);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(await screen.findByRole("button", { name: "Descartar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
