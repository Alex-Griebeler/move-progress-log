import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ExerciseLibrary {
  id: string;
  name: string;
  movement_pattern: string;
  laterality: string | null;
  movement_plane: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExerciseFilters {
  movement_pattern?: string;
  laterality?: string;
  movement_plane?: string;
}

export const MOVEMENT_PATTERNS = {
  knee_dominant: "Dominância de Joelho",
  hip_dominant: "Dominância de Quadril",
  push: "Empurrar",
  pull: "Puxar",
  core: "Core/Abdômen",
  carry: "Carregar",
};

export const LATERALITY_OPTIONS = {
  bilateral: "Bilateral",
  unilateral: "Unilateral",
  asymmetric: "Assimétrica",
};

export const MOVEMENT_PLANES = {
  sagittal: "Sagital",
  frontal: "Frontal",
  transverse: "Transverso",
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

      const { data, error } = await query;

      if (error) throw error;
      return data as ExerciseLibrary[];
    },
  });
};

export const useCreateExercise = () => {
  const { toast } = useToast();
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
      toast({
        title: "Exercício criado",
        description: "O exercício foi adicionado à biblioteca com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar exercício",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateExercise = () => {
  const { toast } = useToast();
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
      toast({
        title: "Exercício atualizado",
        description: "O exercício foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar exercício",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteExercise = () => {
  const { toast } = useToast();
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
      toast({
        title: "Exercício excluído",
        description: "O exercício foi removido da biblioteca.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir exercício",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
