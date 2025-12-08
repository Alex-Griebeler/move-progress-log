import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Json } from "@/integrations/supabase/types";

// Global Test Results
export interface GlobalTestResult {
  id: string;
  assessment_id: string;
  test_name: string;
  anterior_view: Record<string, any>;
  lateral_view: Record<string, any>;
  posterior_view: Record<string, any>;
  left_side: Record<string, any>;
  right_side: Record<string, any>;
  notes: string | null;
  media_urls: string[];
  created_at: string;
  updated_at: string;
}

// Segmental Test Results
export interface SegmentalTestResult {
  id: string;
  assessment_id: string;
  test_name: string;
  body_region: string;
  left_value: number | null;
  right_value: number | null;
  cutoff_value: number | null;
  unit: string | null;
  pass_fail_left: boolean | null;
  pass_fail_right: boolean | null;
  notes: string | null;
  media_urls: string[];
  created_at: string;
  updated_at: string;
}

const mapGlobalTestFromDb = (data: any): GlobalTestResult => ({
  ...data,
  anterior_view: (data.anterior_view as Record<string, any>) || {},
  lateral_view: (data.lateral_view as Record<string, any>) || {},
  posterior_view: (data.posterior_view as Record<string, any>) || {},
  left_side: (data.left_side as Record<string, any>) || {},
  right_side: (data.right_side as Record<string, any>) || {},
  media_urls: (data.media_urls as string[]) || [],
});

const mapSegmentalTestFromDb = (data: any): SegmentalTestResult => ({
  ...data,
  media_urls: (data.media_urls as string[]) || [],
});

// Global Tests Hooks
export const useGlobalTestResults = (assessmentId: string | null) => {
  return useQuery({
    queryKey: ["global-test-results", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      if (!assessmentId) return [];

      const { data, error } = await supabase
        .from("global_test_results")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("created_at");

      if (error) throw error;
      return (data || []).map(mapGlobalTestFromDb);
    },
  });
};

export const useGlobalTestResult = (testId: string | null) => {
  return useQuery({
    queryKey: ["global-test-result", testId],
    enabled: !!testId,
    queryFn: async () => {
      if (!testId) return null;

      const { data, error } = await supabase
        .from("global_test_results")
        .select("*")
        .eq("id", testId)
        .maybeSingle();

      if (error) throw error;
      return data ? mapGlobalTestFromDb(data) : null;
    },
  });
};

export const useCreateGlobalTestResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      assessment_id: string;
      test_name: string;
      anterior_view?: Record<string, any>;
      lateral_view?: Record<string, any>;
      posterior_view?: Record<string, any>;
      left_side?: Record<string, any>;
      right_side?: Record<string, any>;
      notes?: string;
      media_urls?: string[];
    }) => {
      const { data: result, error } = await supabase
        .from("global_test_results")
        .insert({
          assessment_id: data.assessment_id,
          test_name: data.test_name,
          anterior_view: (data.anterior_view || {}) as unknown as Json,
          lateral_view: (data.lateral_view || {}) as unknown as Json,
          posterior_view: (data.posterior_view || {}) as unknown as Json,
          left_side: (data.left_side || {}) as unknown as Json,
          right_side: (data.right_side || {}) as unknown as Json,
          notes: data.notes || null,
          media_urls: (data.media_urls || []) as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return mapGlobalTestFromDb(result);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["global-test-results", variables.assessment_id] });
      notify.success("Teste global registrado");
    },
    onError: (error: Error) => {
      notify.error("Erro ao registrar teste", {
        description: error.message
      });
    },
  });
};

export const useUpdateGlobalTestResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<GlobalTestResult> & { id: string }) => {
      const { id, anterior_view, lateral_view, posterior_view, left_side, right_side, media_urls, ...rest } = data;

      const payload: Record<string, any> = { ...rest };
      if (anterior_view) payload.anterior_view = anterior_view as unknown as Json;
      if (lateral_view) payload.lateral_view = lateral_view as unknown as Json;
      if (posterior_view) payload.posterior_view = posterior_view as unknown as Json;
      if (left_side) payload.left_side = left_side as unknown as Json;
      if (right_side) payload.right_side = right_side as unknown as Json;
      if (media_urls) payload.media_urls = media_urls as unknown as Json;

      const { data: result, error } = await supabase
        .from("global_test_results")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return mapGlobalTestFromDb(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["global-test-results", data.assessment_id] });
      queryClient.invalidateQueries({ queryKey: ["global-test-result", data.id] });
      notify.success("Teste global atualizado");
    },
    onError: (error: Error) => {
      notify.error("Erro ao atualizar teste", {
        description: error.message
      });
    },
  });
};

export const useDeleteGlobalTestResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; assessment_id: string }) => {
      const { error } = await supabase
        .from("global_test_results")
        .delete()
        .eq("id", data.id);

      if (error) throw error;
      return data.assessment_id;
    },
    onSuccess: (assessmentId) => {
      queryClient.invalidateQueries({ queryKey: ["global-test-results", assessmentId] });
      notify.success("Teste global removido");
    },
    onError: (error: Error) => {
      notify.error("Erro ao remover teste", {
        description: error.message
      });
    },
  });
};

// Segmental Tests Hooks
export const useSegmentalTestResults = (assessmentId: string | null, bodyRegion?: string) => {
  return useQuery({
    queryKey: ["segmental-test-results", assessmentId, bodyRegion],
    enabled: !!assessmentId,
    queryFn: async () => {
      if (!assessmentId) return [];

      let query = supabase
        .from("segmental_test_results")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("body_region")
        .order("test_name");

      if (bodyRegion) {
        query = query.eq("body_region", bodyRegion);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(mapSegmentalTestFromDb);
    },
  });
};

export const useCreateSegmentalTestResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      assessment_id: string;
      test_name: string;
      body_region: string;
      left_value?: number;
      right_value?: number;
      cutoff_value?: number;
      unit?: string;
      pass_fail_left?: boolean;
      pass_fail_right?: boolean;
      notes?: string;
      media_urls?: string[];
    }) => {
      const { data: result, error } = await supabase
        .from("segmental_test_results")
        .insert({
          assessment_id: data.assessment_id,
          test_name: data.test_name,
          body_region: data.body_region,
          left_value: data.left_value ?? null,
          right_value: data.right_value ?? null,
          cutoff_value: data.cutoff_value ?? null,
          unit: data.unit || null,
          pass_fail_left: data.pass_fail_left ?? null,
          pass_fail_right: data.pass_fail_right ?? null,
          notes: data.notes || null,
          media_urls: (data.media_urls || []) as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return mapSegmentalTestFromDb(result);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["segmental-test-results", variables.assessment_id] });
      notify.success("Teste segmentar registrado");
    },
    onError: (error: Error) => {
      notify.error("Erro ao registrar teste", {
        description: error.message
      });
    },
  });
};

export const useCreateMultipleSegmentalTestResults = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      assessment_id: string;
      tests: Array<{
        test_name: string;
        body_region: string;
        left_value?: number;
        right_value?: number;
        cutoff_value?: number;
        unit?: string;
        pass_fail_left?: boolean;
        pass_fail_right?: boolean;
        notes?: string;
        media_urls?: string[];
      }>;
    }) => {
      const testsToInsert = data.tests.map(t => ({
        assessment_id: data.assessment_id,
        test_name: t.test_name,
        body_region: t.body_region,
        left_value: t.left_value ?? null,
        right_value: t.right_value ?? null,
        cutoff_value: t.cutoff_value ?? null,
        unit: t.unit || null,
        pass_fail_left: t.pass_fail_left ?? null,
        pass_fail_right: t.pass_fail_right ?? null,
        notes: t.notes || null,
        media_urls: (t.media_urls || []) as unknown as Json,
      }));

      const { data: results, error } = await supabase
        .from("segmental_test_results")
        .insert(testsToInsert)
        .select();

      if (error) throw error;
      return (results || []).map(mapSegmentalTestFromDb);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["segmental-test-results", variables.assessment_id] });
      notify.success("Testes segmentares registrados");
    },
    onError: (error: Error) => {
      notify.error("Erro ao registrar testes", {
        description: error.message
      });
    },
  });
};

export const useUpdateSegmentalTestResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<SegmentalTestResult> & { id: string }) => {
      const { id, media_urls, ...rest } = data;

      const payload: Record<string, any> = { ...rest };
      if (media_urls) {
        payload.media_urls = media_urls as unknown as Json;
      }

      const { data: result, error } = await supabase
        .from("segmental_test_results")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return mapSegmentalTestFromDb(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["segmental-test-results", data.assessment_id] });
      notify.success("Teste segmentar atualizado");
    },
    onError: (error: Error) => {
      notify.error("Erro ao atualizar teste", {
        description: error.message
      });
    },
  });
};

export const useDeleteSegmentalTestResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; assessment_id: string }) => {
      const { error } = await supabase
        .from("segmental_test_results")
        .delete()
        .eq("id", data.id);

      if (error) throw error;
      return data.assessment_id;
    },
    onSuccess: (assessmentId) => {
      queryClient.invalidateQueries({ queryKey: ["segmental-test-results", assessmentId] });
      notify.success("Teste segmentar removido");
    },
    onError: (error: Error) => {
      notify.error("Erro ao remover teste", {
        description: error.message
      });
    },
  });
};
