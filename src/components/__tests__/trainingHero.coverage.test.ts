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
import { dirname, join, resolve } from "path";
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

  it("origem/data com tom de ALERTA só com 2+ dias — decisão ratificada 28/08 (R8a: idade em calendário SP)", () => {
    // Desde a R8a a idade vem de snapshotAgeDays (spToday/SP) — mesmo limiar
    // de 2 dias, calendário único; D−1 tem badge neutro próprio (decisão 1b).
    expect(dash).toMatch(/\{snapshotIsStale && \(/);
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
    expect(page).toContain("isError={ouraMetricsError || whoopMetricsError || latestOuraError}");
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
    // R8c: o vazio ganhou o gate extra de escopo resolvido (não duplica
    // com seletor multi-vigente nem com suspensão).
    const emptyGuard = dash.match(/hasActionableRecommendation && sessionScopeResolved && loadSuggestions && loadSuggestions\.length === 0/);
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
    // R8b: a carga segue a CONDUTA efetiva (mesma fonte por construção —
    // conductRecommendation deriva da activeRecommendation); suspensa por
    // sintomas → hook desliga.
    expect(dash).toMatch(/useLoadSuggestions\(\s*studentId,\s*conduct\?\.suspended \? null : conductRecommendation,\s*selectedLoadPrescriptionId,\s*\)/);
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

  it("latestMetrics participa da DECISÃO da fonte — mas só dentro da janela (R8a)", () => {
    expect(dash).toMatch(/buildRecoverySnapshot\(\s*latestInWindow \? \[latestInWindow, \.\.\.recentMetrics\] : recentMetrics,\s*whoopMetrics,\s*\)/);
  });

  it("prescrição e tiles Oura casam com o DIA do snapshot (não com latestMetrics de outra query)", () => {
    expect(dash).toContain("useTrainingRecommendation(ouraDayRow, recentMetrics");
    expect(dash).toMatch(/recentMetrics\.find\(\(m\) => m\.date === earlySnapshot\.date\) \?\? latestInWindow/);
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
    expect(dash).toContain("setSelectedAlternative({ ...alt, studentId, date: snapshot.date, fingerprint: conductFingerprint ?? undefined })");
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

  it("alternativa aplicada fica visível — e agora tem efeito real via conduta (R8b)", () => {
    expect(dash).toContain("Alternativa aplicada:");
    expect(dash).toContain("conduct?.appliedAlternative");
  });
});

describe("R8a — badge ontem + janela Oura de calendário", () => {
  it("D−1 e stale usam a MESMA idade ancorada em SP (calendário único)", () => {
    expect(dash).toContain("const snapshotAgeDays = daysBetweenDateOnly(spToday(), snapshot.date);");
    expect(dash).toContain("const snapshotIsStale = snapshotAgeDays >= 2;");
    expect(dash).toMatch(/\{!snapshotIsStale && snapshotAgeDays === 1 && \(/);
    expect(dash).toMatch(/\{snapshotIsStale && \(/);
    expect(dash).toContain("ageDays={snapshotAgeDays}");
    expect(dash).toContain('· ontem');
    // nenhum consumidor restante do isStale de runtime no hero
    expect(dash).not.toContain("snapshot.isStale");
  });

  it("latest só entra na decisão da fonte DENTRO da janela de 30 dias", () => {
    expect(dash).toContain('const ouraWindowStart = shiftDateOnly(spToday(), -29);');
    expect(dash).toMatch(/latestMetrics && latestMetrics\.date >= ouraWindowStart \? latestMetrics : null/);
    expect(dash).toMatch(/latestInWindow \? \[latestInWindow, \.\.\.recentMetrics\] : recentMetrics/);
    // fallback do dia Oura também respeita a janela
    expect(dash).toContain("recentMetrics.find((m) => m.date === earlySnapshot.date) ?? latestInWindow");
  });

  it("página pede 30 DIAS de calendário do Oura (não 30 linhas)", () => {
    expect(page).toContain("{ days: 30 }");
    expect(page).not.toMatch(/useOuraMetrics\(\s*needsOuraHistory \? studentId : "",\s*30\s*\)/);
  });
});

describe("R8b — percepção da aluna e conduta efetiva", () => {
  it("conduta é computada pelo funil puro e alimenta a carga", () => {
    expect(dash).toContain("computeEffectiveConduct({");
    expect(dash).toContain("conductRecommendation");
  });

  it("default REAL é 'não informada' (pede pra perguntar à aluna)", () => {
    expect(dash).toContain('assessment?.perception ?? "nao_informada"');
    expect(dash).toContain("pergunte à aluna como ela está hoje");
  });

  it("gate de sintomas existe e suspende CTA/carga até avaliação explícita", () => {
    expect(dash).toContain("Sintomas relevantes? (dor aguda, mal-estar, tontura, falta de ar)");
    expect(dash).toContain("Avaliei — liberar conduta conservadora");
    expect(dash).toContain('conduct?.suspended === "symptoms"');
  });

  it("dois níveis rotulados: recomendação do aparelho ≠ conduta ajustada", () => {
    expect(dash).toContain("Recomendação do aparelho");
    expect(dash).toContain("Conduta ajustada após relato da aluna");
  });

  it("conduta zona 0 troca o CTA por registrar descanso", () => {
    expect(dash).toContain("Registrar dia de descanso");
    expect(dash).toMatch(/conduct && conduct\.effectiveZone === 0 \?/);
  });

  it("fase R8b: contexto Whoop fail-closed (unavailable) até a R8d", () => {
    expect(dash).toContain('{ freshness: "unavailable", strain: "unavailable" }');
  });

  it("fingerprint completo invalida modulação quando a recomendação muda", () => {
    expect(dash).toContain("criticalSignature");
    expect(dash).toContain("conductAssessment.fingerprint === conductFingerprint");
  });
});

describe("R8b — fixes da review (fiação)", () => {
  it("alternativa é escopada pelo fingerprint (recomendação mudou → escolha limpa)", () => {
    expect(dash).toContain("selectedAlternative.fingerprint === conductFingerprint");
    expect(dash).toContain("fingerprint: conductFingerprint ?? undefined");
  });

  it("Registrar exige percepção selecionada E sintomas respondidos", () => {
    expect(dash).toContain("assessment?.symptoms == null");
  });

  it("estado 'Registrado' reseta quando o fingerprint muda", () => {
    // invalidação síncrona no updateAssessment + effect pra mudanças externas
    expect((dash.match(/conductVersionRef\.current \+= 1;/g) ?? []).length).toBe(2);
    expect(dash).toMatch(/\}, \[conductFingerprint, scopedAlternative\?\.type\]\);/);
  });

  it("vínculo à sessão usa o ID exato registrado + data da sessão (não spToday)", () => {
    expect(dash).toContain("rememberPerceptionObservation(studentId, registrationDay, observationId, conductFingerprint)");
    // dia capturado UMA vez antes do await (corrida de meia-noite — fria)
    expect(dash).toContain("const registrationDay = spToday();");
    expect(dash).toContain("validateRememberedPerception(studentId, conductFingerprint)");
    expect(page).toContain("linkPerceptionToSession(supabase, id!, sessionId, sessionDate)");
  });

  it("consultas de observações importantes excluem a categoria de percepção", () => {
    for (const rel of [
      "../../hooks/useStudentImportantObservations.ts",
      "../../hooks/useStudentsCardData.ts",
      "../../hooks/useWorkouts.ts",
      "../StudentObservationsCard.tsx",
    ]) {
      const src = readFileSync(join(__dirname, rel), "utf8");
      // NULL-safe: NOT(NULL @> ...) é NULL no Postgres e sumia com
      // observações SEM categoria — a exclusão tem que preservar is.null.
      expect(src, rel).toContain("categories.is.null,categories.not.cs.{percepcao_treino}");
    }
  });

  it("card clínico ganhou a seção própria de histórico de percepção", () => {
    const card = readFileSync(join(__dirname, "../StudentObservationsCard.tsx"), "utf8");
    expect(card).toContain("PerceptionHistorySection");
    expect(card).toContain("Percepção pré-treino");
    expect(card).toMatch(/\.contains\("categories", \["percepcao_treino"\]\)/);
  });
});

describe("R8b — 5ª rodada", () => {
  it("registro exige coach autenticado (created_by nunca null)", () => {
    expect(dash).toContain("sem usuário autenticado — registro abortado");
  });
});

describe("R8b — fria, 2ª rodada", () => {
  it("gravação em voo de conduta antiga é descartada (token de versão)", () => {
    expect(dash).toContain("const startedVersion = conductVersionRef.current;");
    expect(dash).toContain("if (conductVersionRef.current !== startedVersion)");
  });

  it("card só usa o ramo amigável na versão EXATA do formato", () => {
    const card = readFileSync(join(__dirname, "../StudentObservationsCard.tsx"), "utf8");
    expect(card).toContain("parsed.version === PERCEPTION_TEXT_VERSION");
    expect(card).toContain('timeZone: "America/Sao_Paulo"');
    expect(card).toContain("snapDisplay !== day");
  });
});

describe("R8c — carga escopada pela prescrição vigente + incremento da biblioteca", () => {
  it("hook devolve modos e o dashboard consome itens + prescrição ativa", () => {
    expect(dash).toContain("const loadSuggestions = loadResult?.items;");
    expect(dash).toContain("const activePrescriptionId = loadResult?.prescriptionId ?? null;");
  });

  it("multi-vigente sem escolha: seletor explícito + CTA bloqueado (caso 18)", () => {
    expect(dash).toContain('loadResult?.mode === "selection_required"');
    expect(dash).toContain("sem escolha silenciosa");
    // CTA só com escopo RESOLVIDO: carregando/erro/suspenso não viram
    // sessão livre silenciosamente (revisão R8c).
    expect(dash).toContain(
      'loadResult?.mode === "prescription" || loadResult?.mode === "fallback_recent"',
    );
    expect(dash).toContain("disabled={!sessionScopeResolved}");
  });

  it("erro nas atribuições vira modo suspenso (nunca cai no fallback)", () => {
    expect(dash).toContain('loadResult?.mode === "suspended"');
    const hook = readFileSync(join(__dirname, "../../hooks/useLoadSuggestions.ts"), "utf8");
    expect(hook).toContain('return empty("suspended", { fallbackReason: "erro ao consultar prescrições" });');
    expect(hook).toContain('assignmentStatus({ start_date: a.start_date, end_date: a.end_date }) === "vigente"');
  });

  it("a MESMA prescrição das sugestões vai pra sessão iniciada", () => {
    expect(dash).toContain("onStartTraining?.(activePrescriptionId)");
    expect(page).toContain("initialPrescriptionId={sessionPrescriptionId}");
  });

  it("origem do incremento é visível (cadastrado vs inferido)", () => {
    expect(dash).toContain("cadastrado na biblioteca");
    const hook = readFileSync(join(__dirname, "../../hooks/useLoadSuggestions.ts"), "utf8");
    expect(hook).toContain("libMeta?.minIncrementKg ?? null");
    expect(hook).toContain('incrementFromLibrary !== null ? "cadastrado" : "inferido"');
  });

  it("plano: ordem do plano, should_track=false fora, repetido 1ª ocorrência, primeira execução explícita", () => {
    const hook = readFileSync(join(__dirname, "../../hooks/useLoadSuggestions.ts"), "utf8");
    expect(hook).toContain('.order("order_index", { ascending: true })');
    expect(hook).toContain("if (planRow.should_track === false) continue;");
    expect(hook).toContain("if (!libId || seen.has(libId)) continue;");
    expect(hook).toContain("Primeira execução — definir carga com a aluna");
  });
});

describe("R8c — 2ª rodada", () => {
  it("campo de incremento também no fluxo de CRIAÇÃO (Add) e como text/decimal", () => {
    const add = readFileSync(join(__dirname, "../AddExerciseDialog.tsx"), "utf8");
    expect(add).toContain("min_increment_kg");
    expect(add).toContain('inputMode="decimal"');
    const edit = readFileSync(join(__dirname, "../EditExerciseLibraryDialog.tsx"), "utf8");
    expect(edit).toMatch(/type="text"\s*inputMode="decimal"/);
  });

  it("embed correto da prescrição (workout_prescriptions, não 'prescriptions')", () => {
    const hook = readFileSync(join(__dirname, "../../hooks/useLoadSuggestions.ts"), "utf8");
    expect(hook).toContain("prescription:workout_prescriptions(name)");
    expect(hook).not.toMatch(/[^_]prescriptions\(name\)/);
  });
});

describe("R8c — 3ª rodada", () => {
  it("card vazio genérico só nos modos RESOLVIDOS (não duplica com seletor/suspenso)", () => {
    expect(dash).toContain(
      "{hasActionableRecommendation && sessionScopeResolved && loadSuggestions && loadSuggestions.length === 0 && (",
    );
  });
});

describe("R8c — fixes da revisão fria", () => {
  it("refetch com erro não mantém CTA (escopo exige !loadSuggestionsError)", () => {
    expect(dash).toMatch(/!loadSuggestionsError &&\s*\(loadResult\?\.mode === "prescription" \|\| loadResult\?\.mode === "fallback_recent"\)/);
    expect(dash).toContain("podem estar desatualizadas");
  });

  it("prescrição do fluxo de treino não vaza pra outra abertura do diálogo", () => {
    expect(page).toContain("setSessionPrescriptionId(null);");
  });

  it("mudança de prescrição invalida a carga assistida", () => {
    const inv = readFileSync(join(__dirname, "../../hooks/prescriptionQueryInvalidation.ts"), "utf8");
    expect(inv).toContain('"load-suggestions"');
  });

  it("import da biblioteca não apaga campos ausentes (defaultToNull false)", () => {
    const fn = readFileSync(
      join(__dirname, "../../../supabase/functions/import-exercises/index.ts"),
      "utf8",
    );
    expect((fn.match(/defaultToNull: false/g) ?? []).length).toBe(2);
  });

  it("incremento inválido bloqueia o submit (não vira null silencioso)", () => {
    for (const rel of ["../AddExerciseDialog.tsx", "../EditExerciseLibraryDialog.tsx"]) {
      const src = readFileSync(join(__dirname, rel), "utf8");
      expect(src, rel).toContain("Incremento mínimo inválido");
      expect(src, rel).toContain("parsedMinIncrement = Math.round(parsed * 100) / 100;");
    }
  });
});
