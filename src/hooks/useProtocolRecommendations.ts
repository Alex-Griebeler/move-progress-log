import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProtocolRecommendation {
  id: string;
  student_id: string;
  protocol_id: string;
  recommended_date: string;
  reason: string;
  priority: "low" | "medium" | "high";
  applied: boolean;
  trainer_notes: string | null;
  created_at: string;
  protocol: {
    id: string;
    name: string;
    category: string;
    subcategory: string | null;
    duration_minutes: number;
    benefits: Record<string, string>;
    contraindications: string | null;
    instructions: string;
    scientific_references: string | null;
  };
}

export const useProtocolRecommendations = (studentId: string) => {
  return useQuery({
    queryKey: ["protocol-recommendations", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_recommendations")
        .select(`
          *,
          protocol:recovery_protocols(*)
        `)
        .eq("student_id", studentId)
        .order("recommended_date", { ascending: false })
        .order("priority", { ascending: true }); // high priority first (alphabetically)

      if (error) throw error;
      return data as ProtocolRecommendation[];
    },
  });
};

export const useGenerateRecommendations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-protocol-recommendations",
        {
          body: { student_id: studentId },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data, studentId) => {
      queryClient.invalidateQueries({ 
        queryKey: ["protocol-recommendations", studentId] 
      });
      
      if (data.recommendations_count > 0) {
        toast.success(
          `${data.recommendations_count} recomendações geradas com base nos dados do Oura Ring`
        );
      } else {
        toast.info("Nenhuma recomendação gerada. Métricas dentro dos parâmetros normais.");
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar recomendações: ${error.message}`);
    },
  });
};

export const useUpdateRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      applied,
      trainer_notes,
    }: {
      id: string;
      applied?: boolean;
      trainer_notes?: string;
    }) => {
      const updateData: any = {};
      if (applied !== undefined) updateData.applied = applied;
      if (trainer_notes !== undefined) updateData.trainer_notes = trainer_notes;

      const { error } = await supabase
        .from("protocol_recommendations")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["protocol-recommendations"] 
      });
      toast.success("Recomendação atualizada");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar recomendação: ${error.message}`);
    },
  });
};
