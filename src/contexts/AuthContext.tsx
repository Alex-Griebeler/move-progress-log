/**
 * A-001 — AuthProvider (fonte única de identidade) e IdentityScope (fronteira
 * do estado privado). Ver src/lib/authIdentity.ts para o modelo.
 */
import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, useAuth } from "@/hooks/useAuth";
import {
  INITIAL_AUTH_IDENTITY,
  createAppQueryClient,
  disposeIdentityQueryClient,
  nextAuthIdentity,
  type AuthSessionLike,
} from "@/lib/authIdentity";
import { logger } from "@/utils/logger";

interface ProviderProps {
  children: ReactNode;
}

/**
 * Assina o auth do Supabase UMA vez, no topo da árvore, e publica a identidade.
 *
 * - O callback do onAuthStateChange só publica estado (síncrono): nenhuma
 *   chamada à API de auth lá dentro (reentrância/lock do auth-js).
 * - `getSession()` é o bootstrap; se QUALQUER evento já foi aplicado, o
 *   snapshot inicial — possivelmente antigo — é descartado. Uma resposta
 *   inicial atrasada nunca restaura A depois de logout/B.
 * - Eventos da mesma identidade (TOKEN_REFRESHED etc.) não alteram o estado
 *   (o redutor devolve a mesma referência) → sem re-render, sem remontagem.
 */
export function AuthProvider({ children }: ProviderProps) {
  const [identity, setIdentity] = useState(INITIAL_AUTH_IDENTITY);

  useEffect(() => {
    let active = true;
    let eventApplied = false;
    const apply = (session: AuthSessionLike) => {
      if (!active) return;
      setIdentity((prev) => nextAuthIdentity(prev, session));
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      eventApplied = true;
      apply(session);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (eventApplied) return;
        apply(session);
      })
      .catch((error: unknown) => {
        logger.error("[AuthProvider] getSession failed", error);
        if (!eventApplied) apply(null);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={identity}>{children}</AuthContext.Provider>;
}

/**
 * Fronteira do estado privado: um QueryClient por época de identidade e a
 * subárvore remontada a cada troca. Só renderiza com identidade resolvida.
 *
 * Trocar só o `client` do QueryClientProvider não basta: cada useQuery cria
 * seu observer com o client do PRIMEIRO render, e estado de componente e de
 * contexto sobreviveriam à troca. Por isso `key={epoch}` remonta a instância
 * inteira: client novo antes de qualquer filho renderizar; o client anterior
 * é descartado no unmount (callbacks de mutação desarmados + cache limpo).
 */
export function IdentityScope({ children }: ProviderProps) {
  const { userId, epoch } = useAuth();

  if (!userId) return null;

  return <IdentityQueryScope key={epoch}>{children}</IdentityQueryScope>;
}

function IdentityQueryScope({ children }: ProviderProps) {
  const [client] = useState(createAppQueryClient);

  useEffect(() => () => disposeIdentityQueryClient(client), [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
