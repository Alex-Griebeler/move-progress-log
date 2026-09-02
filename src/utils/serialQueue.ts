/**
 * Fila SERIAL com semântica "última vence" (revisão final de confirmação,
 * blocker 1): mutações clínicas assíncronas (re-persistência da alternativa)
 * executam UMA por vez, na ordem de chegada; uma tarefa que já foi
 * superada por outra mais nova é PULADA antes de escrever — o banco termina
 * sempre na última escolha e nunca numa intermediária que resolveu tarde.
 */
export interface SerialQueue {
  /** Enfileira; `run` recebe `isLatest()` pra decidir publicar ou não. */
  enqueue: (run: (isLatest: () => boolean) => Promise<void>) => Promise<void>;
  /** true enquanto houver tarefa em voo ou aguardando. */
  isBusy: () => boolean;
  /** Geração corrente (cresce a cada enqueue). */
  generation: () => number;
}

export const createSerialQueue = (): SerialQueue => {
  let chain: Promise<void> = Promise.resolve();
  let gen = 0;
  let pending = 0;
  return {
    enqueue: (run) => {
      const mine = ++gen;
      pending += 1;
      const isLatest = () => mine === gen;
      chain = chain
        .then(async () => {
          // Superada antes de começar → não escreve (a mais nova escreve).
          if (!isLatest()) return;
          await run(isLatest);
        })
        .catch(() => undefined)
        .finally(() => {
          pending -= 1;
        });
      return chain;
    },
    isBusy: () => pending > 0,
    generation: () => gen,
  };
};
