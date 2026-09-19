import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  GROUP_IDEMPOTENCY_WINDOW_MS,
  hasRecentGroupSession,
  type SessionsClient,
} from "../session/groupSessionIdempotency";

type Call = [string, ...unknown[]];

const fakeClient = (result: { data: Array<{ id: string }> | null; error: unknown }) => {
  const calls: Call[] = [];
  const query = {
    eq: (c: string, v: unknown) => (calls.push(["eq", c, v]), query),
    is: (c: string, v: unknown) => (calls.push(["is", c, v]), query),
    gte: (c: string, v: unknown) => (calls.push(["gte", c, v]), query),
    limit: (n: number) => (calls.push(["limit", n]), query),
    then: (resolve: (r: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  const client = {
    from: (t: string) => (calls.push(["from", t]), { select: (c: string) => (calls.push(["select", c]), query) }),
  } as unknown as SessionsClient;
  return { client, calls };
};

const key = { studentId: "s1", date: "2026-09-19", time: "07:00", prescriptionId: "p1" };
const NOW = Date.parse("2026-09-19T12:00:00Z");

describe("idempotência do salvamento em grupo (PR #369)", () => {
  it("sessão recente existente → true (não regrava)", async () => {
    const { client } = fakeClient({ data: [{ id: "w1" }], error: null });
    expect(await hasRecentGroupSession(client, key, NOW)).toBe(true);
  });

  it("nenhuma sessão → false (grava)", async () => {
    const { client } = fakeClient({ data: [], error: null });
    expect(await hasRecentGroupSession(client, key, NOW)).toBe(false);
  });

  it("erro na consulta propaga (a pessoa entra em 'não salvas', nunca grava às cegas)", async () => {
    const { client } = fakeClient({ data: null, error: new Error("rede") });
    await expect(hasRecentGroupSession(client, key, NOW)).rejects.toThrow("rede");
  });

  it("filtra por pessoa, data, horário, grupo, prescrição e janela de 12 h", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await hasRecentGroupSession(client, key, NOW);
    expect(calls).toContainEqual(["from", "workout_sessions"]);
    expect(calls).toContainEqual(["eq", "student_id", "s1"]);
    expect(calls).toContainEqual(["eq", "date", "2026-09-19"]);
    expect(calls).toContainEqual(["eq", "time", "07:00"]);
    expect(calls).toContainEqual(["eq", "session_type", "group"]);
    expect(calls).toContainEqual(["eq", "prescription_id", "p1"]);
    expect(calls).toContainEqual(["gte", "created_at", new Date(NOW - GROUP_IDEMPOTENCY_WINDOW_MS).toISOString()]);
  });

  it("sem prescrição usa IS NULL (não casa com sessões de outra prescrição)", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await hasRecentGroupSession(client, { ...key, prescriptionId: null }, NOW);
    expect(calls).toContainEqual(["is", "prescription_id", null]);
    expect(calls.some((c) => c[0] === "eq" && c[1] === "prescription_id")).toBe(false);
  });

  it("o diálogo de grupo consulta ANTES de inserir a sessão", () => {
    const src = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../RecordGroupSessionDialog.tsx"),
      "utf-8",
    );
    const body = src.slice(src.indexOf("const saveOneStudent = async"));
    const checkIdx = body.indexOf("hasRecentGroupSession(");
    const insertIdx = body.indexOf('from("workout_sessions").insert(');
    expect(checkIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(checkIdx);
    expect(body).toContain('if (alreadyInDb) return "existing";');
  });
});
