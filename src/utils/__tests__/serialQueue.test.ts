import { describe, expect, it } from "vitest";
import { createSerialQueue } from "../serialQueue";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
};
// Deixa a tarefa da frente COMEÇAR (microtasks) antes de enfileirar a próxima.
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("createSerialQueue — última vence, uma por vez", () => {
  it("executa em ordem e a tarefa superada antes de começar NÃO escreve", async () => {
    const q = createSerialQueue();
    const log: string[] = [];
    const a = deferred();
    const pa = q.enqueue(async (isLatest) => { log.push("A:start"); await a.promise; log.push(`A:end latest=${isLatest()}`); });
    await tick(); // A em voo
    const pb = q.enqueue(async (isLatest) => { log.push(`B:start latest=${isLatest()}`); });
    expect(q.isBusy()).toBe(true);
    a.resolve();
    await Promise.all([pa, pb]);
    expect(log).toEqual(["A:start", "A:end latest=false", "B:start latest=true"]);
    expect(q.isBusy()).toBe(false);
  });

  it("A→B→C com A lenta: B é pulada (superada por C), C escreve por último", async () => {
    const q = createSerialQueue();
    const writes: string[] = [];
    const a = deferred();
    const pa = q.enqueue(async () => { await a.promise; writes.push("A"); });
    await tick(); // A em voo; B e C chegam enquanto A espera a rede
    const pb = q.enqueue(async () => { writes.push("B"); });
    const pc = q.enqueue(async () => { writes.push("C"); });
    a.resolve();
    await Promise.all([pa, pb, pc]);
    expect(writes).toEqual(["A", "C"]);
  });

  it("superada ANTES de começar não escreve (só a mais nova escreve)", async () => {
    const q = createSerialQueue();
    const writes: string[] = [];
    const pa = q.enqueue(async () => { writes.push("A"); });
    const pb = q.enqueue(async () => { writes.push("B"); }); // sem tick: A nem começou
    await Promise.all([pa, pb]);
    expect(writes).toEqual(["B"]);
  });

  it("erro numa tarefa não trava a fila", async () => {
    const q = createSerialQueue();
    await q.enqueue(async () => { throw new Error("boom"); });
    const done: string[] = [];
    await q.enqueue(async () => { done.push("ok"); });
    expect(done).toEqual(["ok"]);
    expect(q.isBusy()).toBe(false);
  });
});
