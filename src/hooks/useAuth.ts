import { createContext, useContext } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { AuthIdentity } from "@/lib/authIdentity";

export interface AuthContextValue {
  identity: AuthIdentity;
  /** Client do estado privado da identidade corrente; null fora de "signed-in". */
  queryClient: QueryClient | null;
  /**
   * Client ESTÁVEL das rotas por token/sem sessão (onboarding, questionário,
   * conexão Oura/Whoop): nunca é trocado — um formulário que continue montado
   * durante uma troca de identidade em outra aba mantém o client (e a
   * retomada de mutações pausadas) que seus observers capturaram. Página
   * pública que LÊ sessão usa SessionEpochScope (client próprio por época).
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
