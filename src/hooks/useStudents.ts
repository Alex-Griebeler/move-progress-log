import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Student {
  id: string;
  name: string;
  weekly_sessions_proposed: number;
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
        .order("name");
      
      if (error) throw error;
      return data as Student[];
    },
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("students")
        .insert({ name })
        .select()
        .single();
      
      if (error) throw error;
      return data as Student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
};

export const useGetOrCreateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (name: string) => {
      // Buscar aluno existente
      const { data: existing } = await supabase
        .from("students")
        .select("*")
        .ilike("name", name)
        .maybeSingle();
      
      if (existing) return existing as Student;
      
      // Criar novo aluno se não existir
      const { data: newStudent, error } = await supabase
        .from("students")
        .insert({ name })
        .select()
        .single();
      
      if (error) throw error;
      return newStudent as Student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
};
