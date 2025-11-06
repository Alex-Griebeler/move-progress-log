import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Trainer {
  id: string;
  full_name: string;
}

export function useTrainers() {
  return useQuery({
    queryKey: ['trainers'],
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
