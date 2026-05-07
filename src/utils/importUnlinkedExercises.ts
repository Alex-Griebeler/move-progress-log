import {
  normalizeExerciseLibraryMatchName,
  resolveExerciseLibraryIdByName,
  type ExerciseLibraryMatchMap,
} from "./exerciseLibraryMatching";

export interface ImportedExerciseName {
  exercicio: string;
  exercise_library_id?: string | null;
}

export interface UnlinkedExerciseReport {
  totalRows: number;
  names: Array<{ name: string; count: number }>;
}

export const buildUnlinkedExerciseReportFromRows = (
  rows: ImportedExerciseName[],
  matchMap: ExerciseLibraryMatchMap,
  limit = 20
): UnlinkedExerciseReport => {
  const counts = new Map<string, { name: string; count: number }>();

  for (const row of rows) {
    const directLibraryId = row.exercise_library_id?.trim();
    const resolvedLibraryId = directLibraryId || resolveExerciseLibraryIdByName(row.exercicio, matchMap);
    if (resolvedLibraryId) continue;

    const normalizedName = normalizeExerciseLibraryMatchName(row.exercicio);
    if (!normalizedName) continue;

    const current = counts.get(normalizedName) ?? { name: row.exercicio, count: 0 };
    current.count += 1;
    counts.set(normalizedName, current);
  }

  const sortedNames = Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR")
  );

  return {
    totalRows: sortedNames.reduce((sum, item) => sum + item.count, 0),
    names: sortedNames.slice(0, limit),
  };
};
