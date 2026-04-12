export interface ExerciseFilters {
  movement_pattern?: string;
  laterality?: string;
  movement_plane?: string;
  contraction_type?: string;
  level?: string;
  category?: string;
  subcategory?: string;
  risk_level?: string;
  stability_position?: string;
}

const normalizeFilterValue = (value: string | undefined): string | undefined => {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase();
  if (normalized === "all" || normalized === "todos") return undefined;

  return trimmed;
};

export const sanitizeExerciseFilters = (filters?: ExerciseFilters): ExerciseFilters => {
  if (!filters) return {};

  return {
    movement_pattern: normalizeFilterValue(filters.movement_pattern),
    laterality: normalizeFilterValue(filters.laterality),
    movement_plane: normalizeFilterValue(filters.movement_plane),
    contraction_type: normalizeFilterValue(filters.contraction_type),
    level: normalizeFilterValue(filters.level),
    category: normalizeFilterValue(filters.category),
    subcategory: normalizeFilterValue(filters.subcategory),
    risk_level: normalizeFilterValue(filters.risk_level),
    stability_position: normalizeFilterValue(filters.stability_position),
  };
};

export const buildExercisesLibraryQueryKey = (filters?: ExerciseFilters): string => {
  const sanitized = sanitizeExerciseFilters(filters);

  return Object.entries(sanitized)
    .filter(([, value]) => !!value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
};
