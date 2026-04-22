import type { QueryClient } from "@tanstack/react-query";
import { logger } from "@/utils/logger";

const PRESCRIPTION_QUERY_ROOTS = [
  "assignments",
  "prescriptions",
  "prescription",
  "prescription-search",
  "prescriptions-list",
  "student-prescriptions",
  "students-active-prescriptions",
] as const;

type InvalidatePrescriptionQueriesOptions = {
  studentId?: string;
  prescriptionId?: string;
  refetchActive?: boolean;
};

export const invalidatePrescriptionQueries = async (
  queryClient: QueryClient,
  options?: InvalidatePrescriptionQueriesOptions
): Promise<void> => {
  const studentId = options?.studentId;
  const prescriptionId = options?.prescriptionId;
  const refetchActive = options?.refetchActive ?? true;

  const queryKeys: Array<readonly unknown[]> = PRESCRIPTION_QUERY_ROOTS.map((root) => [root]);

  if (studentId) {
    queryKeys.push(["student-prescriptions", studentId], ["students-active-prescriptions", studentId]);
  }

  if (prescriptionId) {
    queryKeys.push(["prescription", prescriptionId], ["assignments", prescriptionId]);
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
    logger.warn("[prescriptionQueryInvalidation] Some query invalidations failed", {
      failedCount: failed.length,
      totalCount: uniqueQueryKeys.length,
    });
  }
};

