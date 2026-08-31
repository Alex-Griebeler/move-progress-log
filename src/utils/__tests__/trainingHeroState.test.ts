/**
 * Máquina visual do hero — cobertura de TODOS os ramos (v5.1-3: 11+ casos via
 * it.each, incluindo compostos do skip da v7.2-M7). A precedência é LEI:
 * loading → erro total → sem snapshot → sem recomendação → erro parcial →
 * check-in pendente → zona 0 (com/sem protocolos) → multi-vigente → normal.
 */
import { describe, expect, it } from "vitest";
import {
  deriveTrainingHeroState,
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
});
