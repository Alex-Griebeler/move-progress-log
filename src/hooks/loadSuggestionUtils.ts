export const normalizeComparableText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

export const isEligibleStrengthCategory = (
  category: string | null | undefined
): boolean => {
  if (!category) return false;
  const normalized = normalizeComparableText(category);
  return normalized.includes("forca") || normalized.includes("hipertrofia");
};


/**
 * Decisão de sugestão de carga (extraída na R4 pra ser testável) — PURA.
 *
 * Invariantes clínicos (revisão fria R4):
 *  1. `block` tem precedência ABSOLUTA: nunca produz número (a regra de dor
 *     vinha antes e devolvia carga numérica em dia de bloqueio).
 *  2. Redução nunca arredonda pra CIMA: 4 kg −20% = 3,2 kg num aparelho de
 *     incremento 5 arredondava pra 5 kg (+25% real). Chão do incremento;
 *     chão que zera ou não reduz → sugestão null, ajuste manual.
 *  3. Progressão nunca excede o percentual autorizado: chão do incremento;
 *     se o chão não passa da referência, mantém (nunca pula degrau).
 */
export interface LoadSuggestionDecisionInput {
  referenceLoadKg: number;
  incrementKg: number;
  loadDecision: "increase" | "maintain" | "reduce" | "block";
  authorizedPercent: number | null;
  hasPainOrJointWarning: boolean;
  hasTechniqueWarning: boolean;
  criticalFlags: boolean;
}

export interface LoadSuggestionDecision {
  suggestedLoadKg: number | null;
  adjustmentPercent: number | null;
  ruleApplied: string;
  guardrails: string[];
}

const floorToIncrement = (value: number, increment: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(increment) || increment <= 0) return value;
  return Math.floor(value / increment + 1e-9) * increment;
};

const roundToIncrementPure = (value: number, increment: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(increment) || increment <= 0) return value;
  return Math.round(value / increment) * increment;
};

export const decideLoadSuggestion = (
  input: LoadSuggestionDecisionInput,
): LoadSuggestionDecision => {
  const {
    referenceLoadKg,
    incrementKg,
    loadDecision,
    authorizedPercent,
    hasPainOrJointWarning,
    hasTechniqueWarning,
    criticalFlags,
  } = input;
  const guardrails: string[] = [];

  const safeReduction = (percent: number): number | null => {
    const target = referenceLoadKg * (1 + percent / 100);
    const floored = floorToIncrement(target, incrementKg);
    if (floored <= 0 || floored >= referenceLoadKg) return null;
    return floored;
  };

  if (loadDecision === "block") {
    if (hasPainOrJointWarning) guardrails.push("pain_recent");
    return {
      suggestedLoadKg: null,
      adjustmentPercent: null,
      ruleApplied: hasPainOrJointWarning
        ? "Carga bloqueada (recuperação/descanso) + dor recente registrada"
        : "Carga bloqueada (recuperação/descanso)",
      guardrails,
    };
  }

  if (hasPainOrJointWarning) {
    guardrails.push("pain_recent");
    const reduced = safeReduction(-20);
    return {
      suggestedLoadKg: reduced,
      adjustmentPercent: reduced !== null ? -20 : null,
      ruleApplied:
        reduced !== null
          ? "Dor/Desconforto recente: redução de segurança (-20%)"
          : `Dor recente: redução não representável no incremento de ${incrementKg} kg — ajustar manualmente`,
      guardrails,
    };
  }

  if (loadDecision === "increase" && hasTechniqueWarning) {
    guardrails.push("technique_inconsistent");
    return {
      suggestedLoadKg: roundToIncrementPure(referenceLoadKg, incrementKg),
      adjustmentPercent: 0,
      ruleApplied: "Técnica inconsistente recente: progressão bloqueada",
      guardrails,
    };
  }

  if (loadDecision === "increase" && !criticalFlags) {
    const authorized = authorizedPercent ?? 5;
    const target = referenceLoadKg * (1 + authorized / 100);
    const floored = floorToIncrement(target, incrementKg);
    if (floored > referenceLoadKg) {
      return {
        suggestedLoadKg: floored,
        adjustmentPercent: authorized,
        ruleApplied: `Progressão +${authorized}%`,
        guardrails,
      };
    }
    return {
      suggestedLoadKg: roundToIncrementPure(referenceLoadKg, incrementKg),
      adjustmentPercent: 0,
      ruleApplied: `Progressão +${authorized}% não representável no incremento de ${incrementKg} kg — manter carga`,
      guardrails,
    };
  }

  if (loadDecision === "reduce") {
    const authorized = authorizedPercent ?? -20;
    const reduced = safeReduction(authorized);
    return {
      suggestedLoadKg: reduced,
      adjustmentPercent: reduced !== null ? authorized : null,
      ruleApplied:
        reduced !== null
          ? `Redução ${authorized}%`
          : `Redução não representável no incremento de ${incrementKg} kg — ajustar manualmente`,
      guardrails,
    };
  }

  return {
    suggestedLoadKg: roundToIncrementPure(referenceLoadKg, incrementKg),
    adjustmentPercent: 0,
    ruleApplied: "Manter carga planejada",
    guardrails,
  };
};
