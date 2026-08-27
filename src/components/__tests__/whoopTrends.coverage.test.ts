/**
 * PR-5b do redesign — invariantes source-based da aba Whoop.
 *
 * Cobre:
 *   • useWhoopMetrics com janela de calendário (mesmo contrato do Oura:
 *     gte+lte, key distinta com o dia corrente SP) e leitura pura;
 *   • useSyncWhoop novo (mutation separada, edge whoop-sync, invalidação
 *     por prefixo) — botão admin-only;
 *   • WhoopTabContent: hero do último dia FECHADO (score_state), PENDING
 *     vira "processando" (nunca zero/dash mudo), séries densificadas com
 *     null (lição da revisão fria do 5a), campos antes mortos na tabela;
 *   • fix do flash "Conectar Whoop" (loading da conexão distinto);
 *   • última sincronização com hora relativa;
 *   • faixas de recovery 67/34 (padrão Whoop do app).
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");

const hook = read("../../hooks/useWhoopMetrics.ts");
const connHook = read("../../hooks/useWhoopConnection.ts");
const tab = read("../student-detail/WhoopTabContent.tsx");
const page = read("../../pages/StudentDetailPage.tsx");

describe("useWhoopMetrics — janela de calendário", () => {
  it("opção {days} com gte+lte e key distinta com dia corrente", () => {
    expect(hook).toContain('["whoop-metrics", studentId, "days", days, spToday()]');
    expect(hook).toContain('.gte("date", spCutoff(days)).lte("date", spToday())');
  });

  it("leitura pura (invariante RLS de wearables)", () => {
    expect(hook).not.toContain("useMutation");
    expect(hook).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  });
});

describe("useSyncWhoop", () => {
  it("mutation separada invocando a edge whoop-sync com timeout", () => {
    expect(connHook).toContain("useSyncWhoop");
    expect(connHook).toContain('supabase.functions.invoke("whoop-sync"');
    expect(connHook).toContain("Tempo esgotado");
  });

  it("invalidação por prefixo de metrics e connection", () => {
    expect(connHook).toContain('["whoop-metrics", studentId]');
    expect(connHook).toContain('["whoop-connection", studentId]');
  });

  it("botão de sync é admin-only (auth da edge é admin)", () => {
    expect(tab).toContain("{isAdmin && connection && (");
  });
});

describe("WhoopTabContent", () => {
  it("hero usa só dia FECHADO; PENDING vira 'processando'", () => {
    expect(tab).toContain('m.score_state === "SCORED"');
    expect(tab).toContain('score_state === "PENDING_SCORE"');
    expect(tab).toContain("processando");
  });

  it("séries densificadas com null (ausência nunca vira zero)", () => {
    expect(tab).toContain("spWindowDates");
    expect(tab).toContain("v === null || v === undefined ? null");
    expect(tab).not.toContain("deep_sleep_duration ?? 0");
  });

  it("campos antes mortos agora na tabela", () => {
    for (const f of ["respiratory_rate", "spo2", "skin_temp", "disturbance_count", "sleep_efficiency"]) {
      expect(tab).toContain(f);
    }
  });

  it("flash 'Conectar Whoop' morto: loading da conexão é estado próprio", () => {
    expect(tab).toContain("loadingConnection");
  });

  it("última sync com hora relativa", () => {
    expect(tab).toContain("formatRelativeDay(new Date(connection.last_sync_at))");
  });

  it("faixas 67/34 e zero emoji", () => {
    expect(tab).toContain("score >= 67");
    expect(tab).toContain("score >= 34");
    expect(tab).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  it("toggle com aria-pressed; card antigo não é usado", () => {
    expect(tab).toContain("aria-pressed={period === p}");
    expect(tab).not.toContain("WhoopActivityCard");
  });
});

describe("página", () => {
  it("delega pro WhoopTabContent; needsWhoop volta a ser só do training", () => {
    expect(page).toContain("<WhoopTabContent");
    expect(page).toContain('const needsWhoop = activeTab === "training"');
    expect(page).not.toContain("WhoopActivityCard");
  });
});

describe("fixes pós-review Codex (5b)", () => {
  it("requireScored SÓ no recovery — strain/sono de dia pendente são válidos", () => {
    expect(tab).toContain("requireScored: true");
    expect(tab.match(/requireScored: true/g)?.length).toBe(1);
  });

  it("sync com AbortController real (não Promise.race que vaza o invoke)", () => {
    expect(connHook).toContain("AbortController");
    expect(connHook).toContain("clearTimeout(timeoutId)");
    // A PALAVRA aparece em comentário explicando a decisão — o que não
    // pode existir é a CHAMADA.
    expect(connHook).not.toContain("Promise.race([");
  });

  it("footer não afirma 'desconectado' durante o loading da conexão", () => {
    expect(tab).toContain("{loadingConnection ? (");
  });
});
