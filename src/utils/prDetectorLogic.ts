/**
 * Pure functions that mirror the PR detection logic in supabase/functions/pr-detector/.
 * Kept here so they can be unit-tested with Vitest without a live Supabase connection.
 */

/** Map key for a record: "<exercise_name>:<record_type>" */
export function buildRecordKey(exerciseName: string, recordType: string): string {
  return `${exerciseName}:${recordType}`;
}

/**
 * Returns true when `current` is a new personal record given the existing `recordMap`.
 * A value of zero or below is never a PR.
 * A missing map entry means the athlete has no prior record → first occurrence is always a PR.
 */
export function isPR(current: number, recordMap: Map<string, number>, key: string): boolean {
  if (current <= 0) return false;
  const prev = recordMap.get(key);
  return prev === undefined || current > prev;
}

/** Compute the two check values for a single exercise rep */
export function exerciseChecks(loadKg: number, reps: number): [string, number][] {
  return [
    ['max_load', loadKg],
    ['max_volume', loadKg * reps],
  ];
}
