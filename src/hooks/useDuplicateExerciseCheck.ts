import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "./useDebounce";
import {
  type DuplicateCandidate,
  findDuplicateCandidates,
  normalizeExerciseName,
} from "./duplicateExerciseUtils";

export function useDuplicateExerciseCheck(name: string, excludeId?: string) {
  const debouncedName = useDebounce(name, 300);
  const normalizedName = normalizeExerciseName(debouncedName);

  return useQuery({
    queryKey: ["exercise-duplicate-check", normalizedName, excludeId],
    queryFn: async () => {
      if (normalizedName.length < 3) return [];

      const { data, error } = await supabase
        .from("exercises_library")
        .select("id, name")
        .order("name", { ascending: true })
        .limit(2000);

      if (error) throw error;

      const rows = (data || []).filter(
        (row): row is DuplicateCandidate =>
          typeof row?.id === "string" && typeof row?.name === "string"
      );

      return findDuplicateCandidates(rows, normalizedName, excludeId);
    },
    enabled: normalizedName.length >= 3,
  });
}
