/**
 * Máquina visual do hero — cobertura de TODOS os ramos (v5.1-3: 11+ casos via
 * it.each, incluindo compostos do skip da v7.2-M7). A precedência é LEI:
 * loading → erro total → sem snapshot → sem recomendação → erro parcial →
 * check-in pendente → zona 0 (com/sem protocolos) → multi-vigente → normal.
 */
import { whoopFingerprintSegment } from "../trainingHeroState";
import { describe, expect, it } from "vitest";
import {
  deriveTrainingHeroState,
  resolveCheckInState,
  type HeroStateInput,
} from "../trainingHeroState";

const base: HeroStateInput = {
  loading: false,
  totalError: false,
  hasSnapshot: true,
  hasRecommendation: true,
  partialError: false,
  checkIn: "pending",
  effectiveZone: 3,
  hasPriorityProtocols: false,
  multiVigentePending: false,
  psrOnlyMode: false,
};

describe("deriveTrainingHeroState — matriz E1 completa", () => {
  it.each([
    // [nome, overrides, composição, ação]
    ["loading total", { loading: true }, "loading", "none"],
    ["erro total", { totalError: true }, "error_total", "none"],
    ["sem snapshot", { hasSnapshot: false }, "empty", "none"],
    ["snapshot com score sem recomendação (2c: score PERMANECE visível)",
      { hasRecommendation: false }, "score_no_recommendation", "none"],
    ["erro parcial precede TUDO acionável (mesmo zona 0 com protocolos)",
      { partialError: true, effectiveZone: 0, hasPriorityProtocols: true },
      "partial_error", "none"],
    ["chegada: check-in pendente esconde conduta/CTA/cargas",
      {}, "arrival", "register_checkin"],
    ["chegada precede multi-vigente (uma pergunta por vez)",
      { multiVigentePending: true }, "arrival", "register_checkin"],
    ["zona 0 base com protocolos → bloco de recuperação completo",
      { checkIn: "done", effectiveZone: 0, hasPriorityProtocols: true },
      "recovery_block", "register_rest"],
    ["zona 0 efetiva SEM protocolos → descanso simples (linha 6)",
      { checkIn: "done", effectiveZone: 0 }, "rest_day", "register_rest"],
    ["zona 0 vence multi-vigente (registrar descanso SEM seletor)",
      { checkIn: "done", effectiveZone: 0, multiVigentePending: true },
      "rest_day", "register_rest"],
    ["multi-vigente sem escolha → seletor + iniciar desabilitado",
      { checkIn: "done", multiVigentePending: true },
      "selection_required", "start_disabled"],
    ["normal → iniciar", { checkIn: "done" }, "normal", "start"],
    // Compostos do SKIP (v7.2-M7): skipped compõe como done.
    ["skipped revela conduta objetiva (stale é meta, não composição)",
      { checkIn: "skipped" }, "normal", "start"],
    ["skipped + zona 0 crítica com protocolos → bloco completo",
      { checkIn: "skipped", effectiveZone: 0, hasPriorityProtocols: true },
      "recovery_block", "register_rest"],
    ["skipped + multi-vigente → seletor + desabilitado",
      { checkIn: "skipped", multiVigentePending: true },
      "selection_required", "start_disabled"],
    ["skipped→Fazer volta a pending (esconde tudo de novo)",
      { checkIn: "pending", multiVigentePending: true },
      "arrival", "register_checkin"],
    // Modo SEM dispositivo (v7.2-B2/M6):
    ["psr-only + pending → chegada normal (o check-in É o dado)",
      { psrOnlyMode: true, hasSnapshot: false, hasRecommendation: false },
      "arrival", "register_checkin"],
    ["psr-only + done → conduta das bandas (normal)",
      { psrOnlyMode: true, hasSnapshot: false, checkIn: "done" },
      "normal", "start"],
    ["psr-only + done + banda 0 → descanso SEM protocolos (nunca recovery_block)",
      { psrOnlyMode: true, hasSnapshot: false, checkIn: "done", effectiveZone: 0 },
      "rest_day", "register_rest"],
    ["psr-only + skipped → sessão livre (Iniciar com onStartTraining(null); sem conduta/cargas)",
      { psrOnlyMode: true, hasSnapshot: false, checkIn: "skipped" },
      "free_session", "start"],
  ] as Array<[string, Partial<HeroStateInput>, string, string]>)(
    "%s",
    (_name, overrides, composition, action) => {
      const state = deriveTrainingHeroState({ ...base, ...overrides });
      expect(state.composition).toBe(composition);
      expect(state.primaryAction).toBe(action);
    },
  );

  it("conduta e cargas NUNCA aparecem antes do check-in/skip (fluxo em dois tempos)", () => {
    const arrival = deriveTrainingHeroState(base);
    expect(arrival.showConduct).toBe(false);
    expect(arrival.showLoads).toBe(false);
    expect(arrival.showCheckInForm).toBe(true);
    const done = deriveTrainingHeroState({ ...base, checkIn: "done" });
    expect(done.showConduct).toBe(true);
    expect(done.showLoads).toBe(true);
    expect(done.showCheckInForm).toBe(false);
  });

  it("zona 0 mostra conduta mas nunca cargas (carga bloqueada)", () => {
    const rest = deriveTrainingHeroState({ ...base, checkIn: "done", effectiveZone: 0 });
    expect(rest.showConduct).toBe(true);
    expect(rest.showLoads).toBe(false);
  });

  it("sessão livre (psr-only skip) não mostra conduta nem cargas (v7.2-M6)", () => {
    const free = deriveTrainingHeroState({
      ...base, psrOnlyMode: true, hasSnapshot: false, hasRecommendation: false, checkIn: "skipped",
    });
    expect(free.showConduct).toBe(false);
    expect(free.showLoads).toBe(false);
  });
});

describe("resolveCheckInState — transições com destruição (v7.2-M7 / v6.1-M8)", () => {
  const stored = { state: "done" as const, conductFingerprint: "fpA", spDay: "2026-08-31" };

  it("done/skipped valem só com o MESMO fingerprint e o MESMO dia SP", () => {
    expect(resolveCheckInState(stored, "fpA", "2026-08-31")).toBe("done");
    expect(resolveCheckInState({ ...stored, state: "skipped" }, "fpA", "2026-08-31")).toBe("skipped");
  });

  it("Whoop fresh→stale muda o fingerprint → skip/done DESTRUÍDOS (pending)", () => {
    expect(resolveCheckInState(stored, "fpB", "2026-08-31")).toBe("pending");
    expect(resolveCheckInState({ ...stored, state: "skipped" }, "fpB", "2026-08-31")).toBe("pending");
  });

  it("virada de dia SP destrói done E skipped", () => {
    expect(resolveCheckInState(stored, "fpA", "2026-09-01")).toBe("pending");
    expect(resolveCheckInState({ ...stored, state: "skipped" }, "fpA", "2026-09-01")).toBe("pending");
  });

  it("sem registro lembrado ou sem fingerprint atual → pending (fail-closed)", () => {
    expect(resolveCheckInState(null, "fpA", "2026-08-31")).toBe("pending");
    expect(resolveCheckInState(stored, null, "2026-08-31")).toBe("pending");
  });

  it("A→B→A NÃO ressuscita: o resolver é puro — com fpA de novo ele voltaria a valer SÓ se o armazenamento não tiver sido destruído; a destruição do storage é contrato do chamador (PR-B2), testado lá", () => {
    // O resolver responde pela VALIDADE, não pelo ciclo de vida do storage.
    expect(resolveCheckInState(stored, "fpA", "2026-08-31")).toBe("done");
  });
});

describe("v9.2 — whoopFingerprintSegment (categórico) × resolveCheckInState", () => {
  const fp = (strain: "non_high" | "high" | "unavailable") => `s1|whoop|2026-09-03|59|yellow|reduce|-20|-||${whoopFingerprintSegment({ strain })}`;
  const stored = (conductFingerprint: string) => ({ studentId: "s1", state: "done" as const, conductFingerprint, spDay: "2026-09-03", registeredAtIso: "x", persistedConductType: null });

  it("fresh/non_high → stale/unavailable preserva o check-in (regressão: sumia após 3h)", () => {
    expect(whoopFingerprintSegment({ strain: "non_high" })).toBe(whoopFingerprintSegment({ strain: "unavailable" }));
    expect(resolveCheckInState(stored(fp("non_high")), fp("unavailable"), "2026-09-03")).toBe("done");
  });
  it("high permanece high com sync stale (mesmo segmento); 14→18 dentro de high não invalida (fingerprint sem valor)", () => {
    expect(whoopFingerprintSegment({ strain: "high" })).toBe("strain-high");
    expect(resolveCheckInState(stored(fp("high")), fp("high"), "2026-09-03")).toBe("done");
  });
  it("non_high|unavailable → high invalida (pending); high → unavailable invalida (veto sumiu)", () => {
    expect(resolveCheckInState(stored(fp("non_high")), fp("high"), "2026-09-03")).toBe("pending");
    expect(resolveCheckInState(stored(fp("unavailable")), fp("high"), "2026-09-03")).toBe("pending");
    expect(resolveCheckInState(stored(fp("high")), fp("unavailable"), "2026-09-03")).toBe("pending");
  });
  it("sem contexto Whoop (Oura) o segmento é '-' (expressão canônica da spec) e não contém freshness", () => {
    expect(whoopFingerprintSegment(null)).toBe("-");
    for (const st of ["non_high", "high", "unavailable"] as const) {
      expect(whoopFingerprintSegment({ strain: st })).not.toMatch(/fresh|stale/);
    }
  });
});
