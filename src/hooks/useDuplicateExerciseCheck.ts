import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "./useDebounce";
import {
  type DuplicateCandidate,
  findDuplicateCandidates,
  normalizeExerciseName,
} from "./duplicateExerciseUtils";

const DUPLICATE_CHECK_PAGE_SIZE = 1000;
const DUPLICATE_CHECK_MAX_PAGES = 50;

export function useDuplicateExerciseCheck(name: string, excludeId?: string) {
  const debouncedName = useDebounce(name, 300);
  const normalizedName = normalizeExerciseName(debouncedName);

  return useQuery({
    queryKey: ["exercise-duplicate-check", normalizedName, excludeId],
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (normalizedName.length < 3) return [];

      const rows: DuplicateCandidate[] = [];

      for (let pageIndex = 0; pageIndex < DUPLICATE_CHECK_MAX_PAGES; pageIndex += 1) {
        const from = pageIndex * DUPLICATE_CHECK_PAGE_SIZE;
        const to = from + DUPLICATE_CHECK_PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("exercises_library")
          .select("id, name")
          .order("name", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        rows.push(
          ...data.filter(
            (row): row is DuplicateCandidate =>
              typeof row?.id === "string" && typeof row?.name === "string"
          )
        );

        if (data.length < DUPLICATE_CHECK_PAGE_SIZE) break;
      }

      return findDuplicateCandidates(rows, normalizedName, excludeId);
    },
    enabled: normalizedName.length >= 3,
  });
}
