import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecoveryProtocol {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  duration_minutes: number;
  benefits: Record<string, string>;
  contraindications: string | null;
  instructions: string;
  scientific_references: string | null;
  created_at: string;
  updated_at: string;
}

const RECOVERY_PROTOCOL_COLUMNS = `
  id,
  name,
  category,
  subcategory,
  duration_minutes,
  benefits,
  contraindications,
  instructions,
  scientific_references,
  created_at,
  updated_at
`;

export const useRecoveryProtocols = (category?: string) => {
  return useQuery({
    queryKey: ["recovery-protocols", category],
    queryFn: async () => {
      let query = supabase
        .from("recovery_protocols")
        .select(RECOVERY_PROTOCOL_COLUMNS)
        .order("category")
        .order("name");

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RecoveryProtocol[];
    },
  });
};

export const useRecoveryProtocol = (id: string) => {
  return useQuery({
    queryKey: ["recovery-protocol", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recovery_protocols")
        .select(RECOVERY_PROTOCOL_COLUMNS)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as RecoveryProtocol | null;
    },
  });
};
