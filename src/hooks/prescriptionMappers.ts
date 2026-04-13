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

export interface AssignmentScheduleAdaptations {
  weekdays?: string[];
  time?: string;
}

export type AssignmentCustomAdaptations =
  | CustomAdaptation[]
  | AssignmentScheduleAdaptations;

const WEEKDAY_SET = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

const isPlainObject = (value: unknown): value is Record<string, Json | undefined> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const mapCustomAdaptations = (value: Json | null): CustomAdaptation[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const adaptations = value
    .filter((item): item is Record<string, Json | undefined> => isPlainObject(item))
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

export const sanitizeAssignmentScheduleAdaptations = (
  value: AssignmentScheduleAdaptations | null | undefined
): AssignmentScheduleAdaptations | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const weekdays = Array.isArray(value.weekdays)
    ? value.weekdays
        .filter((day): day is string => typeof day === "string")
        .map((day) => day.trim().toLowerCase())
        .filter((day) => WEEKDAY_SET.has(day))
    : [];

  const rawTime =
    typeof value.time === "string" && value.time.trim() !== ""
      ? value.time.trim()
      : "";

  const normalizedTime =
    rawTime.length >= 5 && /^\d{2}:\d{2}/.test(rawTime)
      ? rawTime.slice(0, 5)
      : "";

  const sanitized: AssignmentScheduleAdaptations = {};

  if (weekdays.length > 0) {
    sanitized.weekdays = weekdays;
  }

  if (normalizedTime) {
    sanitized.time = normalizedTime;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
};

export const mapAssignmentCustomAdaptations = (
  value: Json | null
): AssignmentCustomAdaptations | null => {
  if (Array.isArray(value)) {
    return mapCustomAdaptations(value);
  }

  if (!isPlainObject(value)) {
    return null;
  }

  return sanitizeAssignmentScheduleAdaptations({
    weekdays: Array.isArray(value.weekdays)
      ? value.weekdays.filter((day): day is string => typeof day === "string")
      : undefined,
    time: typeof value.time === "string" ? value.time : undefined,
  });
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
