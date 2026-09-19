// @vitest-environment jsdom
/**
 * Guarda de saída da revisão em lote: Voltar/Avançar do navegador (revisão
 * do Codex na #368). Sem data router, a proteção é uma entrada sentinela.
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEAVE_GUARD_HISTORY, useLeavePageGuard } from "../ExerciseReviewPage";

afterEach(cleanup);

const firePop = () => act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });

describe("useLeavePageGuard — Voltar do navegador", () => {
  let pushSpy: ReturnType<typeof vi.spyOn>;
  let backSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    window.history.replaceState({ usr: null, key: "k", idx: 3 }, "", "/admin/revisao-exercicios");
    pushSpy = vi.spyOn(window.history, "pushState");
    backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
  });
  afterEach(() => { pushSpy.mockRestore(); backSpy.mockRestore(); });

  it("sem edições não empilha nada nem bloqueia", () => {
    const onBlocked = vi.fn();
    renderHook(() => useLeavePageGuard(false, onBlocked));
    expect(pushSpy).not.toHaveBeenCalled();
    firePop();
    expect(onBlocked).not.toHaveBeenCalled();
  });

  it("com edições empilha a sentinela (mesma URL, estado do roteador preservado)", () => {
    renderHook(() => useLeavePageGuard(true, vi.fn()));
    expect(pushSpy).toHaveBeenCalledTimes(1);
    const [state, , url] = pushSpy.mock.calls[0];
    expect(state).toMatchObject({ key: "k", idx: 3, fabrikLeaveGuard: true });
    expect(url).toBe(window.location.href);
  });

  it("Voltar consome a sentinela e pede confirmação com o destino 'histórico'", () => {
    const onBlocked = vi.fn();
    renderHook(() => useLeavePageGuard(true, onBlocked));
    window.history.replaceState({ usr: null, key: "k", idx: 3 }, "", window.location.href); // entrada real
    firePop();
    expect(onBlocked).toHaveBeenCalledWith(LEAVE_GUARD_HISTORY);
  });

  it("'Continuar editando' recoloca a sentinela; 'Sair' volta sem reempilhar", () => {
    const onBlocked = vi.fn();
    const { result } = renderHook(() => useLeavePageGuard(true, onBlocked));
    window.history.replaceState({ usr: null, key: "k", idx: 3 }, "", window.location.href);
    firePop();
    pushSpy.mockClear();
    act(() => result.current.rearm());
    expect(pushSpy).toHaveBeenCalledTimes(1);

    window.history.replaceState({ usr: null, key: "k", idx: 3 }, "", window.location.href);
    firePop();
    pushSpy.mockClear();
    act(() => result.current.leaveViaHistory());
    act(() => result.current.rearm()); // onOpenChange(false) do AlertDialog após o "Sair"
    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).not.toHaveBeenCalled();
    firePop(); // o back em si não reabre o diálogo
    expect(onBlocked).toHaveBeenCalledTimes(2);
  });
});
