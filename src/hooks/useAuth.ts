import { createContext, useContext } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { AuthIdentity } from "@/lib/authIdentity";

export interface AuthContextValue {
  identity: AuthIdentity;
  /** Client do estado privado da identidade corrente; null fora de "signed-in". */
  queryClient: QueryClient | null;
  /**
   * Client das rotas sem casca privada. Também é trocado a cada época: uma
   * página pública que consulte dados de sessão (ex.: OnboardingSuccessPage
   * com hooks do Oura) não pode reter cache de uma identidade anterior.
   */
  publicQueryClient: QueryClient;
}

/** Provido por `AuthProvider` (src/contexts/AuthContext.tsx). */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return value;
}

/**
 * Identidade autenticada corrente (status, userId, época).
 * Única fonte de verdade de sessão na árvore React — guards, hooks privados e
 * a fronteira de cache derivam dela; nada assina o auth por conta própria.
 */
export function useAuth(): AuthIdentity {
  return useAuthContext().identity;
}

/** QueryClient da identidade corrente (consumido pelo IdentityScope). */
export function useIdentityQueryClient(): QueryClient | null {
  return useAuthContext().queryClient;
}

/** QueryClient público da época corrente (consumido pelo PublicQueryScope). */
export function usePublicQueryClient(): QueryClient {
  return useAuthContext().publicQueryClient;
}
