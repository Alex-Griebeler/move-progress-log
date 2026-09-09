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
  type EnsureInfiniteQueryDataOptions,
  type EnsureQueryDataOptions,
  type FetchInfiniteQueryOptions,
  type FetchQueryOptions,
  type InfiniteData,
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
// - Mutação: mutationFn e callbacks (onSuccess/onError/onSettled) são
//   envolvidos NA INSTÂNCIA (via setOptions, que o observer reaplica a cada
//   render) e checam a revogação NO MOMENTO DA CHAMADA — cobre a mutação
//   construída antes da revogação cujo mutationFn ainda não começou (o
//   TanStack aguarda onMutate antes de iniciar) e a janela entre o hook de
//   cache e o callback; a ENTREGA do execute()/mutateAsync é guardada na
//   conclusão e os callbacks POR CHAMADA (mutate(vars, {onSuccess…})) não
//   recebem a ação do observer. Os hooks de cache também travam. (O write
//   que já foi ao servidor NÃO é cancelado por nada disto — só a publicação
//   no cliente.)
// - Query nova/refetch de uma closure antiga: o `fetch` da instância nunca
//   conclui; fetchQuery/ensureQueryData que devolveriam cache fresco sem
//   passar pelo fetch também são barrados no client.
// - API assíncrona do client (invalidateQueries, refetchQueries, fetchQuery…)
//   chamada por um callback já em andamento: nunca conclui — a continuação
//   depois do `await` (toast, próxima escrita) não roda.
// - Mutações eternamente pendentes não podem ficar reagendando GC (retenção):
//   gcTime = Infinity desliga o timer (isValidTimeout) — sem observers e sem
//   timer, o objeto só vive enquanto a closure do chamador viver.
//
// A revogação é SÍNCRONA no evento de auth (AuthProvider), antes de o React
// desmontar a árvore: entre o evento e o commit a identidade antiga já não
// publica via React Query nem inicia mutação/query nova. `clear()` completa o
// descarte (cancela fetches em voo).
//
// LIMITE (residual documentado na PR): requisições emitidas DIRETAMENTE ao
// singleton do supabase-js por código já em execução — etapas seguintes de um
// mutationFn multi-etapa (laço da sincronização Oura, SELECT→INSERT do
// getOrCreateStudent) ou fluxos imperativos (serialQueue do dashboard) — não
// passam por aqui e sairiam com o token da identidade nova; no padrão
// `getUser()` → `insert({ trainer_id: user.id })`, a linha de A pode ser
// gravada com o user.id de B. Rascunhos em localStorage (usePrescriptionDraft,
// useSessionDraft, *DraftHistory) também não têm identidade na chave. Fechar
// isso exige cliente de dados por época e chaves por userId (migração dos
// consumidores), fora deste patch.
// ---------------------------------------------------------------------------
const neverSettle = (): Promise<never> => new Promise<never>(() => {});

class IdentityRevocation {
  revoked = false;
  /** Hook de cache: transparente até a revogação; depois, pendente para sempre. */
  readonly hold = (): Promise<never> | undefined => (this.revoked ? neverSettle() : undefined);
}

/** Envolve mutationFn e callbacks para checarem a revogação ao serem CHAMADOS. */
function guardMutationOptions<TData, TError, TVariables, TContext>(
  options: MutationOptions<TData, TError, TVariables, TContext>,
  revocation: IdentityRevocation,
): MutationOptions<TData, TError, TVariables, TContext> {
  const { mutationFn, onMutate, onSuccess, onError, onSettled } = options;
  return {
    ...options,
    mutationFn: mutationFn
      ? (variables) => (revocation.revoked ? neverSettle() : mutationFn(variables))
      : mutationFn,
    onMutate: onMutate ? (variables) => (revocation.revoked ? neverSettle() : onMutate(variables)) : onMutate,
    onSuccess: onSuccess
      ? (...args) => (revocation.revoked ? neverSettle() : onSuccess(...args))
      : onSuccess,
    onError: onError ? (...args) => (revocation.revoked ? neverSettle() : onError(...args)) : onError,
    onSettled: onSettled
      ? (...args) => (revocation.revoked ? neverSettle() : onSettled(...args))
      : onSettled,
  };
}

class IdentityMutationCache extends MutationCache {
  private readonly guarded = new WeakSet<object>();
  private readonly guardedObservers = new WeakSet<object>();

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
    const mutation = super.build(
      client,
      this.revocation.revoked ? { ...options, mutationFn: neverSettle, gcTime: Infinity } : options,
      state,
    );
    // O MutationObserver reaplica as opções cruas em cada render
    // (mutation.setOptions); a barreira precisa sobreviver a isso.
    if (!this.guarded.has(mutation)) {
      this.guarded.add(mutation);
      const { revocation } = this;
      const setOptions = mutation.setOptions.bind(mutation);
      mutation.setOptions = (next) => setOptions(guardMutationOptions(next, revocation));
      mutation.setOptions(mutation.options);
      // A ENTREGA (mutateAsync resolve/rejeita) também é guardada: depois do
      // último callback ainda há um intervalo até o `return data` do execute()
      // — uma revogação ali não pode entregar o resultado de A ao chamador.
      const execute = mutation.execute.bind(mutation);
      mutation.execute = (variables) =>
        execute(variables).then(
          (value) => (revocation.revoked ? neverSettle() : value),
          (error: unknown) => (revocation.revoked ? neverSettle() : Promise.reject(error)),
        );
      // Callbacks POR CHAMADA (`mutate(vars, { onSuccess… })`) são disparados
      // pelo observer ao receber o `dispatch` de sucesso/erro — antes da
      // barreira de entrega acima. Revogado, o observer não recebe a ação.
      const addObserver = mutation.addObserver.bind(mutation);
      mutation.addObserver = (observer) => {
        if (!this.guardedObservers.has(observer)) {
          this.guardedObservers.add(observer);
          const onMutationUpdate = observer.onMutationUpdate.bind(observer);
          observer.onMutationUpdate = (action) => {
            if (!revocation.revoked) onMutationUpdate(action);
          };
        }
        addObserver(observer);
      };
    }
    return mutation;
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
      const { revocation } = this;
      query.fetch = (...args: Parameters<typeof fetch>) => {
        if (revocation.revoked) return neverSettle();
        // iniciado antes, concluído depois da revogação (ou cancelado pelo
        // clear()): o chamador de fetchQuery/refetch também não continua
        return fetch(...args).then(
          (value) => (revocation.revoked ? neverSettle() : value),
          (error: unknown) => (revocation.revoked ? neverSettle() : Promise.reject(error)),
        );
      };
    }
    return query;
  }
}

/** QueryClient cuja API assíncrona fica pendente para sempre após a revogação. */
class IdentityQueryClient extends QueryClient {
  constructor(readonly revocation: IdentityRevocation) {
    super({
      ...APP_QUERY_CLIENT_CONFIG,
      queryCache: new IdentityQueryCache(revocation),
      mutationCache: new IdentityMutationCache(revocation),
    });
  }

  /** Barreira na ENTRADA e na CONCLUSÃO: uma chamada iniciada antes da
   *  revogação (ex.: `await invalidateQueries()` num onSuccess) que conclua
   *  depois — inclusive liberada pelo `clear()` — também nunca entrega
   *  resultado ao chamador. */
  private guard<T>(run: () => Promise<T>): Promise<T> {
    if (this.revocation.revoked) return neverSettle();
    return run().then(
      (value) => (this.revocation.revoked ? neverSettle() : value),
      (error: unknown) => (this.revocation.revoked ? neverSettle() : Promise.reject(error)),
    );
  }

  invalidateQueries(...args: Parameters<QueryClient["invalidateQueries"]>) {
    return this.guard(() => super.invalidateQueries(...args));
  }
  refetchQueries(...args: Parameters<QueryClient["refetchQueries"]>) {
    return this.guard(() => super.refetchQueries(...args));
  }
  resetQueries(...args: Parameters<QueryClient["resetQueries"]>) {
    return this.guard(() => super.resetQueries(...args));
  }
  cancelQueries(...args: Parameters<QueryClient["cancelQueries"]>) {
    return this.guard(() => super.cancelQueries(...args));
  }
  resumePausedMutations() {
    return this.guard(() => super.resumePausedMutations());
  }
  // A família fetch/ensure passa pelo `query.fetch` interceptado quando busca
  // na rede, mas devolve cache fresco DIRETO quando o tem — por isso também
  // é guardada aqui (entrada + conclusão).
  fetchQuery<TQueryFnData, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = never>(
    options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  ): Promise<TData> {
    return this.guard(() => super.fetchQuery(options));
  }
  prefetchQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
    options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  ): Promise<void> {
    return this.guard(() => super.prefetchQuery(options));
  }
  ensureQueryData<TQueryFnData, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
    options: EnsureQueryDataOptions<TQueryFnData, TError, TData, TQueryKey>,
  ): Promise<TData> {
    return this.guard(() => super.ensureQueryData(options));
  }
  fetchInfiniteQuery<TQueryFnData, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(
    options: FetchInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  ): Promise<InfiniteData<TData, TPageParam>> {
    return this.guard(() => super.fetchInfiniteQuery(options));
  }
  prefetchInfiniteQuery<TQueryFnData, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(
    options: FetchInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  ): Promise<void> {
    return this.guard(() => super.prefetchInfiniteQuery(options));
  }
  ensureInfiniteQueryData<TQueryFnData, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(
    options: EnsureInfiniteQueryDataOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  ): Promise<InfiniteData<TData, TPageParam>> {
    return this.guard(() => super.ensureInfiniteQueryData(options));
  }
}

/** Client do estado privado de UMA identidade (ver AuthProvider/IdentityScope). */
export function createIdentityQueryClient(): QueryClient {
  return new IdentityQueryClient(new IdentityRevocation());
}

/**
 * Revoga o client de uma identidade que deixou de ser a corrente — barreira
 * síncrona de publicação/escrita (ver comentário acima). Idempotente.
 */
export function revokeIdentityQueryClient(client: QueryClient): void {
  if (!(client instanceof IdentityQueryClient) || client.revocation.revoked) return;
  client.revocation.revoked = true;
  for (const mutation of client.getMutationCache().getAll()) {
    mutation.setOptions({ ...mutation.options, gcTime: Infinity });
  }
}

/**
 * Revoga e limpa: fetches em voo cancelados, cache esvaziado — nada resta
 * para uma resposta tardia encontrar. Idempotente.
 */
export function disposeIdentityQueryClient(client: QueryClient): void {
  revokeIdentityQueryClient(client);
  client.clear();
}
