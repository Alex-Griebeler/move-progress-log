import type { QueryClient } from "@tanstack/react-query";

const OURA_QUERY_ROOTS = [
  "oura-connection",
  "oura-connection-status",
  "oura-metrics",
  "oura-metrics-latest",
  "oura-workouts",
  "oura-acute-metrics-latest",
  "oura-trends",
  "oura-sync-logs",
  "students-card-data",
] as const;

export const invalidateOuraQueries = async (
  queryClient: QueryClient,
  studentId?: string
): Promise<void> => {
  const queryKeys = studentId
    ? OURA_QUERY_ROOTS.map((root) => [root, studentId] as const)
    : OURA_QUERY_ROOTS.map((root) => [root] as const);

  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey })
    )
  );
};
