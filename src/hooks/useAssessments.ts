import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export type AssessmentStatus = 'draft' | 'in_progress' | 'completed' | 'archived';

export interface Assessment {
  id: string;
  professional_id: string;
  student_id: string;
  status: AssessmentStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string;
}

export const useAssessments = (filters?: { 
  status?: AssessmentStatus; 
  studentId?: string;
}) => {
  return useQuery({
    queryKey: ["assessments", filters],
    queryFn: async () => {
      let query = supabase
        .from("assessments")
        .select(`
          *,
          students(name)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.studentId) {
        query = query.eq("student_id", filters.studentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return data.map((a: any) => ({
        ...a,
        student_name: a.students?.name,
      })) as Assessment[];
    },
  });
};

export const useAssessment = (assessmentId: string | null) => {
  return useQuery({
    queryKey: ["assessment", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      if (!assessmentId) return null;

      const { data, error } = await supabase
        .from("assessments")
        .select(`
          *,
          students(name)
        `)
        .eq("id", assessmentId)
        .maybeSingle();

      if (error) throw error;
      
      return data ? {
        ...data,
        student_name: (data as any).students?.name,
      } as Assessment : null;
    },
  });
};

export const useCreateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      student_id: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: assessment, error } = await supabase
        .from("assessments")
        .insert({
          professional_id: user.id,
          student_id: data.student_id,
          status: 'draft' as AssessmentStatus,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return assessment as Assessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      notify.success("Avaliação criada com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao criar avaliação", {
        description: error.message
      });
    },
  });
};

export const useUpdateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      status?: AssessmentStatus;
      notes?: string;
      started_at?: string;
      completed_at?: string;
    }) => {
      const { id, ...updateData } = data;
      
      const { data: assessment, error } = await supabase
        .from("assessments")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return assessment as Assessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["assessment"] });
      notify.success("Avaliação atualizada com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao atualizar avaliação", {
        description: error.message
      });
    },
  });
};

export const useStartAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      const { data: assessment, error } = await supabase
        .from("assessments")
        .update({
          status: 'in_progress' as AssessmentStatus,
          started_at: new Date().toISOString(),
        })
        .eq("id", assessmentId)
        .select()
        .single();

      if (error) throw error;
      return assessment as Assessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["assessment"] });
      notify.success("Avaliação iniciada");
    },
    onError: (error: Error) => {
      notify.error("Erro ao iniciar avaliação", {
        description: error.message
      });
    },
  });
};

export const useCompleteAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      const { data: assessment, error } = await supabase
        .from("assessments")
        .update({
          status: 'completed' as AssessmentStatus,
          completed_at: new Date().toISOString(),
        })
        .eq("id", assessmentId)
        .select()
        .single();

      if (error) throw error;
      return assessment as Assessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["assessment"] });
      notify.success("Avaliação concluída com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao concluir avaliação", {
        description: error.message
      });
    },
  });
};

export const useDeleteAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      const { error } = await supabase
        .from("assessments")
        .delete()
        .eq("id", assessmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      notify.success("Avaliação excluída com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao excluir avaliação", {
        description: error.message
      });
    },
  });
};
