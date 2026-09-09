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
 * Este módulo não depende de React para ser testável em unidade.
 */
import {
  MutationCache,
  QueryCache,
  QueryClient,
  type DefaultError,
  type MutationOptions,
  type MutationState,
  type QueryClientConfig,
  type QueryKey,
  type QueryOptions,
  type QueryState,
  type WithRequired,
} from "@tanstack/react-query";
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

/** Client público (rotas sem sessão). */
export function createAppQueryClient(): QueryClient {
  return new QueryClient(APP_QUERY_CLIENT_CONFIG);
}

// ---------------------------------------------------------------------------
// Client por identidade: revogável.
//
// Quando a identidade deixa de ser a corrente, componentes dela já desmontaram,
// mas closures assíncronas (laço de importação, upload → mutateAsync, catch com
// toast) continuam vivas e rodariam com o TOKEN DA IDENTIDADE NOVA. Revogar o
// client faz qualquer operação dessa identidade terminar EM SILÊNCIO — a
// promessa nunca conclui: não escreve, não notifica, não continua o laço.
//
// - Mutação em voo: os hooks de cache (onMutate/onSuccess/onError/onSettled)
//   rodam ANTES dos callbacks de hook e antes de resolver o mutateAsync; com a
//   identidade revogada eles ficam pendentes para sempre. (O write que já foi
//   ao servidor NÃO é cancelado por isto — só a publicação no cliente.)
// - Mutação/query NOVA de uma closure antiga: `build` troca a função por uma
//   que nunca conclui — o mutationFn/queryFn nunca executa.
// ---------------------------------------------------------------------------
const neverSettle = (): Promise<never> => new Promise<never>(() => {});

class IdentityRevocation {
  revoked = false;
  /** Hook de cache: transparente até a revogação; depois, pendente para sempre. */
  readonly hold = (): Promise<never> | undefined => (this.revoked ? neverSettle() : undefined);
}

class IdentityMutationCache extends MutationCache {
  constructor(private readonly revocation: IdentityRevocation) {
    super({
      onMutate: revocation.hold,
      onSuccess: revocation.hold,
      onError: revocation.hold,
      onSettled: revocation.hold,
    });
  }

  build<TData, TError, TVariables, TContext>(
    client: QueryClient,
    options: MutationOptions<TData, TError, TVariables, TContext>,
    state?: MutationState<TData, TError, TVariables, TContext>,
  ) {
    return super.build(
      client,
      this.revocation.revoked ? { ...options, mutationFn: neverSettle } : options,
      state,
    );
  }
}

class IdentityQueryCache extends QueryCache {
  /** Queries já interceptadas (build devolve a mesma instância para a mesma chave). */
  private readonly guarded = new WeakSet<object>();

  constructor(private readonly revocation: IdentityRevocation) {
    super();
  }

  build<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
    client: QueryClient,
    options: WithRequired<QueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryKey">,
    state?: QueryState<TData, TError>,
  ) {
    const query = super.build(client, options, state);
    // `fetch(options)` reaplica as opções do chamador (queryFn original), então
    // trocar o queryFn no build não basta: a barreira fica no próprio fetch
    // da instância — com a identidade revogada, nunca conclui.
    if (!this.guarded.has(query)) {
      this.guarded.add(query);
      const fetch = query.fetch.bind(query);
      query.fetch = (...args: Parameters<typeof fetch>) =>
        this.revocation.revoked ? neverSettle() : fetch(...args);
    }
    return query;
  }
}

const revocations = new WeakMap<QueryClient, IdentityRevocation>();

/** Client do estado privado de UMA identidade (ver IdentityScope). */
export function createIdentityQueryClient(): QueryClient {
  const revocation = new IdentityRevocation();
  const client = new QueryClient({
    ...APP_QUERY_CLIENT_CONFIG,
    queryCache: new IdentityQueryCache(revocation),
    mutationCache: new IdentityMutationCache(revocation),
  });
  revocations.set(client, revocation);
  return client;
}

/**
 * Descarta o client de uma identidade que deixou de ser a corrente:
 * revoga (operações em voo e futuras nunca concluem nem publicam) e limpa o
 * cache (fetches pendentes cancelados; nada resta para uma resposta tardia
 * encontrar). Idempotente.
 */
export function disposeIdentityQueryClient(client: QueryClient): void {
  const revocation = revocations.get(client);
  if (revocation) revocation.revoked = true;
  client.clear();
}
