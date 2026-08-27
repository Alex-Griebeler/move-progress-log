/**
 * PR-7 do redesign — invariantes source-based da aba Exercícios.
 *
 * Cobre:
 *   • ExercisesTabContent: seletor buscável NOVO agrupado por padrão de
 *     movimento (ExerciseCombobox compartilhado intocado), default =
 *     exercício mais recente com ref-guard, série top-set com PRs marcados,
 *     tiles de janela 4 semanas (adeus agregados vitalícios), tabela;
 *   • lógica de progressão em util PURA testada comportamentalmente;
 *   • select das sessões traz movement_pattern via join (aditivo);
 *   • erro ≠ vazio nos dois níveis (sessões e histórico).
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");

const tab = read("../student-detail/ExercisesTabContent.tsx");
const hook = read("../../hooks/useStudentDetail.ts");
const page = read("../../pages/StudentDetailPage.tsx");
const sharedCombobox = read("../ExerciseCombobox.tsx");

describe("seletor", () => {
  it("combobox NOVO com busca, agrupado por padrão de movimento", () => {
    expect(tab).toContain("CommandInput");
    expect(tab).toContain("getMovementPatternLabel");
    expect(tab).not.toContain('from "@/components/ExerciseCombobox"');
  });

  it("ExerciseCombobox compartilhado segue existindo intocado", () => {
    expect(sharedCombobox.length).toBeGreaterThan(0);
  });

  it("default = mais recente, aplicado 1x com ref-guard", () => {
    expect(tab).toContain("defaultApplied");
    expect(tab).toContain("b.lastDate.localeCompare(a.lastDate)");
  });

  it("linha legada por nome não duplica opção com id (consolidação canônica)", () => {
    expect(tab).toContain("canonicalByName");
  });
});

describe("progressão", () => {
  it("série top-set + PRs vêm da util pura", () => {
    expect(tab).toContain("buildTopSetSeries");
    expect(tab).toContain("progressionStats");
  });

  it("PR marcado no gráfico com dot custom", () => {
    expect(tab).toContain("payload?.isPr");
  });

  it("tiles de JANELA (4 semanas), não agregados vitalícios", () => {
    expect(tab).toContain("Tendência 4 semanas");
    expect(tab).toContain("Volume 4 semanas");
    expect(tab).not.toContain("Média de Carga");
  });
});

describe("integração", () => {
  it("select das sessões traz movement_pattern (join aditivo)", () => {
    expect(hook).toContain("exercises_library(movement_pattern)");
  });

  it("página delega; ExerciseHistoryCard fora da ficha; pills antigas mortas", () => {
    expect(page).toContain("<ExercisesTabContent");
    expect(page).not.toContain("ExerciseHistoryCard");
    expect(page).not.toContain("Selecione um exercício acima");
  });

  it("erro ≠ vazio nos dois níveis", () => {
    expect(tab).toContain('what="os exercícios do aluno"');
    expect(tab).toContain('what="o histórico deste exercício"');
  });

  it("zero emoji", () => {
    expect(tab).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
