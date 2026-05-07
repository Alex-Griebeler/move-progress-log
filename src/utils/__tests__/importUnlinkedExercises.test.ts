import { describe, expect, it } from "vitest";
import { buildUniqueExerciseLibraryMatchMap } from "../exerciseLibraryMatching";
import { buildUnlinkedExerciseReportFromRows } from "../importUnlinkedExercises";

describe("buildUnlinkedExerciseReportFromRows", () => {
  it("counts imported exercise rows without exact unique catalog match", () => {
    const matchMap = buildUniqueExerciseLibraryMatchMap([
      { id: "swing-id", name: "Swing (kettlebell)" },
      { id: "supino-1", name: "Supino reto barra" },
      { id: "supino-2", name: "Supino reto (barra)" },
    ]);

    const report = buildUnlinkedExerciseReportFromRows(
      [
        { exercicio: "Swing (kettlebell)" },
        { exercicio: "Hip Thrust" },
        { exercicio: "hip-thrust" },
        { exercicio: "Supino reto barra" },
        { exercicio: "Ja vinculado", exercise_library_id: "manual-id" },
        { exercicio: "" },
      ],
      matchMap
    );

    expect(report.totalRows).toBe(3);
    expect(report.names).toEqual([
      { name: "Hip Thrust", count: 2 },
      { name: "Supino reto barra", count: 1 },
    ]);
  });

  it("limits the displayed names without changing the total row count", () => {
    const report = buildUnlinkedExerciseReportFromRows(
      [
        { exercicio: "B" },
        { exercicio: "A" },
        { exercicio: "C" },
      ],
      new Map(),
      2
    );

    expect(report.totalRows).toBe(3);
    expect(report.names).toEqual([
      { name: "A", count: 1 },
      { name: "B", count: 1 },
    ]);
  });
});
