// @vitest-environment jsdom
/**
 * PR-A do redesign premium — teste-fumaça da infraestrutura DOM (RTL/jsdom,
 * emenda v5.1-20) + contrato do InfoDisclosure (emenda E14):
 * gatilho é <button> com nome acessível contextual, abre no clique, fecha no
 * Escape. A suíte segue Node por padrão; DOM é opt-in por arquivo.
 */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import InfoDisclosure from "../InfoDisclosure";

describe("InfoDisclosure — contrato de acessibilidade (E14)", () => {
  it("gatilho é botão nomeado pelo label contextual; conteúdo abre no clique e fecha no Escape", async () => {
    const user = userEvent.setup();
    render(
      <InfoDisclosure label="Detalhes da sincronização do Whoop">
        <p>Desatualizado há mais de 3h.</p>
      </InfoDisclosure>,
    );

    const trigger = screen.getByRole("button", {
      name: "Detalhes da sincronização do Whoop",
    });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByText("Desatualizado há mais de 3h.")).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByText("Desatualizado há mais de 3h.")).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByText("Desatualizado há mais de 3h.")).not.toBeInTheDocument();
  });

  it("ações dentro do conteúdo funcionam (contrato: popover pode conter botão)", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <InfoDisclosure label="Detalhes do alerta de Sono">
        <button type="button" onClick={() => { clicked = true; }}>
          Sincronizar agora
        </button>
      </InfoDisclosure>,
    );

    await user.click(screen.getByRole("button", { name: "Detalhes do alerta de Sono" }));
    await user.click(screen.getByRole("button", { name: "Sincronizar agora" }));
    expect(clicked).toBe(true);
  });
});
