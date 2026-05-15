/**
 * E4.2 — Sanity tests source-based pra integração do Coach Console
 * Precision 12. Sem DOM/testing-library — apenas invariantes textuais
 * verificáveis pela leitura do código-fonte, no padrão do
 * QuestionnaireLinkPanel.coverage.test.ts.
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const coachConsolePath = resolve(
  __dirname,
  "../../../pages/CoachConsole.tsx",
);
const coachConsoleSource = readFileSync(coachConsolePath, "utf-8");

const precision12ConsolePath = resolve(__dirname, "../Precision12Console.tsx");
const precision12ConsoleSource = readFileSync(precision12ConsolePath, "utf-8");

const precision12FiltersPath = resolve(__dirname, "../Precision12Filters.tsx");
const precision12FiltersSource = readFileSync(precision12FiltersPath, "utf-8");

describe("E4.2 CoachConsole — sanity", () => {
  it("registra a tab 'precision12' no type Tab", () => {
    expect(coachConsoleSource).toMatch(
      /type\s+Tab\s*=[^;]*'precision12'/,
    );
  });

  it("importa Precision12Console", () => {
    expect(coachConsoleSource).toContain(
      "from '@/components/precision12/Precision12Console'",
    );
  });

  it("renderiza Precision12Console quando tab === 'precision12'", () => {
    expect(coachConsoleSource).toMatch(
      /tab\s*===\s*'precision12'\s*&&\s*<Precision12Console\s*\/>/,
    );
  });

  it("preserva as 3 tabs originais (AI Coach, Analista, Relatório)", () => {
    // Regressão: a tab Precision 12 não pode remover as existentes.
    expect(coachConsoleSource).toContain("'coach'");
    expect(coachConsoleSource).toContain("'analyst'");
    expect(coachConsoleSource).toContain("'report'");
    expect(coachConsoleSource).toContain("AI Coach");
    expect(coachConsoleSource).toContain("Analista");
    expect(coachConsoleSource).toContain("Relatório");
  });
});

describe("E4.2 Precision12Console — sanity", () => {
  it("invoca o hook usePrecision12CoachConsole", () => {
    expect(precision12ConsoleSource).toContain("usePrecision12CoachConsole");
    expect(precision12ConsoleSource).toContain(
      'from "@/hooks/usePrecision12CoachConsole"',
    );
  });

  it("compõe os 3 sub-componentes do E4.2", () => {
    expect(precision12ConsoleSource).toContain("<Precision12KpiCards");
    expect(precision12ConsoleSource).toContain("<Precision12ActionQueue");
    expect(precision12ConsoleSource).toContain(
      "<Precision12StudentProgressTable",
    );
  });

  it("trata os 3 estados do hook (loading / error / empty) antes de renderizar", () => {
    // Loading skeleton, alerta de erro, e empty state pro caso de 0 alunos.
    expect(precision12ConsoleSource).toContain("query.isLoading");
    expect(precision12ConsoleSource).toContain("query.isError");
    expect(precision12ConsoleSource).toMatch(/students\.length\s*===\s*0/);
  });

  it("não introduz mutation (read-only nesta etapa)", () => {
    expect(precision12ConsoleSource).not.toContain("useMutation");
    expect(precision12ConsoleSource).not.toMatch(/supabase\.[a-z]+\.(insert|update|delete|upsert)/);
  });
});

describe("E4.3a Precision12Console — filtros operacionais", () => {
  it("importa e renderiza Precision12Filters", () => {
    expect(precision12ConsoleSource).toContain(
      'from "./Precision12Filters"',
    );
    expect(precision12ConsoleSource).toContain("<Precision12Filters");
  });

  it("usa DEFAULT_PRECISION12_FILTERS como estado inicial", () => {
    expect(precision12ConsoleSource).toContain("DEFAULT_PRECISION12_FILTERS");
    expect(precision12ConsoleSource).toMatch(
      /useState<Precision12FiltersType>\(\s*DEFAULT_PRECISION12_FILTERS,?\s*\)/,
    );
  });

  it("aplica filterActionQueue e filterStudentsForProgress", () => {
    expect(precision12ConsoleSource).toContain("filterActionQueue");
    expect(precision12ConsoleSource).toContain("filterStudentsForProgress");
  });

  it("memoiza derivações filtradas com useMemo", () => {
    expect(precision12ConsoleSource).toContain("useMemo");
  });

  it("distingue empty-real de filter-empty na fila e na tabela", () => {
    // Empty real (sem dado): tratado nos componentes filhos / no early return.
    // Filter-empty: pelo console, comparando lengths.
    expect(precision12ConsoleSource).toContain(
      "data.actionQueue.length > 0 && filteredActionQueue.length === 0",
    );
    expect(precision12ConsoleSource).toContain(
      "data.students.length > 0 && filteredStudents.length === 0",
    );
  });

  it("expõe contador de smoke ocultos via countHiddenSmokeStudents", () => {
    expect(precision12ConsoleSource).toContain("countHiddenSmokeStudents");
    expect(precision12ConsoleSource).toContain("hiddenSmokeCount");
  });

  it("não introduz mutation (filtros são read-only)", () => {
    expect(precision12ConsoleSource).not.toContain("useMutation");
  });
});

describe("E4.3a Precision12Filters — sanity", () => {
  it("expõe as 4 superfícies de filtro (search, alertType, progressStatus, hideTestData)", () => {
    expect(precision12FiltersSource).toContain("searchQuery");
    expect(precision12FiltersSource).toContain("alertType");
    expect(precision12FiltersSource).toContain("progressStatus");
    expect(precision12FiltersSource).toContain("hideTestData");
  });

  it("usa Input + Select + Switch do shadcn", () => {
    expect(precision12FiltersSource).toContain(
      'from "@/components/ui/input"',
    );
    expect(precision12FiltersSource).toContain(
      'from "@/components/ui/select"',
    );
    expect(precision12FiltersSource).toContain(
      'from "@/components/ui/switch"',
    );
  });

  it("contém banner de smoke ocultos com microcopy explicativa", () => {
    expect(precision12FiltersSource).toContain("Dados de teste ocultos");
  });

  it("é read-only — propagado via onFiltersChange (sem fetch/mutation)", () => {
    expect(precision12FiltersSource).toContain("onFiltersChange");
    expect(precision12FiltersSource).not.toContain("useMutation");
    expect(precision12FiltersSource).not.toContain("supabase");
  });
});
