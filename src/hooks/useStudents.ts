import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { buildErrorDescription } from "@/utils/errorParsing";

export interface Student {
  id: string;
  name: string;
  weekly_sessions_proposed: number;
  birth_date: string | null;
  objectives: string[] | null;
  limitations: string | null;
  preferences: string | null;
  max_heart_rate: number | null;
  injury_history: string | null;
  fitness_level: 'iniciante' | 'intermediario' | 'avancado' | null;
  avatar_url: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  created_at: string;
  updated_at: string;
}

export const useStudents = () => {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("name")
        .limit(2000);
      
      if (error) throw error;
      return data as Student[];
    },
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at' | 'trainer_id'>) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("students")
        .insert({ ...studentData, trainer_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data as Student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      notify.success(i18n.modules.students.created);
    },
    onError: (error: Error) => {
      notify.error(i18n.modules.students.errorCreate, {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};

export const useGetOrCreateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (name: string) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar aluno existente do trainer atual
      const { data: existing } = await supabase
        .from("students")
        .select("*")
        .ilike("name", name)
        .eq("trainer_id", user.id)
        .maybeSingle();
      
      if (existing) return existing as Student;
      
      // Criar novo aluno se não existir
      const { data: newStudent, error } = await supabase
        .from("students")
        .insert({ name, trainer_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return newStudent as Student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      notify.success("Aluno localizado com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao buscar aluno", {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (student: Partial<Student> & { id: string }) => {
      const { id, ...updateData } = student;
      const { data, error } = await supabase
        .from("students")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student"] });
      notify.success(i18n.modules.students.updated);
    },
    onError: (error: Error) => {
      notify.error(i18n.modules.students.errorUpdate, {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      notify.success(i18n.modules.students.deleted);
    },
    onError: (error: Error) => {
      notify.error(i18n.modules.students.errorDelete, {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};
