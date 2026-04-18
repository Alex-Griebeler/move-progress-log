import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BreathingProtocol } from "@/types/aiSession";

type BreathingCategory = "respiracao" | "mindfulness" | "meditacao";
type UsageContext = "pre_workout" | "intra_workout" | "post_workout" | "recovery";

export const useBreathingProtocols = (category?: BreathingCategory) => {
  return useQuery({
    queryKey: ["breathing-protocols", category],
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let query = supabase
        .from("breathing_protocols")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map database fields to interface
      return data.map((protocol) => ({
        id: protocol.id,
        name: protocol.name,
        category: protocol.category as BreathingCategory,
        technique: protocol.technique,
        rhythm: protocol.rhythm,
        durationSeconds: protocol.duration_seconds,
        instructions: protocol.instructions,
        benefits: (protocol.benefits as string[]) || [],
        whenToUse: (protocol.when_to_use as UsageContext[]) || [],
        audioCues: protocol.audio_cues || [],
        isActive: protocol.is_active ?? true,
      })) as BreathingProtocol[];
    },
  });
};

export const useBreathingProtocolsByContext = (context: UsageContext) => {
  const { data: protocols, ...rest } = useBreathingProtocols();

  const filteredProtocols = protocols?.filter((p) =>
    p.whenToUse.includes(context)
  );

  return {
    data: filteredProtocols,
    ...rest,
  };
};
