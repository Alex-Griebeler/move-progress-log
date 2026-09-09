import { createContext, useContext } from "react";
import type { AuthIdentity } from "@/lib/authIdentity";

/** Provido por `AuthProvider` (src/contexts/AuthContext.tsx). */
export const AuthContext = createContext<AuthIdentity | undefined>(undefined);

/**
 * Identidade autenticada corrente (status, userId, época).
 * Única fonte de verdade de sessão na árvore React — guards, hooks privados e
 * a fronteira de cache derivam dela; nada assina o auth por conta própria.
 */
export function useAuth(): AuthIdentity {
  const identity = useContext(AuthContext);
  if (!identity) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return identity;
}
