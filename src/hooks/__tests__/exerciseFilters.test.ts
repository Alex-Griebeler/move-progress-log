import { describe, expect, it } from "vitest";
import {
  buildExercisesLibraryQueryKey,
  sanitizeExerciseFilters,
} from "../exerciseFilters";

describe("exerciseFilters", () => {
  it("sanitizes empty and all/todos values", () => {
    const sanitized = sanitizeExerciseFilters({
      category: "  ",
      subcategory: "all",
      level: "Todos",
      movement_pattern: "push",
    });

    expect(sanitized).toEqual({
      movement_pattern: "push",
      laterality: undefined,
      movement_plane: undefined,
      contraction_type: undefined,
      level: undefined,
      category: undefined,
      subcategory: undefined,
      risk_level: undefined,
      stability_position: undefined,
    });
  });

  it("builds deterministic query key regardless of object property order", () => {
    const keyA = buildExercisesLibraryQueryKey({
      level: "intermediario",
      category: "forca",
      movement_pattern: "push",
    });

    const keyB = buildExercisesLibraryQueryKey({
      movement_pattern: "push",
      category: "forca",
      level: "intermediario",
    });

    expect(keyA).toBe(keyB);
    expect(keyA).toContain("category:forca");
    expect(keyA).toContain("level:intermediario");
    expect(keyA).toContain("movement_pattern:push");
  });
});
