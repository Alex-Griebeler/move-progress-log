/**
 * PR-5a do redesign — invariantes source-based da aba Oura.
 *
 * Cobre:
 *   • useOuraMetrics com janela de CALENDÁRIO ({days}) via .gte + query key
 *     DISTINTA da API por linhas (nunca colidem no cache) + cutoff em
 *     America/Sao_Paulo; hook segue leitura pura (sem mutation — invariante
 *     do wearablesRlsWriteLockdown);
 *   • OuraTabContent substitui as pilhas de cards clonados por dia
 *     (slice(1, 7) morreu) por hero + TrendChart + tabela;
 *   • conexão/diagnóstico no rodapé (accordion), diagnóstico admin-only;
 *   • ProtocolRecommendationsCard mora aqui agora (intacto);
 *   • página delega e para de buscar histórico Oura pra aba (o componente
 *     busca a própria janela).
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");

const hook = read("../../hooks/useOuraMetrics.ts");
const tab = read("../student-detail/OuraTabContent.tsx");
const page = read("../../pages/StudentDetailPage.tsx");

describe("useOuraMetrics — janela de calendário", () => {
  it("opção {days} com .gte e key distinta", () => {
    expect(hook).toContain('["oura-metrics", studentId, "days", days, spToday()]');
    expect(hook).toContain('["oura-metrics", studentId, limit]');
    expect(hook).toContain('.gte("date", spCutoff(days))');
  });

  it("cutoff calculado em America/Sao_Paulo", () => {
    expect(hook).toContain('timeZone: "America/Sao_Paulo"');
  });

  it("hook segue LEITURA pura (invariante RLS de wearables)", () => {
    expect(hook).not.toContain("useMutation");
    expect(hook).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  });
});

describe("OuraTabContent — tendência no lugar de pilha de cards", () => {
  it("usa TrendChart + ScoreRing + tabela por dia", () => {
    expect(tab).toContain("TrendChart");
    expect(tab).toContain("ScoreRing");
    expect(tab).toContain("DayTable");
  });

  it("a pilha de cards clonados morreu", () => {
    expect(tab).not.toContain("slice(1, 7)");
    expect(tab).not.toContain("OuraMetricsCard");
    expect(tab).not.toContain("OuraSleepDetailCard");
    expect(tab).not.toContain("OuraStressCard");
    expect(tab).not.toContain("OuraAdvancedMetricsCard");
  });

  it("toggle de período 7/30/90 dias", () => {
    expect(tab).toContain("[7, 30, 90]");
    expect(tab).toContain("days: period");
  });

  it("conexão/diagnóstico no rodapé; diagnóstico admin-only", () => {
    expect(tab).toContain("Conexão e diagnóstico");
    expect(tab).toContain("{isAdmin && <OuraApiDiagnosticsCard");
  });

  it("ProtocolRecommendationsCard mora aqui (intacto)", () => {
    expect(tab).toContain("ProtocolRecommendationsCard");
  });

  it("erro ≠ vazio com retry", () => {
    expect(tab).toContain("DataErrorState");
  });

  it("zero emoji", () => {
    expect(tab).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe("página", () => {
  it("delega a aba pro OuraTabContent", () => {
    expect(page).toContain("<OuraTabContent");
  });

  it("histórico Oura da página é só pro training (a aba busca a própria janela)", () => {
    expect(page).toContain('const needsOuraHistory = activeTab === "training"');
  });

  it("cards antigos do Oura não são mais importados pela página", () => {
    expect(page).not.toContain("OuraMetricsCard");
    expect(page).not.toContain("OuraStressCard");
  });
});

describe("fixes pós-review Codex", () => {
  it("janela com teto (.lte hoje) e limit exato (banco tem UNIQUE por dia)", () => {
    expect(hook).toContain('.lte("date", spToday())');
    expect(hook).toContain(".limit(days)");
    expect(hook).not.toContain("days + 7");
  });

  it("séries densificadas por dia da janela (buraco não comprime o eixo)", () => {
    expect(tab).toContain("spWindowDates");
    expect(tab).toContain("windowDates.map");
  });

  it("header e rodapé acessíveis em TODOS os estados (erro não esconde sync/protocolos)", () => {
    expect(tab).toContain("let body: ReactNode;");
    expect(tab).toContain("{body}");
    expect(tab).toContain("{footer}");
  });
});

describe("fixes pós-revisão FRIA", () => {
  it("ausência de dado nos gráficos vira null, nunca zero fabricado", () => {
    const tabSrc = read("../student-detail/OuraTabContent.tsx");
    expect(tabSrc).toContain("v === null || v === undefined ? null");
    expect(tabSrc).not.toContain("deep_sleep_duration ?? 0");
    expect(tabSrc).not.toContain("stress_high_time ?? 0");
  });

  it("faixas de score seguem o padrão vigente (85/70)", () => {
    const tabSrc = read("../student-detail/OuraTabContent.tsx");
    expect(tabSrc).toContain("score >= 85");
    expect(tabSrc).toContain("score >= 70");
  });

  it("toggle de período com aria-pressed", () => {
    const tabSrc = read("../student-detail/OuraTabContent.tsx");
    expect(tabSrc).toContain("aria-pressed={period === p}");
  });

  it("virada de meia-noite: key da janela inclui o dia corrente", () => {
    expect(hook).toContain('"days", days, spToday()');
  });

  it("métricas antigas seguem acessíveis (distribuição, treino, latência, respiração)", () => {
    const tabSrc = read("../student-detail/OuraTabContent.tsx");
    for (const f of ["total_calories", "high_activity_time", "sedentary_time", "training_volume", "sleep_latency", "average_breath", "awake_time"]) {
      expect(tabSrc).toContain(f);
    }
  });
});
