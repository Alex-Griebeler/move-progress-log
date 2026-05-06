export interface ExerciseLastSessionTarget {
  exerciseLibraryId?: string | null;
  exerciseName: string;
}

export const normalizeExerciseSessionName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const buildExerciseLastSessionKey = (
  studentId: string,
  target: ExerciseLastSessionTarget
): string =>
  target.exerciseLibraryId
    ? `${studentId}_id:${target.exerciseLibraryId}`
    : `${studentId}_name:${normalizeExerciseSessionName(target.exerciseName)}`;
