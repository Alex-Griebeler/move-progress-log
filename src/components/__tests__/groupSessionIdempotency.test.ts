import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  forgetLocallySaved,
  GROUP_IDEMPOTENCY_WINDOW_MS,
  hasRecentGroupSession,
  readLocallySaved,
  rememberLocallySaved,
  type SessionsClient,
} from "../session/groupSessionIdempotency";

type Call = [string, ...unknown[]];

const fakeClient = (result: { data: Array<{ id: string; exercises?: Array<{ count: number }> }> | null; error: unknown }) => {
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
  it("sessão recente COM exercícios → true (não regrava)", async () => {
    const { client } = fakeClient({ data: [{ id: "w1", exercises: [{ count: 4 }] }], error: null });
    expect(await hasRecentGroupSession(client, key, NOW)).toBe(true);
  });

  it("sessão recente SEM exercícios (rollback que falhou) → false: não esconde a pessoa", async () => {
    const { client } = fakeClient({ data: [{ id: "w1", exercises: [{ count: 0 }] }], error: null });
    expect(await hasRecentGroupSession(client, key, NOW)).toBe(false);
  });

  it("pede a contagem de exercícios junto", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await hasRecentGroupSession(client, key, NOW);
    expect(calls).toContainEqual(["select", "id, exercises(count)"]);
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

describe("registro local de quem já entrou (fechar/reabrir o diálogo)", () => {
  const memory = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    };
  };

  it("guarda quem entrou COM o horário da aula, por prescrição e data", () => {
    const st = memory();
    rememberLocallySaved("p1", "2026-09-19", "07:40", ["s1", "s2"], NOW, st);
    const rec = readLocallySaved("p1", "2026-09-19", NOW + 3 * 60 * 1000, st);
    expect(rec?.time).toBe("07:40");
    expect(rec?.ids.sort()).toEqual(["s1", "s2"]);
    expect(readLocallySaved("p2", "2026-09-19", NOW, st)).toBeNull();
    expect(readLocallySaved("p1", "2026-09-20", NOW, st)).toBeNull();
  });

  it("acumula tentativas da MESMA aula; outra aula (outro horário) substitui", () => {
    const st = memory();
    rememberLocallySaved(null, "2026-09-19", "07:40", ["s1"], NOW, st);
    rememberLocallySaved(null, "2026-09-19", "07:40", ["s2"], NOW, st);
    expect(readLocallySaved(null, "2026-09-19", NOW, st)?.ids.sort()).toEqual(["s1", "s2"]);
    rememberLocallySaved(null, "2026-09-19", "18:00", ["s3"], NOW, st);
    expect(readLocallySaved(null, "2026-09-19", NOW, st)).toMatchObject({ time: "18:00", ids: ["s3"] });
  });

  it("expira em 12 h; esquece após sucesso; armazenamento corrompido ou ausente não quebra", () => {
    const st = memory();
    rememberLocallySaved("p1", "2026-09-19", "07:40", ["s1"], NOW, st);
    expect(readLocallySaved("p1", "2026-09-19", NOW + GROUP_IDEMPOTENCY_WINDOW_MS + 1, st)).toBeNull();
    forgetLocallySaved("p1", "2026-09-19", st);
    expect(readLocallySaved("p1", "2026-09-19", NOW, st)).toBeNull();
    st.setItem("fabrik:group-manual-saved:p1:2026-09-19", "{lixo");
    expect(readLocallySaved("p1", "2026-09-19", NOW, st)).toBeNull();
    st.setItem("fabrik:group-manual-saved:p1:2026-09-19", JSON.stringify({ ids: ["s1"], at: NOW })); // formato antigo, sem horário
    expect(readLocallySaved("p1", "2026-09-19", NOW, st)).toBeNull();
    expect(readLocallySaved("p1", "2026-09-19", NOW, undefined)).toBeNull();
  });

  it("o diálogo só pula quem está no registro se for a MESMA aula E o banco confirmar", () => {
    const src = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../RecordGroupSessionDialog.tsx"),
      "utf-8",
    );
    const save = src.slice(src.indexOf("const handleSaveManual"));
    expect(save).toContain("if (localRecord && localRecord.time === time) {");
    const loop = save.slice(save.indexOf("for (const id of localRecord.ids)"));
    expect(loop.indexOf("await hasRecentGroupSession(")).toBeGreaterThan(-1);
    expect(loop.indexOf("if (inDb) confirmedFromLocal.push(id);")).toBeGreaterThan(loop.indexOf("await hasRecentGroupSession("));
    expect(save).toContain("const alreadySaved = new Set([...manualSavedStudentIds, ...confirmedFromLocal]);");
    expect(save).toContain("rememberLocallySaved(effectivePrescriptionId ?? null, date, time, newlySavedIds);");
    expect(save).toContain("(já registrada)");
    const success = src.slice(src.indexOf("notify.success(total === 1"));
    expect(success.indexOf("forgetLocallySaved(")).toBeGreaterThan(-1);
  });

  it("aula incompleta em outro horário: avisa e oferece o horário, sem trocar sozinho", () => {
    const src = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../RecordGroupSessionDialog.tsx"),
      "utf-8",
    );
    expect(src).toContain("pendingLocalRecord.time !== time");
    expect(src).toContain("onClick={() => setTime(pendingLocalRecord.time)}");
    const effect = src.slice(src.indexOf("const rec = readLocallySaved(effectivePrescriptionId ?? null, date);"));
    expect(effect.slice(0, 400)).not.toContain("setTime(");
  });
});

describe("voz em grupo: falha parcial (revisão da #369)", () => {
  const src = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../RecordGroupSessionDialog.tsx"),
    "utf-8",
  );
  const save = src.slice(src.indexOf("const handleSave = async () => {"), src.indexOf("const handleSaveManual"));

  it("apaga sessões antigas só de quem gravou a nova", () => {
    expect(save).toContain(".select('id, student_id')");
    expect(save).toContain("staleSessions.filter(s => succeededStudentIds.has(s.student_id))");
  });

  it("não afirma sucesso de todos: o aviso de sucesso vem só do hook", () => {
    expect(save).not.toMatch(/notify\.success\(/);
  });

  it("com falha parcial mantém o diálogo só com quem falhou", () => {
    expect(save).toContain("setMergedStudents(prev => prev.filter(m => failedNames.has(m.student_name.toLowerCase())));");
    const keep = save.indexOf("if (failedNames.size > 0) {");
    const close = save.indexOf("onOpenChange(false)");
    expect(keep).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(keep);
  });

  it("observações e transcrições só para quem gravou", () => {
    expect(save).toContain("if (!student || !succeededStudentIds.has(student.id)) continue;");
  });
});
