import { describe, expect, it } from "vitest";
import {
  mapCustomAdaptations,
  sanitizeAssignmentCustomAdaptations,
} from "../prescriptionMappers";

describe("prescriptionMappers", () => {
  it("maps custom adaptations from JSON payload and filters invalid items", () => {
    const mapped = mapCustomAdaptations([
      {
        exercise_library_id: "ex-1",
        adaptation_type: "regression_1",
        sets: "3",
        reps: "10",
        interval_seconds: "90",
        pse: "7",
      },
      {
        exercise_library_id: "",
        adaptation_type: "regression_2",
      },
      null,
    ]);

    expect(mapped).toEqual([
      {
        exercise_library_id: "ex-1",
        adaptation_type: "regression_1",
        sets: "3",
        reps: "10",
        interval_seconds: 90,
        pse: "7",
        observations: null,
      },
    ]);
  });

  it("returns null when sanitize receives empty or invalid payload", () => {
    expect(sanitizeAssignmentCustomAdaptations(null)).toBeNull();
    expect(
      sanitizeAssignmentCustomAdaptations([
        {
          exercise_library_id: "",
          adaptation_type: "",
        },
      ])
    ).toBeNull();
  });

  it("sanitizes assignment adaptations with trim and numeric interval", () => {
    const sanitized = sanitizeAssignmentCustomAdaptations([
      {
        exercise_library_id: "  ex-2  ",
        adaptation_type: " regression_2 ",
        sets: "4",
        reps: "8",
        interval_seconds: 120,
        observations: "ok",
      },
      {
        exercise_library_id: "ex-3",
        adaptation_type: "regression_3",
        interval_seconds: Number("bad") as unknown as number,
      },
    ]);

    expect(sanitized).toEqual([
      {
        exercise_library_id: "ex-2",
        adaptation_type: "regression_2",
        sets: "4",
        reps: "8",
        interval_seconds: 120,
        pse: null,
        observations: "ok",
      },
      {
        exercise_library_id: "ex-3",
        adaptation_type: "regression_3",
        sets: null,
        reps: null,
        interval_seconds: null,
        pse: null,
        observations: null,
      },
    ]);
  });
});
