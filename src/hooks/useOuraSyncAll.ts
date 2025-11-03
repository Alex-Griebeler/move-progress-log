import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncAllResult {
  message: string;
  total: number;
  success: number;
  failed: number;
  results: Array<{
    student_id: string;
    student_name: string;
    status: 'success' | 'failed';
    attempt: number;
    error?: string;
  }>;
}

export const useOuraSyncAll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SyncAllResult> => {
      const { data, error } = await supabase.functions.invoke('oura-sync-all', {
        body: {}
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all Oura-related queries
      queryClient.invalidateQueries({ queryKey: ["oura-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["oura-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["oura-connection"] });

      if (data.failed > 0) {
        toast.warning(
          `Sincronização concluída: ${data.success} sucesso, ${data.failed} falhas`,
          {
            description: "Verifique os logs para mais detalhes das falhas."
          }
        );
      } else {
        toast.success(
          `Sincronização concluída com sucesso!`,
          {
            description: `${data.success} alunos sincronizados.`
          }
        );
      }
    },
    onError: (error: Error) => {
      console.error("Error in sync all:", error);
      toast.error("Erro ao sincronizar alunos", {
        description: error.message || "Erro desconhecido"
      });
    },
  });
};
