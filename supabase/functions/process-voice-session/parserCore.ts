const POUND_TO_KG_CONVERSION = 0.4536;
const DECIMAL_PLACES = 1;
const MISSING_REPS_PREFIX =
  "🔴 EXERCÍCIO MENCIONADO SEM REPETIÇÕES - PREENCHER MANUALMENTE";

type UnknownRecord = Record<string, unknown>;

const roundToDecimal = (
  value: number,
  decimals: number = DECIMAL_PLACES,
): number => {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
};

export const normalizeBreakdown = (breakdown: string): string => {
  const hasEachSide = /de cada lado/i.test(breakdown);
  if (!hasEachSide) return breakdown;

  const match = breakdown.match(
    /\((.*?)\)\s*de cada lado(.*?)(?:barra|\+\s*barra|$)/i,
  );
  if (!match) return breakdown;

  const insideParens = match[1];
  const afterEachSide = match[2].trim();
  const barraMatch = breakdown.match(/(barra\s+\d+(?:\.\d+)?\s*kg)/i);
  const barra = barraMatch ? barraMatch[1] : "";

  const looseWeights: string[] = [];
  const weightRegex = /(\d+(?:\.\d+)?)\s*(kg|lb)/gi;
  let weightMatch: RegExpExecArray | null;

  while ((weightMatch = weightRegex.exec(afterEachSide)) !== null) {
    looseWeights.push(`${weightMatch[1]} ${weightMatch[2]}`);
  }

  if (looseWeights.length === 0) return breakdown;

  const newInsideParens = [insideParens, ...looseWeights].join(" + ");
  return `(${newInsideParens}) de cada lado${barra ? " + " + barra : ""}`;
};

export const calculateLoadFromBreakdown = (
  breakdown: string | null,
): number | null => {
  if (!breakdown) return null;

  try {
    const bodyCorporalWithValue = breakdown.match(
      /Peso corporal\s*=\s*(\d+(?:\.\d+)?)\s*kg/i,
    );
    if (bodyCorporalWithValue) {
      return roundToDecimal(parseFloat(bodyCorporalWithValue[1]));
    }

    if (/Peso corporal/i.test(breakdown) && !/\d/.test(breakdown)) {
      return null;
    }

    const hasOnlyElastic =
      /^(elástico|banda|elastic)/i.test(breakdown.trim()) &&
      !/\d+\s*(kg|lb)/i.test(breakdown);
    if (hasOnlyElastic) return null;

    let total = 0;
    let processedEachSide = false;

    const eachSideMatch = breakdown.match(/\((.*?)\)\s*de cada lado/i);
    if (eachSideMatch) {
      const content = eachSideMatch[1];
      processedEachSide = true;

      const kgMatches = Array.from(content.matchAll(/(\d+(?:[.,]\d+)?)\s*kg/gi));
      for (const match of kgMatches) {
        total += parseFloat(match[1].replace(",", ".")) * 2;
      }

      const lbMatches = Array.from(content.matchAll(/(\d+(?:[.,]\d+)?)\s*lb/gi));
      for (const match of lbMatches) {
        total +=
          parseFloat(match[1].replace(",", ".")) * POUND_TO_KG_CONVERSION * 2;
      }
    }

    const multiKbMatch = breakdown.match(
      /(2\s*kettlebells?|duplo\s*kettlebell|kettlebell\s*duplo|dois\s*halteres|2\s*halteres).*?(\d+(?:[.,]\d+)?)\s*(kg|lb)/i,
    );
    if (multiKbMatch && !processedEachSide) {
      const value = parseFloat(multiKbMatch[2].replace(",", "."));
      const unit = multiKbMatch[3].toLowerCase();
      const kg = unit === "lb" ? value * POUND_TO_KG_CONVERSION : value;
      total += kg * 2;
    }

    const barraMatch = breakdown.match(/barra\s*(\d+(?:[.,]\d+)?)\s*kg/i);
    if (barraMatch) {
      total += parseFloat(barraMatch[1].replace(",", "."));
    }

    if (!processedEachSide && !multiKbMatch) {
      const kgMatches = Array.from(breakdown.matchAll(/(\d+(?:[.,]\d+)?)\s*kg/gi));
      for (const match of kgMatches) {
        const index = match.index || 0;
        const context = breakdown.substring(
          Math.max(0, index - 6),
          index + match[0].length,
        );
        if (!/barra/i.test(context)) {
          total += parseFloat(match[1].replace(",", "."));
        }
      }

      const lbMatches = Array.from(breakdown.matchAll(/(\d+(?:[.,]\d+)?)\s*lb/gi));
      for (const match of lbMatches) {
        total += parseFloat(match[1].replace(",", ".")) * POUND_TO_KG_CONVERSION;
      }
    }

    return total > 0 ? roundToDecimal(total) : null;
  } catch {
    return null;
  }
};

export const sanitizeExerciseData = (exercise: UnknownRecord): void => {
  const fieldsToSanitize = [
    "load_kg",
    "load_breakdown",
    "reps",
    "sets",
    "observations",
  ];
  for (const field of fieldsToSanitize) {
    if (
      exercise[field] === 0 ||
      exercise[field] === "" ||
      exercise[field] === "não informado"
    ) {
      exercise[field] = null;
    }
  }
};

export const validateAndRecalculateLoad = (
  exercise: UnknownRecord,
): void => {
  sanitizeExerciseData(exercise);

  if (!exercise.load_breakdown) {
    if (exercise.load_kg !== null) exercise.load_kg = null;
    return;
  }

  exercise.load_breakdown = normalizeBreakdown(exercise.load_breakdown as string);
  const calculatedLoadKg = calculateLoadFromBreakdown(
    exercise.load_breakdown as string,
  );

  if (exercise.load_kg === null || exercise.load_kg === undefined) {
    exercise.load_kg = calculatedLoadKg;
    return;
  }

  if (calculatedLoadKg !== null) {
    const diff = Math.abs((exercise.load_kg as number) - calculatedLoadKg);
    if (diff > 0.1) {
      exercise.load_kg = calculatedLoadKg;
    } else {
      exercise.load_kg = Math.round((exercise.load_kg as number) * 10) / 10;
    }
  }
};

export const applyLoadValidationToSessions = (
  sessions: UnknownRecord[] | undefined,
): void => {
  sessions?.forEach((session) => {
    (session.exercises as UnknownRecord[] | undefined)?.forEach((exercise) => {
      validateAndRecalculateLoad(exercise);
    });
  });
};

export const markExercisesMissingRepsForManualInput = (
  sessions: UnknownRecord[] | undefined,
): void => {
  sessions?.forEach((session) => {
    if (!session.exercises) return;
    session.exercises = (session.exercises as UnknownRecord[]).map((exercise) => {
      if (exercise.reps && exercise.reps !== 0) {
        return exercise;
      }

      const existingObservation =
        typeof exercise.observations === "string" ? exercise.observations : null;

      return {
        ...exercise,
        reps: null,
        sets: exercise.sets || null,
        load_kg: exercise.load_kg || null,
        observations: existingObservation
          ? `${MISSING_REPS_PREFIX}\n\n${existingObservation}`
          : MISSING_REPS_PREFIX,
        needs_manual_input: true,
      };
    });
  });
};

