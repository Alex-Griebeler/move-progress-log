import { describe, expect, it } from "vitest";
import {
  buildExerciseLastSessionKey,
  normalizeExerciseSessionName,
} from "../../utils/exerciseSessionKeys";

describe("exercise last session keys", () => {
  it("normalizes accents, punctuation, and spacing consistently", () => {
    expect(normalizeExerciseSessionName("  Agachamento Búlgaro (KB)  ")).toBe(
      "agachamento bulgaro kb"
    );
  });

  it("uses the canonical exercise id when available", () => {
    expect(
      buildExerciseLastSessionKey("student-1", {
        exerciseLibraryId: "exercise-1",
        exerciseName: "Agachamento Búlgaro",
      })
    ).toBe("student-1_id:exercise-1");
  });

  it("falls back to the normalized exercise name for legacy rows", () => {
    expect(
      buildExerciseLastSessionKey("student-1", {
        exerciseName: "Agachamento Búlgaro",
      })
    ).toBe("student-1_name:agachamento bulgaro");
  });
});
