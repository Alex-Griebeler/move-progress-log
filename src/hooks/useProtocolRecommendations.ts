import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { sortProtocolRecommendations } from "./protocolRecommendationUtils";
import { buildErrorDescription } from "@/utils/errorParsing";

const PROTOCOL_RECOMMENDATIONS_SELECT = `
  id,
  student_id,
  protocol_id,
  recommended_date,
  reason,
  priority,
  applied,
  trainer_notes,
  created_at,
  protocol:recovery_protocols(
    id,
    name,
    category,
    subcategory,
    duration_minutes,
    benefits,
    contraindications,
    instructions,
    scientific_references
  )
`;

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
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_recommendations")
        .select(PROTOCOL_RECOMMENDATIONS_SELECT)
        .eq("student_id", studentId)
        .order("recommended_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return sortProtocolRecommendations((data || []) as ProtocolRecommendation[]) as ProtocolRecommendation[];
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

      const count =
        data && typeof data === "object" && "recommendations_count" in data
          ? Number((data as { recommendations_count?: unknown }).recommendations_count) || 0
          : 0;

      if (count > 0) {
        notify.success(
          `${count} ${i18n.modules.recommendations.generated}`
        );
      } else {
        notify.info(i18n.modules.recommendations.noRecommendations);
      }
    },
    onError: (error: Error) => {
      notify.error(i18n.modules.recommendations.errorGenerate, {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
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
      const updateData: Record<string, unknown> = {};
      if (applied !== undefined) updateData.applied = applied;
      if (trainer_notes !== undefined) updateData.trainer_notes = trainer_notes;

      const { error } = await supabase
        .from("protocol_recommendations")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // MEL-IA-007: Record adherence when toggling "Seguiu?"
      if (applied !== undefined) {
        // Get recommendation details to record adherence
        const { data: rec, error: recError } = await supabase
          .from("protocol_recommendations")
          .select("student_id, protocol_id")
          .eq("id", id)
          .single();
        if (recError) {
          throw recError;
        }

        if (rec) {
          if (applied) {
            // Fetch current Oura metrics for "before" snapshot
            const { data: currentMetrics, error: metricsError } = await supabase
              .from("oura_metrics")
              .select("average_sleep_hrv, readiness_score")
              .eq("student_id", rec.student_id)
              .order("date", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (metricsError) throw metricsError;

            const { error: adherenceUpsertError } = await supabase
              .from("protocol_adherence")
              .upsert({
                student_id: rec.student_id,
                protocol_id: rec.protocol_id,
                recommendation_id: id,
                followed: true,
                followed_at: new Date().toISOString(),
                hrv_before: currentMetrics?.average_sleep_hrv ?? null,
                readiness_before: currentMetrics?.readiness_score ?? null,
              }, { onConflict: "recommendation_id" });

            if (adherenceUpsertError) throw adherenceUpsertError;
          } else {
            // Remove adherence record if un-toggled
            const { error: adherenceDeleteError } = await supabase
              .from("protocol_adherence")
              .delete()
              .eq("recommendation_id", id);

            if (adherenceDeleteError) throw adherenceDeleteError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["protocol-recommendations"] 
      });
      notify.success(i18n.modules.recommendations.updated);
    },
    onError: (error: Error) => {
      notify.error(i18n.modules.recommendations.errorUpdate, {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};
