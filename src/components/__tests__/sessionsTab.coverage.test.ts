/**
 * PR-6 do redesign — invariantes source-based da aba Sessões.
 *
 * Cobre:
 *   • SessionsTabContent com strip de tendência (WeekBars + volume semanal)
 *     e agrupamento por semana;
 *   • SessionCard NOVO da ficha (WorkoutCard segue intocado no dashboard):
 *     nº exercícios + volume (fórmula única load×sets×reps) + status
 *     Finalizada/Aberta VISÍVEL + indicador de observações + Δ% vs sessão
 *     anterior do MESMO tipo; ações portadas 1:1 (editar/ver/finalizar com
 *     confirm/reabrir);
 *   • select das sessões ganha observations (aditivo);
 *   • erro ≠ vazio; sem selo de intensidade absoluta (decisão do plano);
 *   • futuro não conta na strip semanal.
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");

const tab = read("../student-detail/SessionsTabContent.tsx");
const card = read("../student-detail/SessionCard.tsx");
const hook = read("../../hooks/useStudentDetail.ts");
const page = read("../../pages/StudentDetailPage.tsx");
const workoutCard = read("../WorkoutCard.tsx");

describe("SessionCard (novo, da ficha)", () => {
  it("mostra conteúdo que o WorkoutCard descartava: exercícios, volume, status, obs", () => {
    expect(card).toContain("exerciseCount");
    expect(card).toContain("totalVolumeKg");
    expect(card).toContain("Finalizada");
    expect(card).toContain("hasObservations");
  });

  it("Δ% vs sessão anterior do mesmo tipo (null sem base)", () => {
    expect(card).toContain("volumeDeltaPercent");
    expect(tab).toContain("computeVolumeDeltas");
  });

  it("ações portadas 1:1, incluindo confirm de finalizar", () => {
    for (const a of ["Editar Sessão", "Ver Detalhes", "Finalizar Sessão", "Reabrir Sessão", "Finalizar sessão?"]) {
      expect(card).toContain(a);
    }
  });

  it("sem avatar e sem selo de intensidade absoluta", () => {
    expect(card).not.toContain("Avatar");
    expect(card).not.toMatch(/5000|2000/);
  });
});

describe("SessionsTabContent", () => {
  it("strip de tendência: frequência 8 semanas + volume semanal (via util)", () => {
    expect(tab).toContain("WeekBars");
    expect(tab).toContain("Volume por semana");
    expect(tab).toContain("weeklyAggregates(all, 8)");
  });

  it("futuro não conta na strip (na util)", () => {
    const util = read("../../utils/sessionTrends.ts");
    expect(util).toContain("endOfToday");
  });

  it("agrupamento por semana", () => {
    expect(tab).toContain("Semana de");
    expect(tab).toContain("mondayOf");
  });

  it("fórmula única de volume (load × sets × reps) na util", () => {
    const util = read("../../utils/sessionTrends.ts");
    expect(util).toContain("ex.load_kg * ex.sets * ex.reps");
  });

  it("erro ≠ vazio com retry; chips com aria-pressed", () => {
    expect(tab).toContain("DataErrorState");
    expect(tab).toContain("aria-pressed={typeFilter === chip.key}");
  });
});

describe("integração", () => {
  it("select das sessões traz observations", () => {
    expect(hook).toMatch(/reps,\s*observations/);
  });

  it("página delega com estados e handlers; WorkoutCard fora da ficha", () => {
    expect(page).toContain("<SessionsTabContent");
    expect(page).toContain("isError={sessionsError}");
    expect(page).not.toContain('from "@/components/WorkoutCard"');
  });

  it("WorkoutCard segue existindo intocado (dashboard)", () => {
    expect(workoutCard).toContain("WorkoutCardProps");
  });
});

describe("fixes pós-review Codex (PR-6)", () => {
  it("deltas e semanas vêm da util PURA testada comportamentalmente", () => {
    expect(tab).toContain('from "@/utils/sessionTrends"');
    expect(tab).toContain("computeVolumeDeltas(all)");
    expect(tab).toContain("weeklyAggregates(all, 8)");
  });

  it("empate de data ordena por hora+id na util", () => {
    const util = read("../../utils/sessionTrends.ts");
    expect(util).toContain('(a.time ?? "").localeCompare(b.time ?? "")');
    expect(util).toContain("a.id.localeCompare(b.id)");
  });

  it("semana sem sessão = zero real, não null", () => {
    expect(tab).toContain("value: w.totalVolumeKg");
    expect(tab).not.toContain("? Math.round(weekVolume) : null");
  });
});
