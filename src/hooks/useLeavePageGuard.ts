import { useCallback, useEffect, useRef } from "react";

/** Destino especial: o usuário pediu Voltar/Avançar no navegador. */
export const LEAVE_GUARD_HISTORY = "__history__";

type GuardState = { fabrikLeaveGuard?: boolean } | null;
const sentinelOnTop = () => Boolean((window.history.state as GuardState)?.fabrikLeaveGuard);

/**
 * Guarda de saída de página com edições não salvas (UX-29, revisões da #368).
 * O app usa <BrowserRouter> (sem data router), então `useBlocker` não existe.
 *
 * - Link interno (captura) → `onBlockedNavigation(href)`; ao confirmar, use
 *   `navigate(href, { replace: true })` para substituir a sentinela.
 * - Voltar/Avançar → enquanto houver edições, uma entrada SENTINELA (mesma
 *   URL, estado do roteador preservado) fica no topo do histórico. O Voltar a
 *   consome; a guarda a RECOLOCA na hora (a pessoa segue na página, inclusive
 *   se apertar Voltar de novo com o diálogo aberto) e pede confirmação.
 *   `leaveViaHistory()` sai pulando a sentinela e a entrada real.
 * - Fechar/recarregar a aba → `beforeunload`.
 * - Quando as edições deixam de existir (salvar, desfazer), a sentinela que
 *   sobrou é consumida — o próximo Voltar funciona normalmente.
 * O estado vem de `history.state` (não de ref), então nunca fica desatualizado.
 */
export const useLeavePageGuard = (active: boolean, onBlockedNavigation: (href: string) => void) => {
  const bypassRef = useRef(false);

  const pushSentinel = useCallback(() => {
    if (sentinelOnTop()) return;
    window.history.pushState({ ...(window.history.state ?? {}), fabrikLeaveGuard: true }, "", window.location.href);
  }, []);

  useEffect(() => {
    if (!active) return;
    bypassRef.current = false;
    pushSentinel();

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      if (bypassRef.current) return;
      if (sentinelOnTop()) return; // Avançar de volta para a sentinela: nada a fazer
      // A sentinela foi consumida: recoloca (a página segue montada) e pede confirmação.
      pushSentinel();
      onBlockedNavigation(LEAVE_GUARD_HISTORY);
    };

    const handleClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      onBlockedNavigation(`${url.pathname}${url.search}${url.hash}`);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleClickCapture, true);
      // Edições deixaram de existir com a sentinela no topo (salvou/desfez):
      // consome a sentinela para o próximo Voltar não ficar "morto".
      if (!bypassRef.current && sentinelOnTop()) {
        bypassRef.current = true;
        window.history.back();
      }
    };
  }, [active, onBlockedNavigation, pushSentinel]);

  /** Confirmou sair depois de um Voltar: pula a sentinela e a entrada real. */
  const leaveViaHistory = useCallback(() => {
    bypassRef.current = true;
    window.history.go(-2);
  }, []);

  return { leaveViaHistory };
};
