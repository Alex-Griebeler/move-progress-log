/**
 * A-001 — fronteira de identidade do estado privado do cliente.
 *
 * A identidade autenticada (user.id da sessão do Supabase) define a fronteira
 * de TODO estado privado em memória: cache do React Query, contextos e estado
 * de componentes. Cada troca de identidade (login, logout, A→B direto, sessão
 * expirada) abre uma nova "época"; a renovação de token da MESMA identidade
 * não. O `IdentityScope` (src/contexts/AuthContext.tsx) cria um QueryClient
 * por época e remonta a subárvore privada, de modo que a conta seguinte nunca
 * enxerga dados, roles ou efeitos da anterior — nem no primeiro render, nem
 * por resposta de rede que chegue atrasada.
 *
 * Este módulo é puro (sem React) para ser testável em unidade.
 */
import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

export type AuthStatus = "loading" | "signed-out" | "signed-in";

export interface AuthIdentity {
  status: AuthStatus;
  /** id do usuário autenticado; null enquanto desconhecido ou deslogado. */
  userId: string | null;
  /**
   * Época da identidade. Incrementa a cada transição de identidade
   * (desconhecida→X, A→logout, logout→B, A→B). Estável entre eventos da
   * mesma identidade (TOKEN_REFRESHED, USER_UPDATED, MFA).
   */
  epoch: number;
}

export const INITIAL_AUTH_IDENTITY: AuthIdentity = { status: "loading", userId: null, epoch: 0 };

/** Sessão "mínima" aceita pelo redutor (o auth-js entrega `Session | null`). */
export type AuthSessionLike = Pick<Session, "user"> | null | undefined;

/**
 * Redutor puro: aplica um snapshot de sessão à identidade corrente.
 * Devolve a MESMA referência quando a identidade não mudou, para que
 * consumidores não re-renderizem em renovação de token.
 */
export function nextAuthIdentity(prev: AuthIdentity, session: AuthSessionLike): AuthIdentity {
  const userId = session?.user?.id ?? null;
  const status: AuthStatus = userId ? "signed-in" : "signed-out";
  if (prev.status === status && prev.userId === userId) return prev;
  return { status, userId, epoch: prev.epoch + 1 };
}

/** Defaults do app (antes inline no App.tsx); compartilhados pelo client público e pelos clients por identidade. */
export const APP_QUERY_CLIENT_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minuto
      retry: 1, // 1 retry em vez de 3 (padrão)
      refetchOnWindowFocus: false,
    },
  },
};

export function createAppQueryClient(): QueryClient {
  return new QueryClient(APP_QUERY_CLIENT_CONFIG);
}

/**
 * Descarta o QueryClient de uma identidade que deixou de ser a corrente.
 *
 * 1. Mutações ainda em voo já enviaram o write ao servidor — NADA aqui cancela
 *    isso. O que se corta é a PUBLICAÇÃO no cliente: os callbacks de hook
 *    (onSuccess/onError/onSettled do useMutation) disparam mesmo depois do
 *    unmount e fariam invalidação/toast dentro da sessão da identidade nova.
 * 2. `clear()` remove queries e mutações e cancela os retryers pendentes: uma
 *    resposta tardia (fetch que não coopera com abort) não encontra query nem
 *    observer para publicar — o resultado morre no client descartado.
 */
export function disposeIdentityQueryClient(client: QueryClient): void {
  for (const mutation of client.getMutationCache().getAll()) {
    mutation.setOptions({
      ...mutation.options,
      onSuccess: undefined,
      onError: undefined,
      onSettled: undefined,
    });
  }
  client.clear();
}
