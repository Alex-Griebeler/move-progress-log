import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Json } from "@/integrations/supabase/types";

export type SeverityLevel = 'none' | 'mild' | 'moderate' | 'severe';

export interface FunctionalFinding {
  id: string;
  assessment_id: string;
  body_region: string;
  classification_tag: string;
  severity: SeverityLevel;
  hypoactive_muscles: string[];
  hyperactive_muscles: string[];
  associated_injuries: string[];
  priority_score: number | null;
  context_weight: number | null;
  biomechanical_importance: number | null;
  created_at: string;
}

const mapFindingFromDb = (data: any): FunctionalFinding => ({
  ...data,
  hypoactive_muscles: (data.hypoactive_muscles as string[]) || [],
  hyperactive_muscles: (data.hyperactive_muscles as string[]) || [],
  associated_injuries: (data.associated_injuries as string[]) || [],
});

export const useFunctionalFindings = (assessmentId: string | null) => {
  return useQuery({
    queryKey: ["functional-findings", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      if (!assessmentId) return [];

      const { data, error } = await supabase
        .from("functional_findings")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("priority_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []).map(mapFindingFromDb);
    },
  });
};

export const useFunctionalFindingsByRegion = (assessmentId: string | null, bodyRegion?: string) => {
  return useQuery({
    queryKey: ["functional-findings", assessmentId, bodyRegion],
    enabled: !!assessmentId,
    queryFn: async () => {
      if (!assessmentId) return [];

      let query = supabase
        .from("functional_findings")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("priority_score", { ascending: false, nullsFirst: false });

      if (bodyRegion) {
        query = query.eq("body_region", bodyRegion);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(mapFindingFromDb);
    },
  });
};

export const useCreateFunctionalFinding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      assessment_id: string;
      body_region: string;
      classification_tag: string;
      severity?: SeverityLevel;
      hypoactive_muscles?: string[];
      hyperactive_muscles?: string[];
      associated_injuries?: string[];
      priority_score?: number;
      context_weight?: number;
      biomechanical_importance?: number;
    }) => {
      const { data: finding, error } = await supabase
        .from("functional_findings")
        .insert({
          assessment_id: data.assessment_id,
          body_region: data.body_region,
          classification_tag: data.classification_tag,
          severity: data.severity || 'mild',
          hypoactive_muscles: (data.hypoactive_muscles || []) as unknown as Json,
          hyperactive_muscles: (data.hyperactive_muscles || []) as unknown as Json,
          associated_injuries: (data.associated_injuries || []) as unknown as Json,
          priority_score: data.priority_score || null,
          context_weight: data.context_weight || null,
          biomechanical_importance: data.biomechanical_importance || null,
        })
        .select()
        .single();

      if (error) throw error;
      return mapFindingFromDb(finding);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["functional-findings", variables.assessment_id] });
      notify.success("Achado funcional registrado");
    },
    onError: (error: Error) => {
      notify.error("Erro ao registrar achado", {
        description: error.message
      });
    },
  });
};

export const useCreateMultipleFunctionalFindings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      assessment_id: string;
      findings: Array<{
        body_region: string;
        classification_tag: string;
        severity?: SeverityLevel;
        hypoactive_muscles?: string[];
        hyperactive_muscles?: string[];
        associated_injuries?: string[];
        priority_score?: number;
        context_weight?: number;
        biomechanical_importance?: number;
      }>;
    }) => {
      const findingsToInsert = data.findings.map(f => ({
        assessment_id: data.assessment_id,
        body_region: f.body_region,
        classification_tag: f.classification_tag,
        severity: f.severity || 'mild',
        hypoactive_muscles: (f.hypoactive_muscles || []) as unknown as Json,
        hyperactive_muscles: (f.hyperactive_muscles || []) as unknown as Json,
        associated_injuries: (f.associated_injuries || []) as unknown as Json,
        priority_score: f.priority_score || null,
        context_weight: f.context_weight || null,
        biomechanical_importance: f.biomechanical_importance || null,
      }));

      const { data: findings, error } = await supabase
        .from("functional_findings")
        .insert(findingsToInsert)
        .select();

      if (error) throw error;
      return (findings || []).map(mapFindingFromDb);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["functional-findings", variables.assessment_id] });
      notify.success("Achados funcionais registrados");
    },
    onError: (error: Error) => {
      notify.error("Erro ao registrar achados", {
        description: error.message
      });
    },
  });
};

export const useUpdateFunctionalFinding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<FunctionalFinding> & { id: string; assessment_id: string }) => {
      const { id, assessment_id, hypoactive_muscles, hyperactive_muscles, associated_injuries, ...rest } = data;

      const payload: Record<string, any> = { ...rest };
      if (hypoactive_muscles) {
        payload.hypoactive_muscles = hypoactive_muscles as unknown as Json;
      }
      if (hyperactive_muscles) {
        payload.hyperactive_muscles = hyperactive_muscles as unknown as Json;
      }
      if (associated_injuries) {
        payload.associated_injuries = associated_injuries as unknown as Json;
      }

      const { data: finding, error } = await supabase
        .from("functional_findings")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...mapFindingFromDb(finding), assessment_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["functional-findings", data.assessment_id] });
      notify.success("Achado funcional atualizado");
    },
    onError: (error: Error) => {
      notify.error("Erro ao atualizar achado", {
        description: error.message
      });
    },
  });
};

export const useDeleteFunctionalFinding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; assessment_id: string }) => {
      const { error } = await supabase
        .from("functional_findings")
        .delete()
        .eq("id", data.id);

      if (error) throw error;
      return data.assessment_id;
    },
    onSuccess: (assessmentId) => {
      queryClient.invalidateQueries({ queryKey: ["functional-findings", assessmentId] });
      notify.success("Achado funcional removido");
    },
    onError: (error: Error) => {
      notify.error("Erro ao remover achado", {
        description: error.message
      });
    },
  });
};

export const useDeleteAllFindingsForAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      const { error } = await supabase
        .from("functional_findings")
        .delete()
        .eq("assessment_id", assessmentId);

      if (error) throw error;
      return assessmentId;
    },
    onSuccess: (assessmentId) => {
      queryClient.invalidateQueries({ queryKey: ["functional-findings", assessmentId] });
      notify.success("Achados funcionais removidos");
    },
    onError: (error: Error) => {
      notify.error("Erro ao remover achados", {
        description: error.message
      });
    },
  });
};
