import { describe, expect, it } from "vitest";
import {
  buildPerceptionText,
  spDayUtcRange,
  PERCEPTION_CATEGORY,
  PERCEPTION_TEXT_VERSION,
} from "@/utils/perceptionObservation";

describe("persistência da percepção (partes puras)", () => {
  it("intervalo UTC do dia SP (UTC−3 fixo desde 2019)", () => {
    const { startIso, endIso } = spDayUtcRange("2026-08-29");
    expect(startIso).toBe("2026-08-29T03:00:00.000Z");
    expect(endIso).toBe("2026-08-30T03:00:00.000Z");
  });

  it("texto versionado carrega fonte/score/zona/percepção/sintomas/conduta/vetos/ator", () => {
    const text = buildPerceptionText({
      source: "whoop", score: 55, baseZoneLabel: "yellow", perception: "pior",
      symptoms: false, conductType: "Recuperação Ativa / Muito Leve", snapshotDate: "2026-08-28",
      vetoes: ["Conduta reduzida pela percepção da aluna (pior que o score)."],
      spDay: "2026-08-29", registeredAtDisplay: "29/08/2026 14:32", actorId: "abc",
    });
    expect(text).toContain(`[${PERCEPTION_CATEGORY} v1]`);
    expect(text).toContain("fonte=whoop");
    expect(text).toContain("score=55");
    expect(text).toContain("percepcao=pior");
    expect(text).toContain("sintomas=nao");
    expect(text).toContain("conduta=Recuperação Ativa / Muito Leve");
    expect(text).toContain("por=abc");
    // dia do snapshot ≠ dia do registro fica explícito no prontuário
    expect(text).toContain("dia_snapshot=2026-08-28");
  });

  it("sintomas null vira 'nao_perguntado' no texto", () => {
    const text = buildPerceptionText({
      source: "oura", score: 80, baseZoneLabel: "green", perception: "nao_informada",
      symptoms: null, conductType: "x", vetoes: [], spDay: "2026-08-29", snapshotDate: "2026-08-29",
      registeredAtDisplay: "x", actorId: null,
    });
    expect(text).toContain("sintomas=nao_perguntado");
    expect(text).toContain("por=?");
  });
});

import { afterEach, beforeEach, vi } from "vitest";
import { parsePerceptionText, validateRememberedPerception } from "@/utils/perceptionObservation";

describe("parser do texto versionado (round-trip)", () => {
  it("parse(build(x)) recupera os campos", () => {
    const text = buildPerceptionText({
      source: "whoop", score: 55, baseZoneLabel: "yellow", perception: "pior",
      symptoms: false, conductType: "Treino Reduzido 20%", vetoes: ["a; b"],
      spDay: "2026-08-29", snapshotDate: "2026-08-28",
      registeredAtDisplay: "29/08/2026 14:32", actorId: "abc",
    });
    const parsed = parsePerceptionText(text);
    expect(parsed.version).toBe("v1");
    expect(parsed.fields.fonte).toBe("whoop");
    expect(parsed.fields.score).toBe("55");
    expect(parsed.fields.dia_snapshot).toBe("2026-08-28");
    expect(parsed.fields.percepcao).toBe("pior");
    expect(parsed.fields.conduta).toBe("Treino Reduzido 20%");
  });

  it("texto de versão desconhecida devolve version null (card cai no cru)", () => {
    expect(parsePerceptionText("qualquer coisa").version).toBeNull();
  });

  it("versão FUTURA (v2) parseia mas não é a atual — card deve cair no cru", () => {
    const parsed = parsePerceptionText("[percepcao_treino v2] | fonte=whoop | novo_campo=x");
    expect(parsed.version).toBe("v2");
    expect(parsed.version).not.toBe(PERCEPTION_TEXT_VERSION);
  });
});
import {
  _clearRememberedPerceptions,
  linkPerceptionToSession,
  rememberPerceptionObservation,
} from "@/utils/perceptionObservation";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Fake mínimo da cadeia .from().update().eq().is() usada pelo vínculo. */
const fakeSupabase = (result: { error: unknown }) => {
  const calls: Array<{ table: string; update: unknown; eq: [string, string]; is: [string, null] }> = [];
  const client = {
    from: (table: string) => ({
      update: (update: unknown) => ({
        eq: (col: string, val: string) => ({
          is: (col2: string, val2: null) => {
            calls.push({ table, update, eq: [col, val], is: [col2, val2] });
            return Promise.resolve(result);
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
};

describe("vínculo percepção→sessão (comportamental, supabase mockado)", () => {
  beforeEach(() => {
    _clearRememberedPerceptions();
    vi.stubGlobal("sessionStorage", (() => {
      const store = new Map<string, string>();
      return {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      };
    })());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("vincula pelo ID exato, condicionado a session_id NULL", async () => {
    const { client, calls } = fakeSupabase({ error: null });
    rememberPerceptionObservation("aluna1", "2026-08-29", "obs-123", "fp-1");
    await linkPerceptionToSession(client, "aluna1", "sess-1", "2026-08-29");
    expect(calls).toHaveLength(1);
    expect(calls[0].eq).toEqual(["id", "obs-123"]);
    expect(calls[0].is).toEqual(["session_id", null]);
  });

  it("caso 15: só a PRIMEIRA sessão vincula (registro consumido no sucesso)", async () => {
    const { client, calls } = fakeSupabase({ error: null });
    rememberPerceptionObservation("aluna1", "2026-08-29", "obs-123", "fp-1");
    await linkPerceptionToSession(client, "aluna1", "sess-1", "2026-08-29");
    await linkPerceptionToSession(client, "aluna1", "sess-2", "2026-08-29");
    expect(calls).toHaveLength(1);
  });

  it("sessão RETROATIVA (data diferente) não herda a percepção de hoje", async () => {
    const { client, calls } = fakeSupabase({ error: null });
    rememberPerceptionObservation("aluna1", "2026-08-29", "obs-123", "fp-1");
    await linkPerceptionToSession(client, "aluna1", "sess-1", "2026-08-20");
    expect(calls).toHaveLength(0);
    // e o registro continua disponível pra sessão do dia certo
    await linkPerceptionToSession(client, "aluna1", "sess-2", "2026-08-29");
    expect(calls).toHaveLength(1);
  });

  it("falha de rede NÃO consome o registro — a próxima sessão tenta de novo", async () => {
    const failing = fakeSupabase({ error: { message: "network" } });
    rememberPerceptionObservation("aluna1", "2026-08-29", "obs-123", "fp-1");
    await linkPerceptionToSession(failing.client, "aluna1", "sess-1", "2026-08-29");
    expect(failing.calls).toHaveLength(1);
    const ok = fakeSupabase({ error: null });
    await linkPerceptionToSession(ok.client, "aluna1", "sess-2", "2026-08-29");
    expect(ok.calls).toHaveLength(1); // retry aconteceu
  });

  it("sobrevive a refresh (memória limpa, sessionStorage mantém)", async () => {
    rememberPerceptionObservation("aluna1", "2026-08-29", "obs-123", "fp-1");
    _clearRememberedPerceptions(); // simula remount/refresh da SPA
    const { client, calls } = fakeSupabase({ error: null });
    await linkPerceptionToSession(client, "aluna1", "sess-1", "2026-08-29");
    expect(calls).toHaveLength(1);
    expect(calls[0].eq).toEqual(["id", "obs-123"]);
  });

  it("sem registro nenhum → não toca o banco", async () => {
    const { client, calls } = fakeSupabase({ error: null });
    await linkPerceptionToSession(client, "aluna-sem-registro", "sess-1", "2026-08-29");
    expect(calls).toHaveLength(0);
  });
});

describe("validação do vínculo pelo fingerprint (fria R8b)", () => {
  beforeEach(() => {
    _clearRememberedPerceptions();
    vi.stubGlobal("sessionStorage", (() => {
      const store = new Map<string, string>();
      return {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      };
    })());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("hero trocou de fonte (fingerprint diferente) → vínculo pendente morre", async () => {
    rememberPerceptionObservation("aluna1", "2026-08-29", "obs-whoop", "fp-whoop");
    validateRememberedPerception("aluna1", "fp-oura"); // dashboard re-renderizou como Oura
    const { client, calls } = fakeSupabase({ error: null });
    await linkPerceptionToSession(client, "aluna1", "sess-1", "2026-08-29");
    expect(calls).toHaveLength(0);
  });

  it("mesmo fingerprint → vínculo sobrevive à validação", async () => {
    rememberPerceptionObservation("aluna1", "2026-08-29", "obs-123", "fp-1");
    validateRememberedPerception("aluna1", "fp-1");
    const { client, calls } = fakeSupabase({ error: null });
    await linkPerceptionToSession(client, "aluna1", "sess-1", "2026-08-29");
    expect(calls).toHaveLength(1);
  });
});
