import { describe, expect, it } from "vitest";
import { decideLoadSuggestion } from "../loadSuggestionUtils";

const base = {
  referenceLoadKg: 40,
  incrementKg: 2.5,
  loadDecision: "maintain" as const,
  authorizedPercent: 0 as number | null,
  hasPainOrJointWarning: false,
  hasTechniqueWarning: false,
  criticalFlags: false,
};

describe("decideLoadSuggestion — invariantes clínicos da revisão fria R4", () => {
  it("BLOCK tem precedência absoluta: dor recente NÃO produz número em dia bloqueado", () => {
    const d = decideLoadSuggestion({
      ...base,
      loadDecision: "block",
      authorizedPercent: null,
      hasPainOrJointWarning: true,
    });
    expect(d.suggestedLoadKg).toBeNull();
    expect(d.adjustmentPercent).toBeNull();
    expect(d.guardrails).toContain("pain_recent"); // a dor continua visível
    expect(d.ruleApplied).toMatch(/bloqueada/i);
  });

  it("redução NUNCA arredonda pra cima: 4 kg −20% com incremento 5 → manual, não 5 kg", () => {
    const d = decideLoadSuggestion({
      ...base,
      referenceLoadKg: 4,
      incrementKg: 5,
      loadDecision: "reduce",
      authorizedPercent: -20,
    });
    expect(d.suggestedLoadKg).toBeNull(); // o arredondamento antigo dava 5 kg (+25%)
    expect(d.ruleApplied).toMatch(/ajustar manualmente/);
  });

  it("redução representável usa o chão do incremento", () => {
    // 40 −20% = 32 → chão de 2.5 = 32.5? não: floor(32/2.5)=12 → 30? 32/2.5=12.8 → 12×2.5=30
    const d = decideLoadSuggestion({ ...base, loadDecision: "reduce", authorizedPercent: -20 });
    expect(d.suggestedLoadKg).toBe(30);
    expect(d.suggestedLoadKg!).toBeLessThan(40 * 0.81); // nunca acima do alvo
    // rótulo honesto: o percentual exibido é o EFETIVO (−25), não o autorizado
    expect(d.adjustmentPercent).toBe(-25);
  });

  it("progressão NUNCA excede o autorizado: 8 kg +5% com incremento 5 → EXATAMENTE 8", () => {
    // O caso que a revisão fria pegou 2×: o 'manter' arredondado ao
    // incremento dava 10 kg (+25% real). Manter = a referência EXATA.
    const d = decideLoadSuggestion({
      ...base,
      referenceLoadKg: 8,
      incrementKg: 5,
      loadDecision: "increase",
      authorizedPercent: 5,
    });
    expect(d.suggestedLoadKg).toBe(8);
    expect(d.adjustmentPercent).toBe(0);
    expect(d.ruleApplied).toMatch(/não representável/);
  });

  it("nenhum caminho sem progressão arredonda a referência pra cima", () => {
    const casos = [
      decideLoadSuggestion({ ...base, referenceLoadKg: 8, incrementKg: 5 }), // maintain
      decideLoadSuggestion({ ...base, referenceLoadKg: 8, incrementKg: 5, loadDecision: "increase", authorizedPercent: 5, hasTechniqueWarning: true }),
      decideLoadSuggestion({ ...base, referenceLoadKg: 8, incrementKg: 5, loadDecision: "increase", authorizedPercent: 5, criticalFlags: true }),
    ];
    for (const d of casos) expect(d.suggestedLoadKg).toBe(8);
  });

  it("progressão representável sobe pelo chão sem passar do teto", () => {
    // 40 +5% = 42 → chão 2.5 = 41.5? floor(42/2.5)=16 → 40? 42/2.5=16.8→16×2.5=40 → não sobe → manter
    const d = decideLoadSuggestion({ ...base, loadDecision: "increase", authorizedPercent: 5 });
    expect(d.suggestedLoadKg).toBe(40);
    // com incremento fino, sobe de verdade:
    const fino = decideLoadSuggestion({
      ...base, incrementKg: 0.5, loadDecision: "increase", authorizedPercent: 5,
    });
    expect(fino.suggestedLoadKg).toBe(42);
    expect(fino.suggestedLoadKg!).toBeLessThanOrEqual(40 * 1.05);
    expect(fino.adjustmentPercent).toBe(5); // efetivo = autorizado quando exato
  });

  it("dor fora de bloqueio reduz com chão; técnica inconsistente trava progressão", () => {
    const dor = decideLoadSuggestion({ ...base, hasPainOrJointWarning: true });
    expect(dor.suggestedLoadKg).toBe(30);
    expect(dor.adjustmentPercent).toBe(-25); // efetivo do chão, não o −20 nominal
    expect(dor.guardrails).toContain("pain_recent");
    const tec = decideLoadSuggestion({
      ...base, loadDecision: "increase", authorizedPercent: 5, hasTechniqueWarning: true,
    });
    expect(tec.suggestedLoadKg).toBe(40); // exata
    expect(tec.adjustmentPercent).toBe(0);
  });

  it("maintain devolve a carga da referência", () => {
    const d = decideLoadSuggestion(base);
    expect(d.suggestedLoadKg).toBe(40);
    expect(d.adjustmentPercent).toBe(0);
  });
});
