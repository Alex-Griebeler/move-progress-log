import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";

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
}

export interface ExerciseFilters {
  movement_pattern?: string;
  laterality?: string;
  movement_plane?: string;
  contraction_type?: string;
  level?: string;
}

export const MOVEMENT_PATTERNS = {
  "Dominância de joelho": "Dominância de joelho",
  "Dominância de quadril": "Dominância de quadril",
  "Puxar": "Puxar",
  "Empurrar": "Empurrar",
  "Carregar": "Carregar",
  "Core/Ativação": "Core/Ativação",
};

export const LATERALITY_OPTIONS = {
  bilateral: "Bilateral",
  unilateral: "Unilateral",
  "base assimétrica": "Base Assimétrica",
};

export const MOVEMENT_PLANES = {
  sagittal: "Sagital",
  frontal: "Frontal",
  transverse: "Transverso",
};

export const CONTRACTION_TYPES = {
  "Concêntrica": "Concêntrica",
  "Excêntrica": "Excêntrica",
  "Isométrica": "Isométrica",
  "Pliométrica / Potência": "Pliométrica / Potência",
  "Mista": "Mista",
};

export const LEVEL_OPTIONS = {
  "Iniciante": "Iniciante",
  "Iniciante/Intermediário": "Iniciante/Intermediário",
  "Intermediário": "Intermediário",
  "Intermediário/Avançado": "Intermediário/Avançado",
  "Avançado": "Avançado",
  "Todos os níveis": "Todos os níveis",
};

export const useExercisesLibrary = (filters?: ExerciseFilters) => {
  return useQuery({
    queryKey: ["exercises-library", filters],
    queryFn: async () => {
      let query = supabase
        .from("exercises_library")
        .select("*")
        .order("name");

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

      const { data, error } = await query;

      if (error) throw error;
      return data as ExerciseLibrary[];
    },
  });
};

export const useCreateExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exercise: Omit<ExerciseLibrary, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("exercises_library")
        .insert(exercise)
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
    mutationFn: async ({ id, ...exercise }: Partial<ExerciseLibrary> & { id: string }) => {
      const { data, error } = await supabase
        .from("exercises_library")
        .update(exercise)
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
