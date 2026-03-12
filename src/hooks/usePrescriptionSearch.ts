import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPrescription } from "./usePrescriptions";

export interface PrescriptionSearchFilters {
  searchText?: string;
  folderId?: string | null;
  dayOfWeek?: string;
}

export const usePrescriptionSearch = (filters: PrescriptionSearchFilters) => {
  return useQuery({
    queryKey: ["prescription-search", filters],
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
      if (filters.searchText && filters.searchText.trim()) {
        const searchTerm = `%${filters.searchText.trim()}%`;
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
    enabled: Object.keys(filters).some(key => 
      filters[key as keyof PrescriptionSearchFilters] !== undefined
    ),
  });
};
