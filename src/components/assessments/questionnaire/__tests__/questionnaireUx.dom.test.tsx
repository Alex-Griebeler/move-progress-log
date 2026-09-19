// @vitest-environment jsdom
/**
 * Revisão UX 18/09 — questionário público Precision 12.
 *  - UX-11: tela de abertura antes da Tela 1 (fora da contagem).
 *  - UX-12: um único título por tela (sem h3 + h2 repetindo o nome).
 *  - UX-13: a moldura inteira da opção é clicável.
 *  - UX-10: erro de envio não desmonta o formulário (invariante de código).
 */
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuestionnaireFlow } from "../QuestionnaireFlow";

afterEach(cleanup);

// Radix (radio/checkbox) mede o item com ResizeObserver; jsdom não tem.
window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof window.ResizeObserver;

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(
  resolve(__dirname, "../../../../pages/PrecisionQuestionnairePage.tsx"),
  "utf-8",
);

describe("QuestionnaireFlow — abertura e cabeçalho", () => {
  it("abre na tela de apresentação e só então mostra a Tela 1 com um título", async () => {
    const user = userEvent.setup();
    render(<QuestionnaireFlow requireBirthdate={false} onSubmit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Questionário Precision 12" })).toBeInTheDocument();
    expect(screen.getByText(/não guarda respostas parciais/)).toBeInTheDocument();
    expect(screen.queryByText("Tela 1 de 8")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Começar" }));

    expect(screen.getByText("Tela 1 de 8")).toBeInTheDocument();
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Identificação");
  });

  it("opção de rádio: tocar na moldura (fora do círculo) seleciona", async () => {
    const user = userEvent.setup();
    render(<QuestionnaireFlow requireBirthdate={false} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Começar" }));

    const radios = screen.getAllByRole("radio");
    const first = radios[0];
    const frame = first.closest("label");
    expect(frame).not.toBeNull();
    expect(frame!.className).toContain("min-h-11");
    await user.click(frame!);
    expect(first).toHaveAttribute("aria-checked", "true");
  });
});

describe("PrecisionQuestionnairePage — erro de envio preserva respostas", () => {
  it("não há estado que desmonte o formulário nem botão de recarregar", () => {
    expect(pageSource).not.toContain("window.location.reload");
    expect(pageSource).not.toContain('kind: "submitting"');
    expect(pageSource).toContain("submitError={state.submitError}");
  });
});
