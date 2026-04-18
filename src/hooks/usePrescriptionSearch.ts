import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPrescription } from "./usePrescriptions";
import { useDebounce } from "./useDebounce";

export interface PrescriptionSearchFilters {
  searchText?: string;
  folderId?: string | null;
  dayOfWeek?: string;
}

export const usePrescriptionSearch = (filters: PrescriptionSearchFilters) => {
  const debouncedSearchText = useDebounce(filters.searchText?.trim() ?? "", 300);
  const stableFolderId =
    filters.folderId === undefined ? "__all__" : filters.folderId === null ? "__none__" : filters.folderId;
  const stableDayOfWeek = filters.dayOfWeek ?? "";
  const hasSearchFilters =
    debouncedSearchText.length > 0 || filters.folderId !== undefined || !!filters.dayOfWeek;

  return useQuery({
    queryKey: ["prescription-search", debouncedSearchText, stableFolderId, stableDayOfWeek],
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("workout_prescriptions")
        .select(`
          *,
          assigned_count:prescription_assignments(count)
        `)
        .eq("trainer_id", user.id);

      // Filter by search text (name or objective)
      if (debouncedSearchText) {
        const searchTerm = `%${debouncedSearchText}%`;
        query = query.or(`name.ilike.${searchTerm},objective.ilike.${searchTerm}`);
      }

      // Filter by folder
      if (filters.folderId !== undefined) {
        if (filters.folderId === null) {
          query = query.is("folder_id", null);
        } else {
          query = query.eq("folder_id", filters.folderId);
        }
      }

      // Filter by day of week (if stored in objective or name)
      if (filters.dayOfWeek) {
        const dayTerm = `%${filters.dayOfWeek}%`;
        query = query.or(`name.ilike.${dayTerm},objective.ilike.${dayTerm}`);
      }

      query = query.order("order_index", { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      return (data ?? []).map((item) => ({
        ...item,
        assigned_count: Array.isArray(item.assigned_count) ? (item.assigned_count[0] as { count: number })?.count || 0 : 0,
      })) as unknown as WorkoutPrescription[];
    },
    enabled: hasSearchFilters,
  });
};
