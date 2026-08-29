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

describe("fachada Oura intocada (paridade)", () => {
  it("useTrainingRecommendation continua recebendo só métricas Oura (a linha do dia do snapshot)", () => {
    expect(dash).toContain(
      "useTrainingRecommendation(ouraDayRow, recentMetrics, baseline, undefined, latestAcuteMetrics)",
    );
  });

  it("R5: aluno só-Whoop recebe recomendação nativa (não mais a nota Oura-only)", () => {
    // A fase Oura-only acabou: o hero Whoop alimenta o motor via adapter.
    expect(dash).not.toContain("recomendação automática de treino usa dados do Oura");
    expect(dash).toContain("buildWhoopRecommendation(whoopMetrics, earlySnapshot.date, spToday())");
    // Estado pendente é ALCANÇÁVEL nos dois casos: sem dia fechado (estado
    // vazio) e com hero de dia anterior (nota sob o hero — revisão fria).
    expect(dash).toContain("recovery do dia ainda está sendo processado pelo aparelho");
    expect(dash).toContain("const whoopStillProcessing = !snapshot && unscoredWhoopDay !== null;");
    expect(dash).toMatch(/newerUnscoredWhoopDay\(whoopMetrics, snapshot\?\.date \?\? null\)/);
    // UNSCORABLE é terminal — a UI não promete que "vai fechar" (auditoria 29/08).
    expect(dash).toContain("não conseguiu pontuar");
    expect(dash).toContain("ainda está processando no Whoop — mostrando o último dia fechado");
    expect(dash).toContain("{whoopPendingNote && (");
    expect(dash).toContain("Sem recovery utilizável para o dia mais recente");
  });
});

describe("coerência de fontes (fix pós-review Codex)", () => {
  it("conteúdo Oura é gateado quando o hero é Whoop", () => {
    expect(dash).toContain("const ouraIsCurrent");
    expect(dash).toContain("ouraIsCurrent && Boolean(ouraDayRow && recommendation)");
  });

  it("card de carga vazio tem a MESMA guarda do cheio (fonte ativa, R5)", () => {
    const emptyGuard = dash.match(/hasActionableRecommendation && loadSuggestions && loadSuggestions\.length === 0/);
    const fullGuard = dash.match(/hasActionableRecommendation && loadSuggestions && loadSuggestions\.length > 0/);
    expect(emptyGuard).not.toBeNull();
    expect(fullGuard).not.toBeNull();
  });

  it("sort do snapshot usa localeCompare (contrato correto p/ datas iguais)", () => {
    expect(snapshotUtil.match(/localeCompare/g)?.length).toBe(2);
    expect(snapshotUtil).not.toContain("a.date < b.date ? 1 : -1");
  });
});

describe("R5 — fiação Whoop na recomendação (fonte ativa)", () => {
  it("recomendação ativa segue o snapshot: whoop → buildWhoopRecommendation, senão Oura", () => {
    // O comentário do anchor vive entre o "?" e a chamada — asserts por parte.
    expect(dash).toMatch(
      /whoopRec =\n\s*earlySnapshot\?\.source === "whoop"/,
    );
    expect(dash).toMatch(
      /\? buildWhoopRecommendation\(whoopMetrics, earlySnapshot\.date, spToday\(\)\)\s*: null/,
    );
    expect(dash).toMatch(/whoopRec\?\.recommendation \?\? null\s*: recommendation/);
  });

  it("carga usa a recomendação da MESMA fonte do hero", () => {
    expect(dash).toContain("useLoadSuggestions(studentId, activeRecommendation)");
  });

  it("alternativas de treino usam a zona da fonte ativa", () => {
    expect(dash).toContain(
      "hasActionableRecommendation && activeRecommendation ? activeRecommendation.zone : null",
    );
  });

  it("tiles Whoop têm metric keys pros alertas ancorarem (HRV, FCR, sono)", () => {
    // Cada key aparece 2×: uma no ramo Oura, outra no Whoop — exceto o sono,
    // que no Whoop usa o tile próprio de performance.
    expect(dash).toMatch(/key: "hrv-whoop",\s*metric: "hrv_noturna"/);
    expect(dash).toMatch(/key: "fcr-whoop",\s*metric: "fc_repouso"/);
    expect(dash).toMatch(/key: "sono-whoop",\s*metric: "sono"/);
  });

  it("nomenclatura source-aware no diálogo de alternativas", () => {
    expect(dash).toContain('snapshot.source === "oura" ? "readiness" : "recovery"');
  });

  it("página busca a janela da recomendação (constante compartilhada, não número solto)", () => {
    expect(page).toContain('useWhoopMetrics(needsWhoop ? studentId : "", { days: WHOOP_RECOMMENDATION_WINDOW_DAYS })');
    expect(page).not.toMatch(/useWhoopMetrics\([^)]*,\s*7\)/);
  });

  it("tiles de agudas só mostram agudas do DIA do snapshot", () => {
    expect(dash).toMatch(/latestAcuteMetrics && latestAcuteMetrics\.date === snapshot\.date \? latestAcuteMetrics : null/);
    // Nenhum tile lê latestAcuteMetrics direto — só via acuteDayRow gateado.
    expect(dash).not.toMatch(/latestAcuteMetrics\??\.(hrv_night_min|hrv_night_last|hr_day_avg|hr_day_max)/);
  });

  it("recomendação Whoop recebe o anchor da consulta (guard de baseline truncado)", () => {
    expect(dash).toContain("buildWhoopRecommendation(whoopMetrics, earlySnapshot.date, spToday())");
    expect(page).toContain("{ days: WHOOP_RECOMMENDATION_WINDOW_DAYS }");
  });

  it("latestMetrics participa da DECISÃO da fonte (cache defasado não esconde o Oura mais novo)", () => {
    expect(dash).toMatch(/buildRecoverySnapshot\(\s*latestMetrics \? \[latestMetrics, \.\.\.recentMetrics\] : recentMetrics,\s*whoopMetrics,\s*\)/);
  });

  it("prescrição e tiles Oura casam com o DIA do snapshot (não com latestMetrics de outra query)", () => {
    expect(dash).toContain("useTrainingRecommendation(ouraDayRow, recentMetrics");
    expect(dash).toMatch(/recentMetrics\.find\(\(m\) => m\.date === earlySnapshot\.date\) \?\? latestMetrics/);
    // Nenhum tile Oura lê latestMetrics direto — tudo vem da linha do dia.
    expect(dash).not.toMatch(/latestMetrics\??\.(sleep_score|average_sleep_hrv|resting_heart_rate|temperature_deviation|activity_score|steps|total_sleep_duration)/);
  });
});

describe("R7 — correções da auditoria (29/08)", () => {
  it("fonte só é decidida com as DUAS consultas resolvidas (gate de loading total)", () => {
    expect(dash).toMatch(/if \(isLoading\) \{/);
    expect(dash).not.toContain("if (isLoading && !snapshot) {");
  });

  it("erro parcial de wearable é dito no hero E suspende ação (2ª rodada)", () => {
    expect(dash).toContain("Parte dos dados de wearable não carregou");
    expect(dash).toContain("const hasActionableRecommendation = hasActiveRecommendation && !isError;");
    expect(dash).toContain("{hasActionableRecommendation ? (");
    expect(dash).toContain("Recomendação suspensa: parte dos dados de wearable não carregou");
  });

  it("alternativa escolhida é escopada por {studentId, date}", () => {
    expect(dash).toContain("rawSelectedAlternative.studentId === studentId");
    expect(dash).toContain("rawSelectedAlternative.date === earlySnapshot?.date");
    expect(dash).toContain("setSelectedAlternative({ ...alt, studentId, date: snapshot.date })");
  });

  it("stale ganha nota explícita de conduta datada", () => {
    expect(dash).toContain("Conduta calculada para {snapshotDayLabel}");
  });

  it("baseline Oura ancorado no DIA do snapshot", () => {
    expect(dash).toMatch(/useOuraBaseline\(\s*studentId,\s*30,\s*earlySnapshot\?\.source === "oura" \? earlySnapshot\.date : undefined,?\s*\)/);
  });

  it("títulos carregam a data real quando o snapshot é stale", () => {
    expect(dash).toContain("`Atenção em ${snapshotDayLabel}`");
    expect(dash).toContain("`Fisiologia de ${snapshotDayLabel}`");
  });

  it("carga: loading, erro e bloqueio são estados visíveis", () => {
    expect(dash).toContain("loadSuggestionsLoading");
    expect(dash).toContain("loadSuggestionsError");
    expect(dash).toContain('"Carga bloqueada hoje"');
  });

  it("alternativa escolhida fica visível (não é botão de mentira)", () => {
    expect(dash).toContain("Alternativa escolhida:");
  });
});
