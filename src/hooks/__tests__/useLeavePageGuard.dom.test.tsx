// @vitest-environment jsdom
/**
 * Guarda de saída com o histórico REAL do jsdom (sem mocks) — caminhos
 * apontados nas revisões da #368.
 */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEAVE_GUARD_HISTORY, useLeavePageGuard } from "../useLeavePageGuard";

// Desmontar com a guarda ativa consome a sentinela de forma assíncrona
// (history.back): espera assentar para não vazar para o teste seguinte.
afterEach(async () => {
  cleanup();
  await new Promise((r) => setTimeout(r, 50));
});

const isSentinel = () => Boolean((window.history.state as { fabrikLeaveGuard?: boolean } | null)?.fabrikLeaveGuard);
const back = async () => {
  const before = window.history.length;
  await act(async () => {
    window.history.back();
    await new Promise((r) => setTimeout(r, 30));
  });
  return before;
};

describe("useLeavePageGuard — histórico real", () => {
  beforeEach(() => {
    // página anterior + página da revisão (estado no formato do React Router)
    window.history.pushState({ usr: null, key: "prev", idx: 1 }, "", "/alunos");
    window.history.pushState({ usr: null, key: "rev", idx: 2 }, "", "/admin/revisao-exercicios");
  });

  it("sem edições: nada empilha e Voltar sai normalmente", async () => {
    const onBlocked = vi.fn();
    renderHook(() => useLeavePageGuard(false, onBlocked));
    expect(isSentinel()).toBe(false);
    await back();
    expect(window.location.pathname).toBe("/alunos");
    expect(onBlocked).not.toHaveBeenCalled();
  });

  it("com edições: sentinela no topo preserva o estado do roteador", () => {
    renderHook(() => useLeavePageGuard(true, vi.fn()));
    expect(isSentinel()).toBe(true);
    expect(window.history.state).toMatchObject({ key: "rev", idx: 2 });
    expect(window.location.pathname).toBe("/admin/revisao-exercicios");
  });

  it("Voltar com edições: fica na página, recoloca a sentinela e pede confirmação — também com o diálogo já aberto", async () => {
    const onBlocked = vi.fn();
    renderHook(() => useLeavePageGuard(true, onBlocked));
    await back();
    await waitFor(() => expect(onBlocked).toHaveBeenCalledWith(LEAVE_GUARD_HISTORY));
    expect(window.location.pathname).toBe("/admin/revisao-exercicios");
    expect(isSentinel()).toBe(true);
    await back(); // segundo Voltar com o diálogo aberto
    await waitFor(() => expect(onBlocked).toHaveBeenCalledTimes(2));
    expect(window.location.pathname).toBe("/admin/revisao-exercicios");
  });

  it("'Sair sem salvar' depois de um Voltar leva à página anterior, sem reabrir o diálogo", async () => {
    const onBlocked = vi.fn();
    const { result } = renderHook(() => useLeavePageGuard(true, onBlocked));
    await back();
    await waitFor(() => expect(onBlocked).toHaveBeenCalledTimes(1));
    await act(async () => {
      result.current.leaveViaHistory();
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(window.location.pathname).toBe("/alunos");
    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  it("salvar (edições somem) consome a sentinela: o próximo Voltar funciona de primeira", async () => {
    const onBlocked = vi.fn();
    const { rerender } = renderHook(({ active }) => useLeavePageGuard(active, onBlocked), { initialProps: { active: true } });
    expect(isSentinel()).toBe(true);
    // A limpeza do efeito roda ao fim do act; o history.back() dela é assíncrono.
    await act(async () => {
      rerender({ active: false });
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(isSentinel()).toBe(false);
    await back();
    expect(window.location.pathname).toBe("/alunos");
    expect(onBlocked).not.toHaveBeenCalled();
  });

  it("editar de novo depois de salvar rearma a guarda", async () => {
    const onBlocked = vi.fn();
    const { rerender } = renderHook(({ active }) => useLeavePageGuard(active, onBlocked), { initialProps: { active: true } });
    // A limpeza do efeito roda ao fim do act; o history.back() dela é assíncrono.
    await act(async () => {
      rerender({ active: false });
    });
    await new Promise((r) => setTimeout(r, 50));
    rerender({ active: true });
    expect(isSentinel()).toBe(true);
    await back();
    await waitFor(() => expect(onBlocked).toHaveBeenCalledWith(LEAVE_GUARD_HISTORY));
    expect(window.location.pathname).toBe("/admin/revisao-exercicios");
  });
});
