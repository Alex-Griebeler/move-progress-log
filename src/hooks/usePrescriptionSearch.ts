import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPrescription } from "./usePrescriptions";
import { useDebounce } from "./useDebounce";

export interface PrescriptionSearchFilters {
  searchText?: string;
  folderId?: string | null;
  dayOfWeek?: string;
}

type PrescriptionSearchRow = {
  id: string;
  name: string;
  objective: string | null;
  created_at: string;
  updated_at: string;
  folder_id: string | null;
  order_index: number;
  prescription_type: "group" | "individual" | string;
  assigned_count: Array<{ count: number }> | null;
};

export const usePrescriptionSearch = (filters: PrescriptionSearchFilters) => {
  const debouncedSearchText = useDebounce(filters.searchText?.trim() ?? "", 300);
  const stableFolderId =
    filters.folderId === undefined ? "__all__" : filters.folderId === null ? "__none__" : filters.folderId;
  const stableDayOfWeek = filters.dayOfWeek?.trim() ?? "";
  const normalizedDayOfWeek = stableDayOfWeek.trim().toLowerCase();
  const hasSearchFilters =
    debouncedSearchText.length > 0 || filters.folderId !== undefined || normalizedDayOfWeek.length > 0;

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

      query = query.order("order_index", { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      const mapped = ((data ?? []) as PrescriptionSearchRow[]).map((item): WorkoutPrescription => ({
        id: item.id,
        name: item.name,
        objective: item.objective,
        created_at: item.created_at,
        updated_at: item.updated_at,
        folder_id: item.folder_id,
        order_index: item.order_index,
        prescription_type: item.prescription_type === "individual" ? "individual" : "group",
        assigned_students_count: Array.isArray(item.assigned_count)
          ? item.assigned_count[0]?.count ?? 0
          : 0,
      }));

      if (!normalizedDayOfWeek) {
        return mapped;
      }

      return mapped.filter((item) => {
        const haystack = `${item.name} ${item.objective ?? ""}`.toLowerCase();
        return haystack.includes(normalizedDayOfWeek);
      });
    },
    enabled: hasSearchFilters,
  });
};
