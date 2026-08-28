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

describe("refinamento R1 — hierarquia enxuta e alertas consolidados", () => {
  it("badge de zona usa rótulo curto por fonte; prescrição em linha única", () => {
    expect(dash).toContain("SNAPSHOT_ZONE_SHORT[snapshot.source][snapshot.zone]");
    expect(dash).toMatch(/formatPrescriptionLine\(/);
    // a linha antiga "intensity · duration" com o % de FCmáx morreu
    expect(dash).not.toMatch(/\{recommendation!\.intensity\} · \{recommendation!\.duration\}/);
  });

  it("origem/data só quando o dado está velho (2+ dias) — decisão de produto ratificada 28/08, NÃO é bug", () => {
    expect(dash).toMatch(/\{snapshot\.isStale && \(/);
    // isStale usa a definição canônica do app (2 dias de calendário,
    // recoverySnapshot.ts) — o call site não inventa limiar próprio
    expect(dash).not.toMatch(/staleAfterDays=/);
  });

  it("a pilha de cards de alerta morreu; consolidação via partitionAlerts", () => {
    expect(dash).not.toContain("recommendation.alerts.map");
    expect(dash).toMatch(/partitionAlerts\(/);
    expect(dash).toContain("Atenção hoje");
    // partição calculada DEPOIS dos tiles (eles são condicionais ao dado)
    const tilesIdx = dash.indexOf("const physiology");
    const partIdx = dash.indexOf("const alertPartition");
    expect(tilesIdx).toBeGreaterThan(-1);
    expect(partIdx).toBeGreaterThan(tilesIdx);
  });

  it("o aviso de override do hero morreu (vive no card consolidado)", () => {
    expect(dash).not.toContain("Override agudo ativo:");
  });

  it("mensagens do motor são sanitizadas de emoji na apresentação", () => {
    expect(dash).toMatch(/stripAlertEmoji\(alert\.message\)/);
  });

  it("FC pico ganhou tile (o alerta de pico tem onde morar)", () => {
    expect(dash).toContain('label="FC pico (dia)"');
    expect(dash).toMatch(/metric: "fc_pico"/);
  });

  it("tiles recebem o estado de atenção da sua métrica", () => {
    expect(dash).toMatch(/alertPartition\.byTile\.get\(p\.metric\)/);
  });

  it("avatar do header centralizado com o anel contido no layout", () => {
    expect(page).toMatch(/self-center m-2/);
  });
});

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

  it("página busca Whoop na aba training (a aba whoop se auto-serve desde o 5b)", () => {
    expect(page).toMatch(/needsWhoop = activeTab === "training"/);
  });

  it("página propaga loading/erro pro dashboard", () => {
    expect(page).toContain("isLoading={loadingOuraMetrics || loadingWhoopMetrics || loadingLatestOura}");
    expect(page).toContain("isError={ouraMetricsError || whoopMetricsError}");
    expect(page).toContain("latestOuraError={latestOuraError}");
    // com snapshot presente, erro só do latest NÃO pode afirmar "sem score":
    // a cadeia de mensagens testa latestOuraError ANTES da afirmação
    const chain = dash.slice(dash.indexOf("Carregando recomendação do dia"));
    const errIdx = chain.indexOf("Não foi possível carregar o score do dia");
    const claimIdx = chain.indexOf("Sem score de prontidão fechado");
    expect(errIdx).toBeGreaterThan(-1);
    expect(claimIdx).toBeGreaterThan(errIdx);
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

describe("coerência de fontes (fix pós-review Codex)", () => {
  it("conteúdo Oura é gateado quando o hero é Whoop", () => {
    expect(dash).toContain("const ouraIsCurrent");
    expect(dash).toContain("ouraIsCurrent && Boolean(latestMetrics && recommendation)");
  });

  it("card de carga vazio tem a MESMA guarda do cheio", () => {
    const emptyGuard = dash.match(/hasOuraRecommendation && loadSuggestions && loadSuggestions\.length === 0/);
    const fullGuard = dash.match(/hasOuraRecommendation && loadSuggestions && loadSuggestions\.length > 0/);
    expect(emptyGuard).not.toBeNull();
    expect(fullGuard).not.toBeNull();
  });

  it("sort do snapshot usa localeCompare (contrato correto p/ datas iguais)", () => {
    expect(snapshotUtil.match(/localeCompare/g)?.length).toBe(2);
    expect(snapshotUtil).not.toContain("a.date < b.date ? 1 : -1");
  });
});
