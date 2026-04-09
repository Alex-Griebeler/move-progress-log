import { describe, expect, it } from "vitest";
import {
  calcPatternsBalance,
  checkCoreTriplanar,
  collectCrossSessionStats,
  countEffectiveSets,
  generateWorkoutName,
  validateDominanceBalance,
  validateNeuralAndJointControl,
  validatePrimeMoverOverlap,
  type ExerciseLibraryValidationShape,
  type GeneratedWorkoutValidationShape,
} from "../../../supabase/functions/generate-group-session/validationCore";

const buildWorkout = (
  slot: "A" | "B" | "C",
  valences: string[],
  coveredPatterns: string[],
  exercises: Array<{ exerciseLibraryId: string; sets: string; subcategory?: string }>,
): GeneratedWorkoutValidationShape => ({
  slot,
  valences,
  coveredPatterns,
  phases: [
    {
      blocks: [
        {
          name: "Core",
          method: "circuit",
          exercises: exercises.map((exercise) => ({
            exerciseLibraryId: exercise.exerciseLibraryId,
            sets: exercise.sets,
            subcategory: exercise.subcategory,
          })),
        },
        {
          name: "Respiração",
          method: "respiracao",
          exercises: [{ exerciseLibraryId: "ignored", sets: "3-6" }],
        },
      ],
    },
  ],
});

describe("generate-group-session validation core", () => {
  it("computes triplanar core coverage", () => {
    const result = checkCoreTriplanar([
      {
        blocks: [
          {
            name: "Core 1",
            method: "circuit",
            exercises: [
              { exerciseLibraryId: "1", sets: "3", subcategory: "anti_extensao" },
              { exerciseLibraryId: "2", sets: "3", subcategory: "anti_rotacao" },
            ],
          },
        ],
      },
    ]);

    expect(result).toEqual({
      anti_extensao: true,
      anti_flexao_lateral: false,
      anti_rotacao: true,
    });
  });

  it("generates pt-BR workout name and pattern balance", () => {
    expect(generateWorkoutName("A", ["forca", "condicionamento"])).toBe(
      "Potência Força + MetCon",
    );

    const balance = calcPatternsBalance([
      buildWorkout("A", ["forca"], ["empurrar", "puxar"], []),
      buildWorkout("B", ["forca"], ["empurrar"], []),
    ]);
    expect(balance.empurrar).toBe(2);
    expect(balance.puxar).toBe(1);
  });

  it("counts effective sets ignoring non-training methods", () => {
    const workout: GeneratedWorkoutValidationShape = {
      slot: "A",
      valences: ["forca"],
      coveredPatterns: [],
      phases: [
        {
          blocks: [
            {
              name: "Bloco 1",
              method: "superset",
              exercises: [
                { exerciseLibraryId: "x", sets: "3-5" },
                { exerciseLibraryId: "y", sets: "3" },
              ],
            },
            {
              name: "Resp",
              method: "respiracao",
              exercises: [{ exerciseLibraryId: "z", sets: "4-8" }],
            },
          ],
        },
      ],
    };

    expect(countEffectiveSets(workout)).toBe(8);
  });

  it("collects cross-session stats and emits warning families", () => {
    const workouts: GeneratedWorkoutValidationShape[] = [
      buildWorkout(
        "A",
        ["potencia"],
        ["empurrar", "cadeia_posterior"],
        [
          { exerciseLibraryId: "push-heavy", sets: "3-6", subcategory: "anti_extensao" },
          { exerciseLibraryId: "hinge-heavy", sets: "3-5" },
        ],
      ),
      buildWorkout(
        "B",
        ["potencia"],
        ["empurrar", "cadeia_posterior"],
        [
          { exerciseLibraryId: "push-heavy", sets: "3-6", subcategory: "anti_flexao_lateral" },
          { exerciseLibraryId: "hinge-heavy", sets: "3-5" },
        ],
      ),
      buildWorkout(
        "C",
        ["potencia"],
        ["empurrar", "cadeia_posterior"],
        [
          { exerciseLibraryId: "push-heavy", sets: "3-6", subcategory: "anti_rotacao" },
          { exerciseLibraryId: "hinge-heavy", sets: "3-5" },
        ],
      ),
    ];

    const library: ExerciseLibraryValidationShape[] = [
      {
        id: "push-heavy",
        movement_pattern: "empurrar",
        lumbar_demand: 2,
        knee_dominance: 1,
        axial_load: 3,
      },
      {
        id: "hinge-heavy",
        movement_pattern: "cadeia_posterior",
        lumbar_demand: 4,
        knee_dominance: 1,
        axial_load: 2,
      },
    ];

    const stats = collectCrossSessionStats(workouts, library);
    expect(stats.patternSets.empurrar).toBe(18);
    expect(stats.patternSets.cadeia_posterior).toBe(15);
    expect(stats.hingeHeavyCount).toBe(3);
    expect(stats.neuralProfile.A).toBe("alto");

    const warnings: string[] = [];
    validateDominanceBalance(stats, warnings);
    validatePrimeMoverOverlap(stats, warnings);
    validateNeuralAndJointControl(stats, warnings);

    expect(warnings.some((warning) => warning.includes("Pull insuficiente"))).toBe(
      true,
    );
    expect(warnings.some((warning) => warning.includes("sobreposição de prime movers"))).toBe(
      true,
    );
    expect(warnings.some((warning) => warning.includes("Controle neural"))).toBe(
      true,
    );
    expect(warnings.some((warning) => warning.includes("Hinge pesado"))).toBe(true);
  });
});

