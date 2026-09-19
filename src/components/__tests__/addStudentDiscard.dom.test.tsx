// @vitest-environment jsdom
/**
 * Revisão UX 18/09 — "saída de formulário com dados → confirmação".
 * Cadastro novo: fechar com campos preenchidos pede confirmação; sem dados,
 * fecha direto; "Continuar editando" preserva o que foi digitado.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

// jsdom não tem ResizeObserver (usado pelo Checkbox do Radix).
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock("@/hooks/useStudents", () => ({
  useCreateStudent: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { AddStudentDialog } from "@/components/AddStudentDialog";

describe("AddStudentDialog — guarda de saída", () => {
  it("sem dados, Cancelar fecha direto", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<AddStudentDialog open onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText("Descartar o que foi preenchido?")).not.toBeInTheDocument();
  });

  it("com nome digitado, Cancelar pede confirmação; Continuar editando preserva; Descartar fecha", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<AddStudentDialog open onOpenChange={onOpenChange} />);
    const nameInput = screen.getAllByRole("textbox")[0];
    await user.type(nameInput, "Maria Silva");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(await screen.findByText("Descartar o que foi preenchido?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continuar editando" }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Maria Silva")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(await screen.findByRole("button", { name: "Descartar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Descartar limpa formulário E foto: ao reabrir não sobra nada do cadastro descartado", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender, container } = render(<AddStudentDialog open onOpenChange={onOpenChange} />);
    await user.type(screen.getAllByRole("textbox")[0], "Maria Silva");
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    await user.upload(fileInput, new File(["x"], "foto.png", { type: "image/png" }));
    expect(await screen.findByText(/Alterar Foto/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(await screen.findByRole("button", { name: "Descartar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(<AddStudentDialog open={false} onOpenChange={onOpenChange} />);
    rerender(<AddStudentDialog open onOpenChange={onOpenChange} />);
    expect(screen.queryByDisplayValue("Maria Silva")).not.toBeInTheDocument();
    expect(screen.queryByText(/Alterar Foto/i)).not.toBeInTheDocument();
    void container;
  });
});
