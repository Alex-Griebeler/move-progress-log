import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { buildErrorDescription } from "@/utils/errorParsing";
import {
  mapAssignmentCustomAdaptations,
  sanitizeAssignmentScheduleAdaptations,
} from "./prescriptionMappers";
import type {
  AssignmentCustomAdaptations,
  AssignmentScheduleAdaptations,
  CustomAdaptation,
} from "./prescriptionMappers";
import {
  createPrescriptionWithRelations,
  type CreatePrescriptionInput,
} from "./prescriptionCreateUtils";
import { invalidatePrescriptionQueries } from "./prescriptionQueryInvalidation";

export interface WorkoutPrescription {
  id: string;
  name: string;
  objective: string | null;
  created_at: string;
  updated_at: string;
  folder_id: string | null;
  order_index: number;
  prescription_type: 'group' | 'individual';
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
  should_track: boolean;
  load: string | null;
  rir: string | null;
  exercise_name?: string;
  adaptations?: ExerciseAdaptation[];
}

export interface ExerciseAdaptation {
  id: string;
  prescription_exercise_id: string;
  adaptation_type: string;
  exercise_library_id: string;
  sets: string | null;
  reps: string | null;
  interval_seconds: number | null;
  pse: string | null;
  observations: string | null;
  exercise_name?: string;
}

export type { CustomAdaptation } from "./prescriptionMappers";
export type {
  AssignmentCustomAdaptations,
  AssignmentScheduleAdaptations,
} from "./prescriptionMappers";

export interface PrescriptionAssignment {
  id: string;
  prescription_id: string;
  student_id: string;
  start_date: string;
  end_date: string | null;
  custom_adaptations: AssignmentCustomAdaptations | null;
  student_name?: string;
}

export interface AssignPrescriptionResult {
  totalCount: number;
  createdCount: number;
  duplicateCount: number;
}

type WorkoutPrescriptionRow = Database["public"]["Tables"]["workout_prescriptions"]["Row"];
type PrescriptionAssignmentRow = Database["public"]["Tables"]["prescription_assignments"]["Row"];
type PrescriptionExerciseRow = Database["public"]["Tables"]["prescription_exercises"]["Row"];
type ExerciseAdaptationRow = Database["public"]["Tables"]["exercise_adaptations"]["Row"];

type PrescriptionListRow = WorkoutPrescriptionRow & {
  prescription_assignments: Array<{ student_id: string }> | null;
};

type PrescriptionExerciseWithLibraryRow = PrescriptionExerciseRow & {
  exercises_library: { name: string; category: string | null } | null;
};

type ExerciseAdaptationWithLibraryRow = ExerciseAdaptationRow & {
  exercises_library: { name: string } | null;
};

type AssignmentWithStudentRow = PrescriptionAssignmentRow & {
  students: { name: string } | null;
};

const PRESCRIPTIONS_PAGE_SIZE = 250;
const PRESCRIPTIONS_MAX_PAGES = 40;
const PRESCRIPTION_LIST_SELECT = `
  id, name, objective, created_at, updated_at, folder_id, order_index, prescription_type,
  prescription_assignments(student_id)
`;
const PRESCRIPTION_DETAILS_SELECT =
  "id, name, objective, created_at, updated_at, folder_id, order_index, prescription_type, trainer_id";
const PRESCRIPTION_EXERCISES_SELECT = `
  id, prescription_id, exercise_library_id, order_index, sets, reps, interval_seconds, pse, training_method,
  observations, group_with_previous, should_track, load, rir,
  exercises_library!prescription_exercises_exercise_library_id_fkey(name, category)
`;
const PRESCRIPTION_ADAPTATIONS_SELECT = `
  id, prescription_exercise_id, adaptation_type, exercise_library_id, sets, reps, interval_seconds, pse, observations,
  exercises_library!exercise_adaptations_exercise_library_id_fkey(name)
`;
const PRESCRIPTION_ASSIGNMENTS_SELECT = `
  id, prescription_id, student_id, start_date, end_date, custom_adaptations,
  students!prescription_assignments_student_id_fkey(name)
`;

const mapPrescriptionListItem = (row: PrescriptionListRow): WorkoutPrescription => ({
  id: row.id,
  name: row.name,
  objective: row.objective,
  created_at: row.created_at,
  updated_at: row.updated_at,
  folder_id: row.folder_id,
  order_index: row.order_index,
  prescription_type: row.prescription_type === "individual" ? "individual" : "group",
  assigned_students_count: row.prescription_assignments?.length || 0,
});

const mapPrescriptionExercise = (
  row: PrescriptionExerciseWithLibraryRow,
  adaptations: ExerciseAdaptationWithLibraryRow[]
): PrescriptionExercise => ({
  id: row.id,
  prescription_id: row.prescription_id,
  exercise_library_id: row.exercise_library_id,
  order_index: row.order_index,
  sets: row.sets,
  reps: row.reps,
  interval_seconds: row.interval_seconds,
  pse: row.pse,
  training_method: row.training_method,
  observations: row.observations,
  group_with_previous: row.group_with_previous,
  should_track: row.should_track,
  load: row.load,
  rir: row.rir,
  exercise_name: row.exercises_library?.name,
  adaptations: adaptations
    .filter((adaptation) => adaptation.prescription_exercise_id === row.id)
    .map((adaptation) => ({
      id: adaptation.id,
      prescription_exercise_id: adaptation.prescription_exercise_id,
      adaptation_type: adaptation.adaptation_type,
      exercise_library_id: adaptation.exercise_library_id,
      sets: adaptation.sets,
      reps: adaptation.reps,
      interval_seconds: adaptation.interval_seconds,
      pse: adaptation.pse,
      observations: adaptation.observations,
      exercise_name: adaptation.exercises_library?.name,
    })),
});

const mapPrescriptionAssignment = (row: AssignmentWithStudentRow): PrescriptionAssignment => ({
  id: row.id,
  prescription_id: row.prescription_id,
  student_id: row.student_id,
  start_date: row.start_date,
  end_date: row.end_date,
  custom_adaptations: mapAssignmentCustomAdaptations(row.custom_adaptations),
  student_name: row.students?.name,
});

export const usePrescriptions = () => {
  return useQuery({
    queryKey: ["prescriptions"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const allPrescriptions: PrescriptionListRow[] = [];

      for (let pageIndex = 0; pageIndex < PRESCRIPTIONS_MAX_PAGES; pageIndex += 1) {
        const from = pageIndex * PRESCRIPTIONS_PAGE_SIZE;
        const to = from + PRESCRIPTIONS_PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("workout_prescriptions")
          .select(PRESCRIPTION_LIST_SELECT)
          .order("folder_id", { ascending: true, nullsFirst: false })
          .order("order_index", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allPrescriptions.push(...(data as PrescriptionListRow[]));
        if (data.length < PRESCRIPTIONS_PAGE_SIZE) break;
      }

      return allPrescriptions.map(mapPrescriptionListItem);
    },
  });
};

export const usePrescriptionDetails = (prescriptionId: string | null) => {
  return useQuery({
    queryKey: ["prescription", prescriptionId],
    enabled: !!prescriptionId,
    staleTime: 2 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!prescriptionId) return null;

      const { data: prescription, error: prescError } = await supabase
        .from("workout_prescriptions")
        .select(PRESCRIPTION_DETAILS_SELECT)
        .eq("id", prescriptionId)
        .single();

      if (prescError) throw prescError;

      const { data: exercises, error: exError } = await supabase
        .from("prescription_exercises")
        .select(PRESCRIPTION_EXERCISES_SELECT)
        .eq("prescription_id", prescriptionId)
        .order("order_index");

      if (exError) throw exError;

      const typedExercises = (exercises || []) as PrescriptionExerciseWithLibraryRow[];
      const exerciseIds = typedExercises.map((ex) => ex.id);

      // BUG-006 fix: guard against empty array in .in()
      if (exerciseIds.length === 0) {
        return { ...prescription, exercises: [] };
      }

      const { data: adaptations, error: adaptError } = await supabase
        .from("exercise_adaptations")
        .select(PRESCRIPTION_ADAPTATIONS_SELECT)
        .in("prescription_exercise_id", exerciseIds);

      if (adaptError) throw adaptError;

      const typedAdaptations = (adaptations || []) as ExerciseAdaptationWithLibraryRow[];
      const exercisesWithAdaptations = typedExercises.map((exercise) => ({
        ...mapPrescriptionExercise(exercise, typedAdaptations),
        category: exercise.exercises_library?.category,
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
    mutationFn: async (data: CreatePrescriptionInput) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      return createPrescriptionWithRelations(supabase, user.id, data);
    },
    onSuccess: () => {
      void invalidatePrescriptionQueries(queryClient);
      notify.success(i18n.modules.prescriptions.created);
    },
    onError: (error) => {
      notify.error(i18n.modules.prescriptions.errorCreate, {
        description: buildErrorDescription(error, i18n.errors.unknown),
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
      custom_adaptations?: AssignmentScheduleAdaptations | null;
    }): Promise<AssignPrescriptionResult> => {
      const customAdaptations = sanitizeAssignmentScheduleAdaptations(
        data.custom_adaptations
      );

      const { data: existingAssignments, error: existingError } = await supabase
        .from("prescription_assignments")
        .select("student_id")
        .eq("prescription_id", data.prescription_id)
        .eq("start_date", data.start_date)
        .in("student_id", data.student_ids);

      if (existingError) throw existingError;

      const existingStudentIds = new Set((existingAssignments ?? []).map((row) => row.student_id));
      const newStudentIds = data.student_ids.filter((studentId) => !existingStudentIds.has(studentId));

      if (newStudentIds.length === 0) {
        return {
          totalCount: data.student_ids.length,
          createdCount: 0,
          duplicateCount: data.student_ids.length,
        };
      }

      const assignments = newStudentIds.map((student_id) => ({
        prescription_id: data.prescription_id,
        student_id,
        start_date: data.start_date,
        end_date: data.end_date || null,
        custom_adaptations: (customAdaptations ?? null) as Json | null,
      }));

      const { error } = await supabase
        .from("prescription_assignments")
        .insert(assignments);

      if (error) throw error;

      return {
        totalCount: data.student_ids.length,
        createdCount: newStudentIds.length,
        duplicateCount: data.student_ids.length - newStudentIds.length,
      };
    },
    onSuccess: (result, variables) => {
      void invalidatePrescriptionQueries(queryClient, {
        prescriptionId: variables.prescription_id,
        studentId: variables.student_ids.length === 1 ? variables.student_ids[0] : undefined,
      });

      if (result.createdCount > 0 && result.duplicateCount === 0) {
        notify.success(i18n.modules.prescriptions.assigned);
        return;
      }

      if (result.createdCount > 0 && result.duplicateCount > 0) {
        notify.warning("Atribuição parcial concluída", {
          description: `${result.createdCount} novo(s) aluno(s) atribuídos e ${result.duplicateCount} duplicado(s) ignorado(s).`,
        });
        return;
      }

      notify.info("Nenhuma nova atribuição", {
        description: `${result.duplicateCount} aluno(s) já tinham essa prescrição na mesma data de início.`,
      });
    },
    onError: (error: Error & { code?: string }) => {
      const message = buildErrorDescription(error, i18n.errors.unknown);
      const isAlreadyAssigned = error.code === "23505" || message.includes("duplicate key");
      notify.error(i18n.modules.prescriptions.errorAssign, {
        description: isAlreadyAssigned 
          ? "Este aluno já tem esta prescrição atribuída com a mesma data de início."
          : message
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
      prescription_type?: 'group' | 'individual';
      exercises: Array<{
        exercise_library_id: string;
        sets: string;
        reps: string;
        interval_seconds?: number;
        pse?: string;
        load?: string;
        rir?: string;
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
      // BUG-001 fix: Use atomic stored procedure instead of delete-then-reinsert
      // Update prescription_type if provided
      if (data.prescription_type) {
        const { error: prescriptionTypeError } = await supabase
          .from("workout_prescriptions")
          .update({ prescription_type: data.prescription_type })
          .eq("id", data.id);

        if (prescriptionTypeError) throw prescriptionTypeError;
      }

      const exercisesPayload = data.exercises.map((ex) => ({
        exercise_library_id: ex.exercise_library_id,
        sets: ex.sets,
        reps: ex.reps,
        interval_seconds: ex.interval_seconds || null,
        pse: ex.pse || null,
        load: ex.load || null,
        rir: ex.rir || null,
        training_method: ex.training_method || null,
        observations: ex.observations || null,
        group_with_previous: ex.group_with_previous || false,
        should_track: ex.should_track ?? true,
        adaptations: (ex.adaptations || []).map((adapt) => ({
          type: adapt.type,
          exercise_library_id: adapt.exercise_library_id,
          sets: adapt.sets || null,
          reps: adapt.reps || null,
          interval_seconds: adapt.interval_seconds || null,
          pse: adapt.pse || null,
          observations: adapt.observations || null,
        })),
      }));

      const { error } = await supabase.rpc('update_prescription_with_exercises', {
        p_prescription_id: data.id,
        p_name: data.name,
        p_objective: data.objective || null,
        p_exercises: exercisesPayload,
      });

      if (error) throw error;

      return data.id;
    },
    onSuccess: (prescriptionId) => {
      void invalidatePrescriptionQueries(queryClient, {
        prescriptionId,
      });
      notify.success(i18n.modules.prescriptions.updated);
    },
    onError: (error) => {
      notify.error(i18n.modules.prescriptions.errorUpdate, {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};

export const usePrescriptionAssignments = (prescriptionId: string | null) => {
  return useQuery({
    queryKey: ["assignments", prescriptionId],
    enabled: !!prescriptionId,
    staleTime: 2 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!prescriptionId) return [];

      const { data, error } = await supabase
        .from("prescription_assignments")
        .select(PRESCRIPTION_ASSIGNMENTS_SELECT)
        .eq("prescription_id", prescriptionId)
        .order("start_date", { ascending: false });

      if (error) throw error;

      return ((data || []) as AssignmentWithStudentRow[]).map(mapPrescriptionAssignment);
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
      void invalidatePrescriptionQueries(queryClient);
      // INC-009: usando chaves i18n
      notify.success(i18n.modules.prescriptions.deleted);
    },
    onError: (error) => {
      notify.error(i18n.modules.prescriptions.errorDelete, {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};

export const useDeletePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { error } = await supabase.rpc('delete_prescription_cascade', {
        p_prescription_id: prescriptionId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void invalidatePrescriptionQueries(queryClient);
      notify.success(i18n.modules.prescriptions.deleted);
    },
    onError: (error) => {
      notify.error(i18n.modules.prescriptions.errorDelete, {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};
