import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface WorkoutPrescription {
  id: string;
  name: string;
  objective: string | null;
  created_at: string;
  updated_at: string;
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
        .order("created_at", { ascending: false });

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
      const { data: prescription, error: prescError } = await supabase
        .from("workout_prescriptions")
        .insert({
          name: data.name,
          objective: data.objective || null,
        })
        .select()
        .single();

      if (prescError) throw prescError;

      for (let i = 0; i < data.exercises.length; i++) {
        const ex = data.exercises[i];
        const { data: exercise, error: exError } = await supabase
          .from("prescription_exercises")
          .insert({
            prescription_id: prescription.id,
            exercise_library_id: ex.exercise_library_id,
            order_index: i,
            sets: ex.sets,
            reps: ex.reps,
            interval_seconds: ex.interval_seconds || null,
            pse: ex.pse || null,
            training_method: ex.training_method || null,
            observations: ex.observations || null,
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

      return prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast({
        title: "Prescrição criada",
        description: "A prescrição foi criada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar prescrição",
        description: error.message,
        variant: "destructive",
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
      toast({
        title: "Prescrição atribuída",
        description: "A prescrição foi atribuída com sucesso aos alunos.",
      });
    },
    onError: (error: any) => {
      const isAlreadyAssigned = error.code === "23505" || error.message?.includes("duplicate key");
      toast({
        title: "Erro ao atribuir prescrição",
        description: isAlreadyAssigned 
          ? "Este aluno já tem esta prescrição atribuída com a mesma data de início."
          : error.message,
        variant: "destructive",
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
