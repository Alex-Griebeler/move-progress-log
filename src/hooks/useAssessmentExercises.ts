import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Json } from "@/integrations/supabase/types";

export type FabrikPhase = 'mobility' | 'inhibition' | 'activation' | 'stability' | 'strength' | 'integration';

export interface AssessmentExercise {
  id: string;
  name: string;
  description: string | null;
  fabrik_phase: FabrikPhase;
  body_region: string;
  target_muscles: string[];
  target_classifications: string[];
  video_url: string | null;
  progression_criteria: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const mapExerciseFromDb = (data: any): AssessmentExercise => ({
  ...data,
  target_muscles: (data.target_muscles as string[]) || [],
  target_classifications: (data.target_classifications as string[]) || [],
});

export const useAssessmentExercises = (filters?: {
  phase?: FabrikPhase;
  bodyRegion?: string;
  classification?: string;
  searchTerm?: string;
}) => {
  return useQuery({
    queryKey: ["assessment-exercises", filters],
    queryFn: async () => {
      let query = supabase
        .from("assessment_exercises")
        .select("*")
        .eq("is_active", true)
        .order("fabrik_phase")
        .order("name");

      if (filters?.phase) {
        query = query.eq("fabrik_phase", filters.phase);
      }

      if (filters?.bodyRegion) {
        query = query.eq("body_region", filters.bodyRegion);
      }

      if (filters?.classification) {
        query = query.contains("target_classifications", [filters.classification]);
      }

      if (filters?.searchTerm) {
        query = query.ilike("name", `%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(mapExerciseFromDb);
    },
  });
};

export const useAssessmentExercise = (exerciseId: string | null) => {
  return useQuery({
    queryKey: ["assessment-exercise", exerciseId],
    enabled: !!exerciseId,
    queryFn: async () => {
      if (!exerciseId) return null;

      const { data, error } = await supabase
        .from("assessment_exercises")
        .select("*")
        .eq("id", exerciseId)
        .maybeSingle();

      if (error) throw error;
      return data ? mapExerciseFromDb(data) : null;
    },
  });
};

export const useExercisesByPhase = (phase: FabrikPhase) => {
  return useQuery({
    queryKey: ["assessment-exercises-by-phase", phase],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_exercises")
        .select("*")
        .eq("fabrik_phase", phase)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return (data || []).map(mapExerciseFromDb);
    },
  });
};

export const useExercisesForClassification = (classification: string) => {
  return useQuery({
    queryKey: ["assessment-exercises-for-classification", classification],
    enabled: !!classification,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_exercises")
        .select("*")
        .contains("target_classifications", [classification])
        .eq("is_active", true)
        .order("fabrik_phase")
        .order("name");

      if (error) throw error;
      return (data || []).map(mapExerciseFromDb);
    },
  });
};

export const useCreateAssessmentExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      fabrik_phase: FabrikPhase;
      body_region: string;
      target_muscles?: string[];
      target_classifications?: string[];
      video_url?: string;
      progression_criteria?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: exercise, error } = await supabase
        .from("assessment_exercises")
        .insert({
          name: data.name,
          description: data.description || null,
          fabrik_phase: data.fabrik_phase,
          body_region: data.body_region,
          target_muscles: (data.target_muscles || []) as unknown as Json,
          target_classifications: (data.target_classifications || []) as unknown as Json,
          video_url: data.video_url || null,
          progression_criteria: data.progression_criteria || null,
          is_active: true,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return mapExerciseFromDb(exercise);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-exercises"] });
      notify.success("Exercício criado com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao criar exercício", {
        description: error.message
      });
    },
  });
};

export const useUpdateAssessmentExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AssessmentExercise> & { id: string }) => {
      const { id, target_muscles, target_classifications, ...rest } = data;

      const payload: Record<string, any> = { ...rest };
      if (target_muscles) {
        payload.target_muscles = target_muscles as unknown as Json;
      }
      if (target_classifications) {
        payload.target_classifications = target_classifications as unknown as Json;
      }

      const { data: exercise, error } = await supabase
        .from("assessment_exercises")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return mapExerciseFromDb(exercise);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["assessment-exercises"] });
      queryClient.invalidateQueries({ queryKey: ["assessment-exercise", data.id] });
      notify.success("Exercício atualizado com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao atualizar exercício", {
        description: error.message
      });
    },
  });
};

export const useDeactivateAssessmentExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exerciseId: string) => {
      const { data: exercise, error } = await supabase
        .from("assessment_exercises")
        .update({ is_active: false })
        .eq("id", exerciseId)
        .select()
        .single();

      if (error) throw error;
      return mapExerciseFromDb(exercise);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-exercises"] });
      notify.success("Exercício desativado");
    },
    onError: (error: Error) => {
      notify.error("Erro ao desativar exercício", {
        description: error.message
      });
    },
  });
};

export const useDeleteAssessmentExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exerciseId: string) => {
      const { error } = await supabase
        .from("assessment_exercises")
        .delete()
        .eq("id", exerciseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-exercises"] });
      notify.success("Exercício excluído com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao excluir exercício", {
        description: error.message
      });
    },
  });
};
