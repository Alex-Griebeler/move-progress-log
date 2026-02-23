import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";

export interface WorkoutPrescription {
  id: string;
  name: string;
  objective: string | null;
  created_at: string;
  updated_at: string;
  folder_id: string | null;
  order_index: number;
  assigned_students_count?: number;
}

export interface PrescriptionExercise {
  id: string;
  prescription_id: string;
  exercise_library_id: string;
  order_index: number;
  sets: string;
  reps: string;
  interval_seconds: number | null;
  pse: string | null;
  training_method: string | null;
  observations: string | null;
  group_with_previous: boolean;
  exercise_name?: string;
  adaptations?: ExerciseAdaptation[];
}

export interface ExerciseAdaptation {
  id: string;
  prescription_exercise_id: string;
  adaptation_type: "regression_1" | "regression_2" | "regression_3";
  exercise_library_id: string;
  sets: string | null;
  reps: string | null;
  interval_seconds: number | null;
  pse: string | null;
  observations: string | null;
  exercise_name?: string;
}

export interface PrescriptionAssignment {
  id: string;
  prescription_id: string;
  student_id: string;
  start_date: string;
  end_date: string | null;
  custom_adaptations: any;
  student_name?: string;
}

export const usePrescriptions = () => {
  return useQuery({
    queryKey: ["prescriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_prescriptions")
        .select(`
          *,
          prescription_assignments(student_id)
        `)
        .order("folder_id", { ascending: true, nullsFirst: false })
        .order("order_index", { ascending: true });

      if (error) throw error;
      
      return data.map((p: any) => ({
        ...p,
        assigned_students_count: p.prescription_assignments?.length || 0,
      }));
    },
  });
};

export const usePrescriptionDetails = (prescriptionId: string | null) => {
  return useQuery({
    queryKey: ["prescription", prescriptionId],
    enabled: !!prescriptionId,
    queryFn: async () => {
      if (!prescriptionId) return null;

      const { data: prescription, error: prescError } = await supabase
        .from("workout_prescriptions")
        .select("*")
        .eq("id", prescriptionId)
        .single();

      if (prescError) throw prescError;

      const { data: exercises, error: exError } = await supabase
        .from("prescription_exercises")
        .select(`
          *,
          exercises_library!prescription_exercises_exercise_library_id_fkey(name)
        `)
        .eq("prescription_id", prescriptionId)
        .order("order_index");

      if (exError) throw exError;

      const exerciseIds = exercises.map((ex) => ex.id);

      // BUG-006 fix: guard against empty array in .in()
      if (exerciseIds.length === 0) {
        return { ...prescription, exercises: [] };
      }

      const { data: adaptations, error: adaptError } = await supabase
        .from("exercise_adaptations")
        .select(`
          *,
          exercises_library!exercise_adaptations_exercise_library_id_fkey(name)
        `)
        .in("prescription_exercise_id", exerciseIds);

      if (adaptError) throw adaptError;

      const exercisesWithAdaptations = exercises.map((ex: any) => ({
        ...ex,
        exercise_name: ex.exercises_library?.name,
        adaptations: adaptations
          .filter((a: any) => a.prescription_exercise_id === ex.id)
          .map((a: any) => ({
            ...a,
            exercise_name: a.exercises_library?.name,
          })),
      }));

      return {
        ...prescription,
        exercises: exercisesWithAdaptations,
      };
    },
  });
};

export const useCreatePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      objective?: string;
      exercises: Array<{
        exercise_library_id: string;
        sets: string;
        reps: string;
        interval_seconds?: number;
        pse?: string;
        training_method?: string;
        observations?: string;
        group_with_previous?: boolean;
        should_track?: boolean;
        adaptations?: Array<{
          type: "regression_1" | "regression_2" | "regression_3";
          exercise_library_id: string;
          sets?: string;
          reps?: string;
          interval_seconds?: number;
          pse?: string;
          observations?: string;
        }>;
      }>;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: prescription, error: prescError } = await supabase
        .from("workout_prescriptions")
        .insert({
          name: data.name,
          objective: data.objective || null,
          trainer_id: user.id,
        })
        .select()
        .single();

      if (prescError) throw prescError;

      // MEL-001: Batch insert exercises (exercises without adaptations)
      const exercisesToInsert = data.exercises.map((ex, i) => ({
        prescription_id: prescription.id,
        exercise_library_id: ex.exercise_library_id,
        order_index: i,
        sets: ex.sets,
        reps: ex.reps,
        interval_seconds: ex.interval_seconds || null,
        pse: ex.pse || null,
        training_method: ex.training_method || null,
        observations: ex.observations || null,
        group_with_previous: ex.group_with_previous || false,
        should_track: ex.should_track ?? true,
      }));

      const { data: insertedExercises, error: exError } = await supabase
        .from("prescription_exercises")
        .insert(exercisesToInsert)
        .select();

      if (exError) throw exError;

      // Batch insert adaptations for all exercises that have them
      const allAdaptations: Array<{
        prescription_exercise_id: string;
        adaptation_type: string;
        exercise_library_id: string;
        sets: string | null;
        reps: string | null;
        interval_seconds: number | null;
        pse: string | null;
        observations: string | null;
      }> = [];
      data.exercises.forEach((ex, i) => {
        if (ex.adaptations && ex.adaptations.length > 0 && insertedExercises[i]) {
          ex.adaptations.forEach((adapt) => {
            allAdaptations.push({
              prescription_exercise_id: insertedExercises[i].id,
              adaptation_type: adapt.type,
              exercise_library_id: adapt.exercise_library_id,
              sets: adapt.sets || null,
              reps: adapt.reps || null,
              interval_seconds: adapt.interval_seconds || null,
              pse: adapt.pse || null,
              observations: adapt.observations || null,
            });
          });
        }
      });

      if (allAdaptations.length > 0) {
        const { error: adaptError } = await supabase
          .from("exercise_adaptations")
          .insert(allAdaptations);

        if (adaptError) throw adaptError;
      }

      return prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      notify.success(i18n.modules.prescriptions.created);
    },
    onError: (error) => {
      notify.error(i18n.modules.prescriptions.errorCreate, {
        description: error.message
      });
    },
  });
};

export const useAssignPrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      prescription_id: string;
      student_ids: string[];
      start_date: string;
      end_date?: string;
      custom_adaptations?: any;
    }) => {
      const assignments = data.student_ids.map((student_id) => ({
        prescription_id: data.prescription_id,
        student_id,
        start_date: data.start_date,
        end_date: data.end_date || null,
        custom_adaptations: data.custom_adaptations || null,
      }));

      const { error } = await supabase
        .from("prescription_assignments")
        .insert(assignments);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      notify.success(i18n.modules.prescriptions.assigned);
    },
    onError: (error: any) => {
      const isAlreadyAssigned = error.code === "23505" || error.message?.includes("duplicate key");
      notify.error(i18n.modules.prescriptions.errorAssign, {
        description: isAlreadyAssigned 
          ? "Este aluno já tem esta prescrição atribuída com a mesma data de início."
          : error.message
      });
    },
  });
};

export const useUpdatePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      objective?: string;
      exercises: Array<{
        exercise_library_id: string;
        sets: string;
        reps: string;
        interval_seconds?: number;
        pse?: string;
        training_method?: string;
        observations?: string;
        group_with_previous?: boolean;
        should_track?: boolean;
        adaptations?: Array<{
          type: "regression_1" | "regression_2" | "regression_3";
          exercise_library_id: string;
          sets?: string;
          reps?: string;
          interval_seconds?: number;
          pse?: string;
          observations?: string;
        }>;
      }>;
    }) => {
      // Update prescription basic info
      const { error: updateError } = await supabase
        .from("workout_prescriptions")
        .update({
          name: data.name,
          objective: data.objective || null,
        })
        .eq("id", data.id);

      if (updateError) throw updateError;

      // Delete existing exercises and their adaptations
      const { data: existingExercises } = await supabase
        .from("prescription_exercises")
        .select("id")
        .eq("prescription_id", data.id);

      if (existingExercises && existingExercises.length > 0) {
        const exerciseIds = existingExercises.map((ex) => ex.id);
        
        // BUG-005 fix: verify delete errors before proceeding
        const { error: adaptDeleteError } = await supabase
          .from("exercise_adaptations")
          .delete()
          .in("prescription_exercise_id", exerciseIds);

        if (adaptDeleteError) throw adaptDeleteError;

        const { error: exDeleteError } = await supabase
          .from("prescription_exercises")
          .delete()
          .eq("prescription_id", data.id);

        if (exDeleteError) throw exDeleteError;
      }

      // Insert new exercises
      for (let i = 0; i < data.exercises.length; i++) {
        const ex = data.exercises[i];
        const { data: exercise, error: exError } = await supabase
          .from("prescription_exercises")
          .insert({
            prescription_id: data.id,
            exercise_library_id: ex.exercise_library_id,
            order_index: i,
            sets: ex.sets,
            reps: ex.reps,
            interval_seconds: ex.interval_seconds || null,
            pse: ex.pse || null,
            training_method: ex.training_method || null,
            observations: ex.observations || null,
            group_with_previous: ex.group_with_previous || false,
            should_track: ex.should_track ?? true,
          })
          .select()
          .single();

        if (exError) throw exError;

        if (ex.adaptations && ex.adaptations.length > 0) {
          const adaptationsToInsert = ex.adaptations.map((adapt) => ({
            prescription_exercise_id: exercise.id,
            adaptation_type: adapt.type,
            exercise_library_id: adapt.exercise_library_id,
            sets: adapt.sets || null,
            reps: adapt.reps || null,
            interval_seconds: adapt.interval_seconds || null,
            pse: adapt.pse || null,
            observations: adapt.observations || null,
          }));

          const { error: adaptError } = await supabase
            .from("exercise_adaptations")
            .insert(adaptationsToInsert);

          if (adaptError) throw adaptError;
        }
      }

      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["prescription"] });
      notify.success(i18n.modules.prescriptions.updated);
    },
    onError: (error) => {
      notify.error(i18n.modules.prescriptions.errorUpdate, {
        description: error.message
      });
    },
  });
};

export const usePrescriptionAssignments = (prescriptionId: string | null) => {
  return useQuery({
    queryKey: ["assignments", prescriptionId],
    enabled: !!prescriptionId,
    queryFn: async () => {
      if (!prescriptionId) return [];

      const { data, error } = await supabase
        .from("prescription_assignments")
        .select(`
          *,
          students!prescription_assignments_student_id_fkey(name)
        `)
        .eq("prescription_id", prescriptionId)
        .order("start_date", { ascending: false });

      if (error) throw error;

      return data.map((a: any) => ({
        ...a,
        student_name: a.students?.name,
      })) as PrescriptionAssignment[];
    },
  });
};

export const useDeletePrescriptionAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("prescription_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["student-prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      notify.success("Atribuição excluída com sucesso");
    },
    onError: (error) => {
      notify.error("Erro ao excluir atribuição", {
        description: error.message
      });
    },
  });
};

export const useDeletePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      // Delete adaptations first
      const { data: exercises } = await supabase
        .from("prescription_exercises")
        .select("id")
        .eq("prescription_id", prescriptionId);

      if (exercises && exercises.length > 0) {
        const exerciseIds = exercises.map((ex) => ex.id);
        
        await supabase
          .from("exercise_adaptations")
          .delete()
          .in("prescription_exercise_id", exerciseIds);

        await supabase
          .from("prescription_exercises")
          .delete()
          .eq("prescription_id", prescriptionId);
      }

      // Delete assignments
      await supabase
        .from("prescription_assignments")
        .delete()
        .eq("prescription_id", prescriptionId);

      // Delete prescription
      const { error } = await supabase
        .from("workout_prescriptions")
        .delete()
        .eq("id", prescriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      notify.success("Prescrição excluída com sucesso");
    },
    onError: (error) => {
      notify.error("Erro ao excluir prescrição", {
        description: error.message
      });
    },
  });
};
