import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Trainer {
  id: string;
  full_name: string;
}

export function useTrainers() {
  return useQuery({
    queryKey: ['trainers'],
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainer_profiles')
        .select('id, full_name')
        .order('full_name');
      
      if (error) throw error;
      return data as Trainer[];
    },
  });
}
