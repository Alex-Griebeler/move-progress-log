import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";

// Re-exportar constantes do backToBasics para manter compatibilidade
export {
  MOVEMENT_PATTERNS,
  LATERALITY_OPTIONS,
  MOVEMENT_PLANES,
  CONTRACTION_TYPES,
  LEVEL_OPTIONS,
  EXERCISE_CATEGORIES,
  RISK_LEVELS,
  NUMERIC_LEVEL_SCALE,
  BOYLE_SCORE_SCALE,
  EXERCISE_DIMENSIONS,
  PATTERN_TO_CATEGORY,
  SESSION_PATTERN_GROUPS,
  STRENGTH_SUBCATEGORIES,
  POTENCIA_SUBCATEGORIES,
  STABILITY_POSITION_OPTIONS,
  SURFACE_MODIFIER_OPTIONS,
} from "@/constants/backToBasics";

export interface ExerciseLibrary {
  id: string;
  name: string;
  movement_pattern: string;
  laterality: string | null;
  movement_plane: string | null;
  description: string | null;
  contraction_type: string | null;
  level: string | null;
  created_at: string;
  updated_at: string;
  video_url: string | null;
  equipment_required: string[] | null;
  prerequisites: unknown | null;
  risk_level: string | null;
  category: string | null;
  subcategory: string | null;
  plyometric_phase: number | null;
  default_sets: string | null;
  default_reps: string | null;
  // Novos campos de classificação multidimensional
  boyle_score: number | null;
  axial_load: number | null;
  lumbar_demand: number | null;
  technical_complexity: number | null;
  metabolic_potential: number | null;
  knee_dominance: number | null;
  hip_dominance: number | null;
  primary_muscles: string[] | null;
  emphasis: string | null;
  stability_position: string | null;
  surface_modifier: string | null;
}

// Interface para criação (campos opcionais)
export interface CreateExerciseInput {
  name: string;
  movement_pattern: string;
  laterality?: string | null;
  movement_plane?: string | null;
  description?: string | null;
  contraction_type?: string | null;
  level?: string | null;
  numeric_level?: number | null;
  video_url?: string | null;
  equipment_required?: string[] | null;
  prerequisites?: unknown | null;
  risk_level?: string | null;
  category?: string | null;
  subcategory?: string | null;
  plyometric_phase?: number | null;
  default_sets?: string | null;
  default_reps?: string | null;
  // Novos campos de classificação
  boyle_score?: number | null;
  axial_load?: number | null;
  lumbar_demand?: number | null;
  technical_complexity?: number | null;
  metabolic_potential?: number | null;
  knee_dominance?: number | null;
  hip_dominance?: number | null;
  primary_muscles?: string[] | null;
  emphasis?: string | null;
  stability_position?: string | null;
  surface_modifier?: string | null;
}

export interface ExerciseFilters {
  movement_pattern?: string;
  laterality?: string;
  movement_plane?: string;
  contraction_type?: string;
  level?: string;
  category?: string;
  subcategory?: string;
  risk_level?: string;
  stability_position?: string;
}

export const useExercisesLibrary = (filters?: ExerciseFilters) => {
  return useQuery({
    queryKey: ["exercises-library", filters],
    queryFn: async () => {
      let query = supabase
        .from("exercises_library")
        .select("*")
        .order("name")
        .limit(2000);

      if (filters?.movement_pattern) {
        query = query.eq("movement_pattern", filters.movement_pattern);
      }
      if (filters?.laterality) {
        query = query.eq("laterality", filters.laterality);
      }
      if (filters?.movement_plane) {
        query = query.eq("movement_plane", filters.movement_plane);
      }
      if (filters?.contraction_type) {
        query = query.eq("contraction_type", filters.contraction_type);
      }
      if (filters?.level) {
        query = query.eq("level", filters.level);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.subcategory) {
        query = query.eq("subcategory", filters.subcategory);
      }
      if (filters?.risk_level) {
        query = query.eq("risk_level", filters.risk_level);
      }
      if (filters?.stability_position) {
        query = query.eq("stability_position", filters.stability_position);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ExerciseLibrary[];
    },
  });
};

export const useCreateExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exercise: CreateExerciseInput) => {
      const { data, error } = await supabase
        .from("exercises_library")
        .insert(exercise as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises-library"] });
      notify.success(i18n.modules.exercises.created);
    },
    onError: (error) => {
      notify.error(i18n.modules.exercises.errorCreate, {
        description: error.message
      });
    },
  });
};

export const useUpdateExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...exercise }: Partial<CreateExerciseInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("exercises_library")
        .update(exercise as never)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises-library"] });
      notify.success(i18n.modules.exercises.updated);
    },
    onError: (error) => {
      notify.error(i18n.modules.exercises.errorUpdate, {
        description: error.message
      });
    },
  });
};

export const useDeleteExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if exercise is used in prescriptions
      const { data: prescriptionExercises, error: checkError } = await supabase
        .from("prescription_exercises")
        .select("id")
        .eq("exercise_library_id", id)
        .limit(1);

      if (checkError) throw checkError;

      if (prescriptionExercises && prescriptionExercises.length > 0) {
        throw new Error("Este exercício está sendo usado em uma ou mais prescrições e não pode ser excluído. Remova-o das prescrições primeiro.");
      }

      // Check if exercise is used in exercise adaptations
      const { data: adaptations, error: adaptError } = await supabase
        .from("exercise_adaptations")
        .select("id")
        .eq("exercise_library_id", id)
        .limit(1);

      if (adaptError) throw adaptError;

      if (adaptations && adaptations.length > 0) {
        throw new Error("Este exercício está sendo usado em adaptações de prescrições e não pode ser excluído. Remova-o das adaptações primeiro.");
      }

      const { error } = await supabase
        .from("exercises_library")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises-library"] });
      notify.success(i18n.modules.exercises.deleted);
    },
    onError: (error) => {
      notify.error(i18n.modules.exercises.errorDelete, {
        description: error.message
      });
    },
  });
};
