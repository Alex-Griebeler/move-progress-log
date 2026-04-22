import type { QueryClient } from "@tanstack/react-query";
import { logger } from "@/utils/logger";

const SESSION_QUERY_ROOTS = [
  "stats",
  "workouts",
  "workouts-paginated",
  "workout-sessions",
  "sessions-with-exercises",
  "all-sessions",
  "all-sessions-paginated",
  "session-exercises",
  "session-detail",
] as const;

type InvalidateSessionQueriesOptions = {
  includeStudentsData?: boolean;
  studentId?: string;
  refetchActive?: boolean;
};

export const invalidateSessionQueries = async (
  queryClient: QueryClient,
  options?: InvalidateSessionQueriesOptions
): Promise<void> => {
  const includeStudentsData = options?.includeStudentsData ?? false;
  const studentId = options?.studentId;
  const refetchActive = options?.refetchActive ?? true;

  const queryKeys: Array<readonly unknown[]> = SESSION_QUERY_ROOTS.map((root) => [root]);

  if (includeStudentsData) {
    queryKeys.push(["students"], ["students-card-data"]);
  }

  if (studentId) {
    queryKeys.push(
      ["student", studentId],
      ["student-prescriptions", studentId],
      ["sessions-with-exercises", studentId],
      ["workout-sessions", studentId]
    );
  }

  const uniqueQueryKeys = Array.from(
    new Map(queryKeys.map((key) => [JSON.stringify(key), key])).values()
  );

  const results = await Promise.allSettled(
    uniqueQueryKeys.map(async (queryKey) => {
      await queryClient.invalidateQueries({ queryKey });
      if (refetchActive) {
        await queryClient.refetchQueries({ queryKey, type: "active" });
      }
    })
  );

  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    logger.warn("[sessionQueryInvalidation] Some query invalidations failed", {
      failedCount: failed.length,
      totalCount: uniqueQueryKeys.length,
    });
  }
};

