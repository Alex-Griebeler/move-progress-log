import { describe, expect, it } from "vitest";
import {
  applyLoadValidationToSessions,
  calculateLoadFromBreakdown,
  markExercisesMissingRepsForManualInput,
  normalizeBreakdown,
  sanitizeExerciseData,
  validateAndRecalculateLoad,
} from "../../../supabase/functions/process-voice-session/parserCore";

describe("voice parser core", () => {
  it("normalizes each-side breakdown by moving loose weights into parentheses", () => {
    const normalized = normalizeBreakdown(
      "(25 lb) de cada lado + 5 kg + barra 20 kg",
    );
    expect(normalized).toBe("(25 lb + 5 kg) de cada lado + barra 20 kg");
  });

  it("calculates load for body weight and mixed bilateral setups", () => {
    expect(calculateLoadFromBreakdown("Peso corporal = 80.0 kg")).toBe(80);
    expect(calculateLoadFromBreakdown("Peso corporal")).toBeNull();
    expect(calculateLoadFromBreakdown("(25 lb) de cada lado + barra 10 kg")).toBe(
      32.7,
    );
    expect(
      calculateLoadFromBreakdown("(15 lb + 2 kg) de cada lado + barra 10 kg"),
    ).toBe(27.6);
  });

  it("calculates load for simple and double implement setups", () => {
    expect(calculateLoadFromBreakdown("2 kettlebells de 24 kg")).toBe(48);
    expect(calculateLoadFromBreakdown("40 kg")).toBe(40);
    expect(calculateLoadFromBreakdown("banda roxa")).toBeNull();
  });

  it("sanitizes zero/empty/not-informed fields to null", () => {
    const exercise: Record<string, unknown> = {
      load_kg: 0,
      load_breakdown: "",
      reps: 0,
      sets: "não informado",
      observations: "",
    };
    sanitizeExerciseData(exercise);
    expect(exercise).toMatchObject({
      load_kg: null,
      load_breakdown: null,
      reps: null,
      sets: null,
      observations: null,
    });
  });

  it("recalculates inconsistent loads and rounds consistent ones", () => {
    const inconsistentExercise: Record<string, unknown> = {
      load_breakdown: "(25 lb) de cada lado + barra 10 kg",
      load_kg: 10,
    };
    validateAndRecalculateLoad(inconsistentExercise);
    expect(inconsistentExercise.load_kg).toBe(32.7);

    const consistentExercise: Record<string, unknown> = {
      load_breakdown: "40 kg",
      load_kg: 40.04,
    };
    validateAndRecalculateLoad(consistentExercise);
    expect(consistentExercise.load_kg).toBe(40);
  });

  it("marks missing reps for manual input without altering valid reps", () => {
    const sessions: Record<string, unknown>[] = [
      {
        student_name: "Aluno A",
        exercises: [
          { executed_exercise_name: "Agachamento", reps: 0, observations: "boa técnica" },
          { executed_exercise_name: "Supino", reps: 8, observations: "estável" },
        ],
      },
    ];

    markExercisesMissingRepsForManualInput(sessions);
    const exercises = sessions[0].exercises as Array<Record<string, unknown>>;

    expect(exercises[0].reps).toBeNull();
    expect(exercises[0].needs_manual_input).toBe(true);
    expect(exercises[0].observations).toBe(
      "🔴 EXERCÍCIO MENCIONADO SEM REPETIÇÕES - PREENCHER MANUALMENTE\n\nboa técnica",
    );
    expect(exercises[1].reps).toBe(8);
    expect(exercises[1].needs_manual_input).toBeUndefined();
  });

  it("applies load validation over all exercises in all sessions", () => {
    const sessions: Record<string, unknown>[] = [
      {
        exercises: [
          {
            executed_exercise_name: "Supino",
            load_breakdown: "(25 lb) de cada lado + barra 10 kg",
            load_kg: null,
          },
          {
            executed_exercise_name: "Remada",
            load_breakdown: "não informado",
            load_kg: 20,
          },
        ],
      },
    ];

    applyLoadValidationToSessions(sessions);
    const exercises = sessions[0].exercises as Array<Record<string, unknown>>;
    expect(exercises[0].load_breakdown).toBe("(25 lb) de cada lado + barra 10 kg");
    expect(exercises[0].load_kg).toBe(32.7);
    expect(exercises[1].load_breakdown).toBeNull();
    expect(exercises[1].load_kg).toBeNull();
  });
});

