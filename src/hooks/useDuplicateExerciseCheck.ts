import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "./useDebounce";

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function useDuplicateExerciseCheck(name: string, excludeId?: string) {
  const debouncedName = useDebounce(name, 300);
  const normalizedName = normalize(debouncedName);

  return useQuery({
    queryKey: ["exercise-duplicate-check", normalizedName, excludeId],
    queryFn: async () => {
      if (normalizedName.length < 3) return [];

      const { data, error } = await supabase
        .from("exercises_library")
        .select("id, name")
        .ilike("name", `%${debouncedName.trim()}%`)
        .limit(5);

      if (error) throw error;

      // Filter out the current exercise if editing
      const filtered = excludeId
        ? data.filter((e) => e.id !== excludeId)
        : data;

      return filtered;
    },
    enabled: normalizedName.length >= 3,
  });
}
