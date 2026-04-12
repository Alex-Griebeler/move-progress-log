const normalize = (str: string): string =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

export interface DuplicateCandidate {
  id: string;
  name: string;
}

export const findDuplicateCandidates = (
  rows: DuplicateCandidate[],
  normalizedName: string,
  excludeId?: string
): DuplicateCandidate[] => {
  if (normalizedName.length < 3) return [];

  return rows
    .filter((row) => !excludeId || row.id !== excludeId)
    .filter((row) => normalize(row.name).includes(normalizedName))
    .slice(0, 5);
};

export const normalizeExerciseName = (value: string): string => normalize(value);
