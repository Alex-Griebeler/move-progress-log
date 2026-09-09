/**
 * A-001 — AuthProvider (fonte única de identidade + dono do client privado)
 * e IdentityScope (fronteira do estado privado). Modelo em src/lib/authIdentity.ts.
 */
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, useAuth, useIdentityQueryClient, type AuthContextValue } from "@/hooks/useAuth";
import {
  INITIAL_AUTH_IDENTITY,
  createIdentityQueryClient,
  disposeIdentityQueryClient,
  nextAuthIdentity,
  type AuthSessionLike,
} from "@/lib/authIdentity";
import { notify } from "@/lib/notify";
import { logger } from "@/utils/logger";

interface ProviderProps {
  children: ReactNode;
}

const INITIAL_VALUE: AuthContextValue = { identity: INITIAL_AUTH_IDENTITY, queryClient: null };

/**
 * Fecha toda notificação na tela na troca de identidade (o toaster do shadcn
 * guarda estado em módulo e o reproduziria numa instância nova). A remoção
 * imediata do que já está na tela ou na fila do sonner é feita pela troca de
 * instância dos toasters por época (AppToasters, key={epoch}).
 */
function dismissPrivateNotifications() {
  notify.dismissAll();
}

/**
 * Assina o auth do Supabase UMA vez, no topo da árvore, publica a identidade
 * e é dono do QueryClient privado de cada época.
 *
 * - O callback do onAuthStateChange só publica estado (síncrono): nenhuma
 *   chamada à API de auth lá dentro (reentrância/lock do auth-js).
 * - Troca de identidade = fronteira SÍNCRONA no próprio evento: o client da
 *   identidade anterior é revogado e limpo e os toasts fechados ANTES de o
 *   React agendar a remontagem — entre o evento e o commit, a identidade
 *   antiga já não publica via React Query nem inicia mutação/query nova.
 *   (Limite: requisições diretas ao singleton do supabase-js por código já em
 *   execução — ver src/lib/authIdentity.ts.)
 * - `getSession()` é o bootstrap; se QUALQUER evento já foi aplicado, o
 *   snapshot inicial — possivelmente antigo — é descartado. Uma resposta
 *   inicial atrasada nunca restaura A depois de logout/B.
 * - Eventos da mesma identidade (TOKEN_REFRESHED etc.) não alteram nada
 *   (o redutor devolve a mesma referência) → sem re-render, sem remontagem.
 * - O client vive no provider (não na casca): navegar para uma rota pública
 *   e voltar preserva o cache da MESMA identidade, como antes.
 */
export function AuthProvider({ children }: ProviderProps) {
  const [value, setValue] = useState<AuthContextValue>(INITIAL_VALUE);
  const current = useRef<AuthContextValue>(INITIAL_VALUE);

  useEffect(() => {
    let active = true;
    let eventApplied = false;

    const apply = (session: AuthSessionLike) => {
      if (!active) return;
      const prev = current.current;
      const identity = nextAuthIdentity(prev.identity, session);
      if (identity === prev.identity) return;

      if (prev.queryClient) {
        disposeIdentityQueryClient(prev.queryClient);
        dismissPrivateNotifications();
      }
      const next: AuthContextValue = {
        identity,
        queryClient: identity.status === "signed-in" ? createIdentityQueryClient() : null,
      };
      current.current = next;
      setValue(next);
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
      const client = current.current.queryClient;
      if (client) disposeIdentityQueryClient(client);
    };
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Fronteira do estado privado: QueryClientProvider com o client da identidade
 * corrente e a subárvore remontada a cada época. Só renderiza com identidade
 * resolvida.
 *
 * Trocar só o `client` do provider não basta: cada useQuery cria seu observer
 * com o client do PRIMEIRO render, e estado de componente e de contexto
 * sobreviveriam à troca. Por isso `key={epoch}` remonta tudo abaixo — com o
 * client novo já em mãos antes de qualquer filho renderizar.
 */
export function IdentityScope({ children }: ProviderProps) {
  const { userId, epoch } = useAuth();
  const client: QueryClient | null = useIdentityQueryClient();

  if (!userId || !client) return null;

  return (
    <QueryClientProvider client={client}>
      <Fragment key={epoch}>{children}</Fragment>
    </QueryClientProvider>
  );
}
