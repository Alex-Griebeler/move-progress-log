import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { buildErrorDescription } from "@/utils/errorParsing";

export interface WhoopConnection {
  id: string;
  student_id: string;
  connected_at: string;
  last_sync_at: string | null;
  is_active: boolean;
}

const WHOOP_CONNECTION_SELECT = "id, student_id, connected_at, last_sync_at, is_active";

export const useWhoopConnection = (studentId: string) => {
  return useQuery({
    queryKey: ["whoop-connection", studentId],
    enabled: !!studentId,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whoop_connections")
        .select(WHOOP_CONNECTION_SELECT)
        .eq("student_id", studentId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data as WhoopConnection | null) ?? null;
    },
  });
};

export const useDisconnectWhoop = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (student_id: string) => {
      const { data, error } = await supabase.functions.invoke("whoop-disconnect", {
        body: { student_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, student_id) => {
      void queryClient.invalidateQueries({ queryKey: ["whoop-connection", student_id] });
      void queryClient.invalidateQueries({ queryKey: ["whoop-metrics", student_id] });
      notify.success("Whoop desconectado", {
        description: "Os dados já sincronizados foram preservados. Você pode reconectar a qualquer momento.",
      });
    },
    onError: (error: Error) => {
      notify.error("Erro ao desconectar Whoop", {
        description: buildErrorDescription(error, "Tente novamente em alguns instantes"),
      });
    },
  });
};


/**
 * Sync manual do Whoop (PR-5b) — espelho do padrão useSyncOura: mutation
 * separada invocando a edge `whoop-sync` (auth: admin), com timeout e
 * invalidação por prefixo. A edge decide a janela de datas.
 */
export const useSyncWhoop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      if (!navigator.onLine) {
        throw new Error("Você está offline. Conecte-se à internet para sincronizar.");
      }
      const timeoutMs = 60_000;
      const invocation = supabase.functions.invoke("whoop-sync", {
        body: { student_id: studentId },
      });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Tempo esgotado ao sincronizar o Whoop.")), timeoutMs),
      );
      const { data, error } = await Promise.race([invocation, timeout]);
      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, studentId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["whoop-metrics", studentId] }),
        queryClient.invalidateQueries({ queryKey: ["whoop-connection", studentId] }),
      ]);
      notify.success("Whoop sincronizado", {
        description: "Métricas atualizadas a partir da API do Whoop.",
      });
    },
    onError: (error) => {
      notify.error("Erro ao sincronizar o Whoop", {
        description: buildErrorDescription(error, "Tente novamente em instantes."),
      });
    },
  });
};
