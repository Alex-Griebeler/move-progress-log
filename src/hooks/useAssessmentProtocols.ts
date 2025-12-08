import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Json } from "@/integrations/supabase/types";

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'maintenance';

export interface ProtocolExercise {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  duration?: string;
  notes?: string;
  order: number;
}

export interface AssessmentProtocol {
  id: string;
  assessment_id: string;
  name: string | null;
  priority_level: PriorityLevel;
  phase: number;
  exercises: ProtocolExercise[];
  frequency_per_week: number;
  duration_weeks: number;
  completion_percentage: number;
  next_review_date: string | null;
  created_at: string;
  updated_at: string;
}

const mapProtocolFromDb = (data: any): AssessmentProtocol => ({
  ...data,
  exercises: (data.exercises as ProtocolExercise[]) || [],
});

export const useAssessmentProtocols = (assessmentId: string | null) => {
  return useQuery({
    queryKey: ["assessment-protocols", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      if (!assessmentId) return [];

      const { data, error } = await supabase
        .from("assessment_protocols")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("priority_level")
        .order("phase");

      if (error) throw error;
      return (data || []).map(mapProtocolFromDb);
    },
  });
};

export const useAssessmentProtocol = (protocolId: string | null) => {
  return useQuery({
    queryKey: ["assessment-protocol", protocolId],
    enabled: !!protocolId,
    queryFn: async () => {
      if (!protocolId) return null;

      const { data, error } = await supabase
        .from("assessment_protocols")
        .select("*")
        .eq("id", protocolId)
        .maybeSingle();

      if (error) throw error;
      return data ? mapProtocolFromDb(data) : null;
    },
  });
};

export const useCreateAssessmentProtocol = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      assessment_id: string;
      name?: string;
      priority_level?: PriorityLevel;
      phase?: number;
      exercises?: ProtocolExercise[];
      frequency_per_week?: number;
      duration_weeks?: number;
      next_review_date?: string;
    }) => {
      const { data: protocol, error } = await supabase
        .from("assessment_protocols")
        .insert({
          assessment_id: data.assessment_id,
          name: data.name || null,
          priority_level: data.priority_level || 'medium',
          phase: data.phase || 1,
          exercises: (data.exercises || []) as unknown as Json,
          frequency_per_week: data.frequency_per_week || 3,
          duration_weeks: data.duration_weeks || 4,
          completion_percentage: 0,
          next_review_date: data.next_review_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return mapProtocolFromDb(protocol);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assessment-protocols", variables.assessment_id] });
      notify.success("Protocolo criado com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao criar protocolo", {
        description: error.message
      });
    },
  });
};

export const useUpdateAssessmentProtocol = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AssessmentProtocol> & { id: string }) => {
      const { id, exercises, ...rest } = data;
      
      const payload: Record<string, any> = { ...rest };
      if (exercises) {
        payload.exercises = exercises as unknown as Json;
      }

      const { data: protocol, error } = await supabase
        .from("assessment_protocols")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return mapProtocolFromDb(protocol);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["assessment-protocols", data.assessment_id] });
      queryClient.invalidateQueries({ queryKey: ["assessment-protocol", data.id] });
      notify.success("Protocolo atualizado com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao atualizar protocolo", {
        description: error.message
      });
    },
  });
};

export const useUpdateProtocolProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; completion_percentage: number }) => {
      const { data: protocol, error } = await supabase
        .from("assessment_protocols")
        .update({ completion_percentage: data.completion_percentage })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;
      return mapProtocolFromDb(protocol);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["assessment-protocols", data.assessment_id] });
      queryClient.invalidateQueries({ queryKey: ["assessment-protocol", data.id] });
    },
    onError: (error: Error) => {
      notify.error("Erro ao atualizar progresso", {
        description: error.message
      });
    },
  });
};

export const useDeleteAssessmentProtocol = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; assessment_id: string }) => {
      const { error } = await supabase
        .from("assessment_protocols")
        .delete()
        .eq("id", data.id);

      if (error) throw error;
      return data.assessment_id;
    },
    onSuccess: (assessmentId) => {
      queryClient.invalidateQueries({ queryKey: ["assessment-protocols", assessmentId] });
      notify.success("Protocolo excluído com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao excluir protocolo", {
        description: error.message
      });
    },
  });
};

// Progress Logs
export interface ProgressLog {
  id: string;
  student_id: string;
  protocol_id: string;
  exercise_id: string;
  completed_at: string;
  difficulty_rating: number | null;
  notes: string | null;
}

export const useProgressLogs = (protocolId: string | null) => {
  return useQuery({
    queryKey: ["progress-logs", protocolId],
    enabled: !!protocolId,
    queryFn: async () => {
      if (!protocolId) return [];

      const { data, error } = await supabase
        .from("assessment_progress_logs")
        .select("*")
        .eq("protocol_id", protocolId)
        .order("completed_at", { ascending: false });

      if (error) throw error;
      return data as ProgressLog[];
    },
  });
};

export const useLogProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      student_id: string;
      protocol_id: string;
      exercise_id: string;
      difficulty_rating?: number;
      notes?: string;
    }) => {
      const { data: log, error } = await supabase
        .from("assessment_progress_logs")
        .insert({
          student_id: data.student_id,
          protocol_id: data.protocol_id,
          exercise_id: data.exercise_id,
          difficulty_rating: data.difficulty_rating ?? null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return log as ProgressLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["progress-logs", variables.protocol_id] });
      notify.success("Progresso registrado");
    },
    onError: (error: Error) => {
      notify.error("Erro ao registrar progresso", {
        description: error.message
      });
    },
  });
};
