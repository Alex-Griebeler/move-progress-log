import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OuraConnection {
  id: string;
  student_id: string;
  connected_at: string;
  last_sync_at: string | null;
  is_active: boolean;
}

export const useOuraConnection = (studentId: string) => {
  return useQuery({
    queryKey: ["oura-connection", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oura_connections")
        .select("*")
        .eq("student_id", studentId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as OuraConnection | null;
    },
  });
};

export const useSyncOura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      student_id,
      date,
    }: {
      student_id: string;
      date?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("oura-sync", {
        body: { student_id, date },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["oura-connection", variables.student_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["oura-metrics", variables.student_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["oura-metrics-latest", variables.student_id],
      });
      toast.success("Dados do Oura Ring sincronizados com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });
};

export const useDisconnectOura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (student_id: string) => {
      const { data, error } = await supabase.functions.invoke(
        "oura-disconnect",
        {
          body: { student_id },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (_, student_id) => {
      queryClient.invalidateQueries({
        queryKey: ["oura-connection", student_id],
      });
      toast.success("Oura Ring desconectado");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desconectar: ${error.message}`);
    },
  });
};
