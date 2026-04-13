import type { Json } from "@/integrations/supabase/types";

export interface CustomAdaptation {
  exercise_library_id: string;
  adaptation_type: string;
  sets?: string | null;
  reps?: string | null;
  interval_seconds?: number | null;
  pse?: string | null;
  observations?: string | null;
}

export const mapCustomAdaptations = (value: Json | null): CustomAdaptation[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const adaptations = value
    .filter(
      (item): item is Record<string, Json | undefined> =>
        typeof item === "object" && item !== null && !Array.isArray(item)
    )
    .map((item) => {
      const intervalCandidate =
        typeof item.interval_seconds === "number"
          ? item.interval_seconds
          : typeof item.interval_seconds === "string" && item.interval_seconds.trim() !== ""
            ? Number(item.interval_seconds)
            : null;

      return {
        exercise_library_id:
          typeof item.exercise_library_id === "string" ? item.exercise_library_id : "",
        adaptation_type:
          typeof item.adaptation_type === "string" ? item.adaptation_type : "",
        sets: typeof item.sets === "string" ? item.sets : null,
        reps: typeof item.reps === "string" ? item.reps : null,
        interval_seconds:
          intervalCandidate !== null && Number.isFinite(intervalCandidate)
            ? intervalCandidate
            : null,
        pse: typeof item.pse === "string" ? item.pse : null,
        observations: typeof item.observations === "string" ? item.observations : null,
      };
    })
    .filter((item) => item.exercise_library_id && item.adaptation_type);

  return adaptations;
};

export const sanitizeAssignmentCustomAdaptations = (
  value: CustomAdaptation[] | null | undefined
): CustomAdaptation[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const sanitized = value
    .map((item) => {
      const rawInterval = item.interval_seconds;
      const intervalCandidate =
        typeof rawInterval === "number"
          ? rawInterval
          : typeof rawInterval === "string" && (rawInterval as string).trim() !== ""
            ? Number(rawInterval)
            : null;

      return {
        exercise_library_id:
          typeof item.exercise_library_id === "string" ? item.exercise_library_id.trim() : "",
        adaptation_type:
          typeof item.adaptation_type === "string" ? item.adaptation_type.trim() : "",
        sets: typeof item.sets === "string" ? item.sets : null,
        reps: typeof item.reps === "string" ? item.reps : null,
        interval_seconds:
          intervalCandidate !== null && Number.isFinite(intervalCandidate)
            ? intervalCandidate
            : null,
        pse: typeof item.pse === "string" ? item.pse : null,
        observations: typeof item.observations === "string" ? item.observations : null,
      };
    })
    .filter((item) => item.exercise_library_id && item.adaptation_type);

  return sanitized.length > 0 ? sanitized : null;
};
