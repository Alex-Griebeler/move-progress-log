/**
 * PR-2 do redesign — invariantes source-based da aba Treinamento.
 *
 * Cobre:
 *   • hero único: readiness não aparece mais em 4 formatos (sem tile
 *     "Prontidão" duplicado, sem "Confiança da recomendação", sem saudação);
 *   • zero emoji na superfície (coerência ratificada);
 *   • hero agnóstico via RecoverySnapshot (skip PENDING_SCORE no util);
 *   • wiring: página busca Whoop também no training e propaga estados;
 *   • motor useTrainingRecommendation INTOCADO (Oura-only por decisão).
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dash = readFileSync(
  resolve(__dirname, "../PersonalizedTrainingDashboard.tsx"),
  "utf-8",
);
const page = readFileSync(
  resolve(__dirname, "../../pages/StudentDetailPage.tsx"),
  "utf-8",
);
const snapshotUtil = readFileSync(
  resolve(__dirname, "../../utils/recoverySnapshot.ts"),
  "utf-8",
);

describe("hero único de recuperação", () => {
  it("usa ScoreRing + StaleBadge + RecoverySnapshot", () => {
    expect(dash).toContain("ScoreRing");
    expect(dash).toContain("StaleBadge");
    expect(dash).toContain("buildRecoverySnapshot");
  });

  it("mata as apresentações duplicadas do readiness", () => {
    expect(dash).not.toContain("Confiança da recomendação");
    expect(dash).not.toContain("Olá, {studentName}");
    // O tile "Prontidão" do hero antigo (o anel é a única prontidão agora).
    expect(dash).not.toMatch(/>Prontidão</);
  });

  it("zero emoji na superfície", () => {
    expect(dash).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  it("recommendation.emoji não é renderizado", () => {
    expect(dash).not.toContain("recommendation.emoji");
    expect(dash).not.toMatch(/\{recommendation!?\.emoji\}/);
  });
});

describe("agnóstico de wearable", () => {
  it("snapshot pula Whoop com score não-fechado", () => {
    expect(snapshotUtil).toContain('score_state === "SCORED"');
  });

  it("empate de data resolve pra Oura", () => {
    expect(snapshotUtil).toContain("whoop.date > oura.date");
  });

  it("página busca Whoop também na aba training", () => {
    expect(page).toMatch(/needsWhoop = activeTab === "whoop" \|\| activeTab === "training"/);
  });

  it("página propaga loading/erro pro dashboard", () => {
    expect(page).toContain("isLoading={loadingOuraMetrics || loadingWhoopMetrics}");
    expect(page).toContain("isError={ouraMetricsError || whoopMetricsError}");
  });
});

describe("motor de recomendação intocado (Oura-only nesta fase)", () => {
  it("useTrainingRecommendation continua recebendo só métricas Oura", () => {
    expect(dash).toContain(
      "useTrainingRecommendation(latestMetrics, recentMetrics, baseline, undefined, latestAcuteMetrics)",
    );
  });

  it("aluno só-Whoop recebe nota explícita (recomendação usa Oura)", () => {
    expect(dash).toContain("recomendação automática de treino usa dados do Oura");
  });
});
