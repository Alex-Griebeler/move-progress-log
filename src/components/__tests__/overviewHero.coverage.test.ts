/**
 * PR-4 do redesign — invariantes source-based da Visão geral.
 *
 * Cobre:
 *   • card clínico ÚNICO no topo (observações com resolve preservado +
 *     limitations/injury como seção; dismiss por SESSÃO, sem localStorage);
 *   • hero de adesão (meta ×4,33, nunca ×4) + WeekBars 4 semanas;
 *   • exercícios únicos 30d via util canônica compartilhada;
 *   • prescrições vigentes via assignmentStatus (fórmula única do PR-3);
 *   • TrainingZonesCard fora da overview (mora no Treinamento desde o PR-2);
 *   • ProtocolRecommendationsCard preservado (accordion, fluxo de escrita);
 *   • zero emoji; StatCard não é mais usado NA FICHA (segue no dashboard);
 *   • wiring isLoading real (skeleton em vez de zeros falsos).
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");

const overview = read("../StudentOverviewDashboard.tsx");
const obsCard = read("../StudentObservationsCard.tsx");
const page = read("../../pages/StudentDetailPage.tsx");

describe("card clínico único", () => {
  it("overview passa limitations/injury pro card de observações", () => {
    expect(overview).toContain("limitations={student.limitations}");
    expect(overview).toContain("injuryHistory={student.injury_history}");
  });

  it("card preserva o resolve (mutation) e o erro com retry", () => {
    expect(obsCard).toContain("markAsResolvedMutation");
    expect(obsCard).toContain("Tentar novamente");
  });

  it("dismiss da seção clínica é por sessão (state), NUNCA localStorage", () => {
    expect(obsCard).toContain("setMedicalSectionDismissed");
    // A PALAVRA pode aparecer em comentário explicando a decisão — o que não
    // pode existir é USO da API (localStorage.get/set).
    expect(obsCard).not.toMatch(/localStorage\./);
    expect(overview).not.toMatch(/localStorage\./);
  });

  it("card duplicado de Considerações Médicas saiu da overview", () => {
    expect(overview).not.toContain("Considerações Médicas");
    expect(overview).not.toContain("medical-alert-dismissed");
  });
});

describe("hero de adesão", () => {
  it("meta mensal usa ×4,33 (meses têm ~4,33 semanas), nunca ×4", () => {
    expect(overview).toContain("* 4.33");
    expect(overview).not.toMatch(/weekly_sessions_proposed \* 4(?!\.)/);
  });

  it("ScoreRing + WeekBars presentes", () => {
    expect(overview).toContain("ScoreRing");
    expect(overview).toContain("WeekBars");
  });
});

describe("fórmulas únicas (fim das divergências da auditoria)", () => {
  it("exercícios únicos via util canônica com janela 30d", () => {
    expect(overview).toContain("countUniqueExercises(sessions, { days: 30 })");
    expect(overview).not.toMatch(/exerciseNames\.add/);
  });

  it("prescrições vigentes via assignmentStatus (mesma regra do PR-3)", () => {
    expect(overview).toContain('assignmentStatus(a) === "vigente"');
  });
});

describe("estrutura", () => {
  it("TrainingZonesCard fora da overview", () => {
    expect(overview).not.toContain("TrainingZonesCard");
  });

  it("ProtocolRecommendationsCard migrou INTACTO pra aba Oura (PR-5a)", () => {
    expect(overview).not.toContain("ProtocolRecommendationsCard");
    const ouraTab = read("../student-detail/OuraTabContent.tsx");
    expect(ouraTab).toContain("ProtocolRecommendationsCard");
  });

  it("StatCard não é mais usado na overview (segue intocado no dashboard)", () => {
    expect(overview).not.toContain("StatCard");
  });

  it("zero emoji", () => {
    expect(overview).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  it("página propaga isLoading real", () => {
    expect(page).toContain("isLoading={loadingSessions || loadingAssignments}");
  });
});

describe("fixes pós-review Codex", () => {
  it("seção clínica fixa renderiza também nos branches de loading e erro", () => {
    // medicalSection definida ANTES dos early returns e presente 3×.
    expect(obsCard.match(/\{medicalSection\}/g)?.length).toBe(3);
  });

  it("dismiss reseta ao trocar de aluno", () => {
    expect(obsCard).toMatch(/setMedicalSectionDismissed\(false\);\s*\}, \[studentId\]\)/);
  });

  it("util canônica consolida linha legada sem id com linha com id (2 passadas)", () => {
    const util = read("../../utils/uniqueExercises.ts");
    expect(util).toContain("nameToId");
  });

  it("sessões futuras não inflam adesão/semana/última sessão", () => {
    expect(overview.match(/endOfToday/g)?.length).toBeGreaterThanOrEqual(2);
    expect(overview).toContain("s.date <= today");
  });
});
