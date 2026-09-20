/**
 * Auditoria técnica de 20/09 (fase 2) — rascunho de um treinador não pode
 * reaparecer para o próximo no tablet do estúdio.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  purgeDraftsOutsideIdentity,
  purgeSessionScopedPrivateData,
  scopedDraftKey,
} from "../draftStorage";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(i: number) { return Array.from(this.map.keys())[i] ?? null; }
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

const ANA = "aaaaaaaa-0000-0000-0000-000000000001";
const BRUNO = "bbbbbbbb-0000-0000-0000-000000000002";

let store: MemoryStorage;
beforeEach(() => {
  store = new MemoryStorage();
});

describe("scopedDraftKey", () => {
  it("põe o dono na chave e devolve null sem identidade", () => {
    expect(scopedDraftKey("session_draft_v2_p1", ANA)).toBe(`session_draft_v2_p1::u:${ANA}`);
    expect(scopedDraftKey("session_draft_v2_p1", null)).toBeNull();
  });

  it("treinadores diferentes nunca compartilham chave", () => {
    expect(scopedDraftKey("session_draft_v2_p1", ANA)).not.toBe(
      scopedDraftKey("session_draft_v2_p1", BRUNO),
    );
  });
});

describe("purgeDraftsOutsideIdentity", () => {
  it("apaga o rascunho do outro treinador e preserva o de quem entrou", () => {
    store.setItem(`session_draft_v2_p1::u:${ANA}`, '{"trainer":"Ana"}');
    store.setItem(`session_draft_history_::u:${ANA}`, "[]");
    store.setItem(`session_draft_v2_p1::u:${BRUNO}`, '{"trainer":"Bruno"}');
    store.setItem(`prescription-draft::u:${BRUNO}`, "{}");

    purgeDraftsOutsideIdentity(BRUNO, store);

    expect(store.getItem(`session_draft_v2_p1::u:${ANA}`)).toBeNull();
    expect(store.getItem(`session_draft_history_::u:${ANA}`)).toBeNull();
    expect(store.getItem(`session_draft_v2_p1::u:${BRUNO}`)).toBe('{"trainer":"Bruno"}');
    expect(store.getItem(`prescription-draft::u:${BRUNO}`)).toBe("{}");
  });

  it("no logout apaga todos os rascunhos", () => {
    store.setItem(`session_draft_v2_p1::u:${ANA}`, "{}");
    store.setItem(`prescription_draft_history_::u:${BRUNO}`, "[]");
    purgeDraftsOutsideIdentity(null, store);
    expect(store.length).toBe(0);
  });

  it("descarta as chaves antigas, sem dono, em vez de herdá-las", () => {
    store.setItem("session_draft_history_v1", '[{"trainer":"Ana"}]');
    store.setItem("prescription_draft_history_v1", "[]");
    store.setItem("session_draft_v2_default", '{"trainer":"Ana"}');
    purgeDraftsOutsideIdentity(BRUNO, store);
    expect(store.length).toBe(0);
  });

  it("não toca no que não é rascunho", () => {
    store.setItem("theme", "dark");
    store.setItem("sb-auth-token", "xxx");
    purgeDraftsOutsideIdentity(BRUNO, store);
    expect(store.getItem("theme")).toBe("dark");
    expect(store.getItem("sb-auth-token")).toBe("xxx");
  });
});

describe("purgeSessionScopedPrivateData", () => {
  it("limpa percepção e marcação de grupo, preservando o resto", () => {
    store.setItem("percepcao_treino:s1", "{}");
    store.setItem("fabrik:group-manual-saved:p1:2026-09-20", "{}");
    store.setItem("algo-publico", "1");
    purgeSessionScopedPrivateData(store);
    expect(store.getItem("percepcao_treino:s1")).toBeNull();
    expect(store.getItem("fabrik:group-manual-saved:p1:2026-09-20")).toBeNull();
    expect(store.getItem("algo-publico")).toBe("1");
  });
});
