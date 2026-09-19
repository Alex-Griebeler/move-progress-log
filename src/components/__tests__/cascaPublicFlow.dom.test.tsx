// @vitest-environment jsdom
/**
 * Revisão UX 18/09 — casca e fluxo público (UX-09, UX-10, UX-27).
 *  - "Concluir sem o Oura" leva ao fim do onboarding, nunca a uma rota da
 *    treinadora (antes: /alunos/:id → login).
 *  - Sidebar no celular: rótulos visíveis na folha, botão Fechar nomeado e a
 *    folha fecha ao navegar.
 *  - Busca global: grupo "Prescrições" (não "Prescriçãos").
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

afterEach(cleanup);

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => true }));
vi.mock("@/hooks/useUserRole", () => ({ useIsAdmin: () => ({ isAdmin: false }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: vi.fn(async () => ({ error: null })) } },
}));

import OuraErrorPage from "@/pages/OuraErrorPage";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SEARCH_GROUP_HEADINGS } from "@/constants/navigation";

const Where = () => {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
};

describe("OuraErrorPage — saída da aluna sem conta", () => {
  it("'Concluir sem o Oura' vai para a tela de cadastro concluído, não para /alunos", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/oura-error?student_id=abc&reason=access_denied"]}>
        <Routes>
          <Route path="/oura-error" element={<OuraErrorPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    // Sem convite válido não há "Tentar de novo": uma ação primária só.
    expect(screen.queryByRole("button", { name: /tentar de novo/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Concluir sem o Oura" }));
    const where = screen.getByTestId("where").textContent ?? "";
    expect(where.startsWith("/onboarding/success")).toBe(true);
    expect(where).not.toContain("/alunos");
    // Identidade Fabrik e sem emoji na superfície.
    expect(screen.queryByText(/💡|ℹ️/)).not.toBeInTheDocument();
  });
});

describe("AppSidebar no celular", () => {
  it("abre com rótulos visíveis, tem Fechar nomeado e fecha ao navegar", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TooltipProvider>
          <SidebarProvider>
            <SidebarTrigger aria-label="Abrir ou fechar o menu" />
            <AppSidebar />
            <Routes>
              <Route path="*" element={<Where />} />
            </Routes>
          </SidebarProvider>
        </TooltipProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir ou fechar o menu" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // Rótulo textual visível (não só ícone) e grupo nomeado.
    expect(screen.getByText("Operação")).toBeVisible();
    expect(screen.getByRole("button", { name: "Fechar menu" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Alunos" }));
    expect(screen.getByTestId("where").textContent).toBe("/alunos");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("GlobalSearch — rótulos dos grupos", () => {
  it("plural explícito em pt-BR", () => {
    expect(SEARCH_GROUP_HEADINGS.prescription).toBe("Prescrições");
    expect(Object.values(SEARCH_GROUP_HEADINGS)).not.toContain("Prescriçãos");
  });
});
