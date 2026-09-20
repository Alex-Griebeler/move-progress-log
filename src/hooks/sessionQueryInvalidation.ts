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
  // Sessão nova muda referência/observações da carga assistida (auditoria
  // 29/08 — sem isto a sugestão anterior ficava eterna na tela).
  "load-suggestions",
] as const;

type InvalidateSessionQueriesOptions = {
  includeStudentsData?: boolean;
  studentId?: string;
  /** Várias pessoas de uma vez (salvamento em grupo): mesmas chaves por aluna. */
  studentIds?: string[];
  refetchActive?: boolean;
};

export const invalidateSessionQueries = async (
  queryClient: QueryClient,
  options?: InvalidateSessionQueriesOptions
): Promise<void> => {
  const includeStudentsData = options?.includeStudentsData ?? false;
  const refetchActive = options?.refetchActive ?? true;
  const studentIds = Array.from(
    new Set([options?.studentId, ...(options?.studentIds ?? [])].filter((id): id is string => !!id)),
  );

  const queryKeys: Array<readonly unknown[]> = SESSION_QUERY_ROOTS.map((root) => [root]);

  if (includeStudentsData) {
    queryKeys.push(["students"], ["students-card-data"]);
  }

  for (const studentId of studentIds) {
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

