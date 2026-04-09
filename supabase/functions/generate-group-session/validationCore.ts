export interface GeneratedExerciseValidationShape {
  exerciseLibraryId: string;
  sets: string;
  subcategory?: string;
}

export interface ExerciseBlockValidationShape {
  name: string;
  method: string;
  exercises: GeneratedExerciseValidationShape[];
}

export interface SessionPhaseValidationShape {
  blocks: ExerciseBlockValidationShape[];
}

export interface GeneratedWorkoutValidationShape {
  slot: "A" | "B" | "C";
  valences: string[];
  phases: SessionPhaseValidationShape[];
  coveredPatterns: string[];
}

export interface ExerciseLibraryValidationShape {
  id: string;
  movement_pattern: string | null;
  lumbar_demand: number | null;
  knee_dominance: number | null;
  axial_load: number | null;
}

export interface CrossSessionStats {
  patternSets: Record<string, number>;
  hingeHeavyCount: number;
  lomHighPerSession: Record<string, number>;
  neuralProfile: Record<string, string>;
  jointStress: Record<string, number>;
  primeMoversPerSession: Record<string, Set<string>>;
}

export function checkCoreTriplanar(phases: SessionPhaseValidationShape[]): {
  anti_extensao: boolean;
  anti_flexao_lateral: boolean;
  anti_rotacao: boolean;
} {
  const coreExercises = phases
    .flatMap((phase) => phase.blocks)
    .filter((block) => block.name.startsWith("Core"))
    .flatMap((block) => block.exercises);

  const subcategories = new Set(
    coreExercises.map((exercise) => exercise.subcategory).filter(Boolean),
  );

  return {
    anti_extensao: subcategories.has("anti_extensao"),
    anti_flexao_lateral: subcategories.has("anti_flexao_lateral"),
    anti_rotacao: subcategories.has("anti_rotacao"),
  };
}

export function generateWorkoutName(slot: string, valences: string[]): string {
  const slotNames: Record<string, string> = {
    A: "Potência",
    B: "Força",
    C: "Fluxo",
  };
  const valenceNames: Record<string, string> = {
    potencia: "Explosivo",
    forca: "Força",
    hipertrofia: "Hipertrofia",
    condicionamento: "MetCon",
  };
  const base = slotNames[slot] || slot;
  const suffix = valences.map((valence) => valenceNames[valence] || valence).join(" + ");
  return `${base} ${suffix}`;
}

export function calcPatternsBalance(
  workouts: GeneratedWorkoutValidationShape[],
): Record<string, number> {
  const balance: Record<string, number> = {};

  for (const workout of workouts) {
    for (const pattern of workout.coveredPatterns) {
      balance[pattern] = (balance[pattern] || 0) + 1;
    }
  }

  return balance;
}

export function countEffectiveSets(
  workout: GeneratedWorkoutValidationShape,
): number {
  let total = 0;

  for (const phase of workout.phases) {
    for (const block of phase.blocks) {
      if (block.method === "respiracao" || block.method === "autoliberacao") continue;

      for (const exercise of block.exercises) {
        const parts = exercise.sets.split("-").map(Number);
        if (parts.some(isNaN)) continue;
        total += parts[parts.length - 1];
      }
    }
  }

  return total;
}

export function collectCrossSessionStats(
  workouts: GeneratedWorkoutValidationShape[],
  allExercises: ExerciseLibraryValidationShape[],
): CrossSessionStats {
  const exerciseMap = new Map<string, ExerciseLibraryValidationShape>();
  for (const exercise of allExercises) exerciseMap.set(exercise.id, exercise);

  const stats: CrossSessionStats = {
    patternSets: {},
    hingeHeavyCount: 0,
    lomHighPerSession: {},
    neuralProfile: {},
    jointStress: { joelho: 0, ombro: 0, lombar: 0 },
    primeMoversPerSession: {},
  };

  for (const workout of workouts) {
    const slot = workout.slot;
    stats.primeMoversPerSession[slot] = new Set<string>();
    let sessionLomHigh = 0;

    if (workout.valences.includes("potencia")) {
      stats.neuralProfile[slot] = "alto";
    } else if (workout.valences.includes("forca")) {
      stats.neuralProfile[slot] = "moderado";
    } else if (workout.valences.includes("condicionamento")) {
      stats.neuralProfile[slot] = "metcon";
    } else {
      stats.neuralProfile[slot] = "moderado";
    }

    for (const phase of workout.phases) {
      for (const block of phase.blocks) {
        if (block.method === "respiracao" || block.method === "autoliberacao") continue;

        for (const generatedExercise of block.exercises) {
          const libraryExercise = exerciseMap.get(generatedExercise.exerciseLibraryId);
          if (!libraryExercise) continue;

          const pattern = libraryExercise.movement_pattern || "unknown";
          const setParts = generatedExercise.sets.split("-").map(Number);
          const setCount = setParts.some(isNaN) ? 3 : setParts[setParts.length - 1];
          stats.patternSets[pattern] = (stats.patternSets[pattern] || 0) + setCount;

          stats.primeMoversPerSession[slot].add(pattern);

          if (
            pattern === "cadeia_posterior" &&
            (libraryExercise.lumbar_demand || 0) >= 4
          ) {
            stats.hingeHeavyCount++;
          }

          if ((libraryExercise.lumbar_demand || 0) >= 4) {
            sessionLomHigh++;
          }

          if ((libraryExercise.knee_dominance || 0) >= 4) {
            stats.jointStress.joelho += setCount;
          }

          if (
            ["empurrar", "puxar"].includes(pattern) &&
            (libraryExercise.axial_load || 0) >= 3
          ) {
            stats.jointStress.ombro += setCount;
          }

          if ((libraryExercise.lumbar_demand || 0) >= 3) {
            stats.jointStress.lombar += setCount;
          }
        }
      }
    }

    stats.lomHighPerSession[slot] = sessionLomHigh;
  }

  return stats;
}

export function validateDominanceBalance(
  stats: CrossSessionStats,
  warnings: string[],
): void {
  const push = stats.patternSets["empurrar"] || 0;
  const pull = stats.patternSets["puxar"] || 0;
  const knee =
    (stats.patternSets["dominancia_joelho"] || 0) +
    (stats.patternSets["lunge"] || 0);
  const hip = stats.patternSets["cadeia_posterior"] || 0;

  if (push < 6) warnings.push(`Volume semanal Push insuficiente: ${push} sets (mín. 6).`);
  if (pull < 6) warnings.push(`Volume semanal Pull insuficiente: ${pull} sets (mín. 6).`);
  if (knee < 6) warnings.push(`Volume semanal Knee insuficiente: ${knee} sets (mín. 6).`);
  if (hip < 4) warnings.push(`Volume semanal Hip insuficiente: ${hip} sets (mín. 4).`);

  if (push > 0) {
    const ratio = pull / push;
    if (ratio < 1.2) {
      warnings.push(
        `Pull/Push ratio: ${ratio.toFixed(
          2,
        )}x (recomendado 1.2-1.4x). Pull deve ser 20-40% superior ao Push.`,
      );
    } else if (ratio > 1.5) {
      warnings.push(`Pull/Push ratio elevado: ${ratio.toFixed(2)}x. Considere balancear.`);
    }
  }
}

export function validatePrimeMoverOverlap(
  stats: CrossSessionStats,
  warnings: string[],
): void {
  const slots = Object.keys(stats.primeMoversPerSession);
  if (slots.length < 3) return;

  const allPatterns = new Set<string>();
  for (const slot of slots) {
    for (const pattern of stats.primeMoversPerSession[slot]) {
      allPatterns.add(pattern);
    }
  }

  for (const pattern of allPatterns) {
    const sessionsWithPattern = slots.filter((slot) =>
      stats.primeMoversPerSession[slot].has(pattern),
    ).length;

    if (sessionsWithPattern === 3) {
      const totalSets = stats.patternSets[pattern] || 0;
      if (totalSets > 15) {
        warnings.push(
          `Padrão "${pattern}" presente em todos os 3 treinos com ${totalSets} sets totais. Risco de sobreposição de prime movers.`,
        );
      }
    }
  }
}

export function validateNeuralAndJointControl(
  stats: CrossSessionStats,
  warnings: string[],
): void {
  const altoCount = Object.values(stats.neuralProfile).filter(
    (profile) => profile === "alto",
  ).length;
  if (altoCount > 2) {
    warnings.push(
      `Controle neural: ${altoCount} sessões de alta demanda neural/semana (max recomendado: 2).`,
    );
  }

  if (stats.hingeHeavyCount > 2) {
    warnings.push(
      `Hinge pesado: ${stats.hingeHeavyCount}x/semana (max recomendado: 2). Risco lombar acumulado.`,
    );
  }

  const jointLimits = { joelho: 25, ombro: 20, lombar: 15 };
  for (const [joint, limit] of Object.entries(jointLimits)) {
    const stress = stats.jointStress[joint] || 0;
    if (stress > limit) {
      warnings.push(
        `Stress articular ${joint}: ${stress} sets com carga significativa/semana (limite: ${limit}).`,
      );
    }
  }

  const profiles = Object.values(stats.neuralProfile);
  const hasAlto = profiles.includes("alto");
  const hasModerado = profiles.includes("moderado");
  if (!hasAlto && !hasModerado) {
    warnings.push(
      "Composição semanal sem sessão de alta ou moderada intensidade neural.",
    );
  }

  if (profiles.every((profile) => profile === "alto")) {
    warnings.push(
      "Todas as sessões são de alta demanda neural. Risco de overreaching.",
    );
  }
}

