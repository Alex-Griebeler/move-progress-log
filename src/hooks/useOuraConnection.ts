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

/**
 * Helper function to invoke edge functions with timeout
 * Previne requisições que ficam travadas indefinidamente
 */
const invokeWithTimeout = async (
  functionName: string,
  body: any,
  timeoutMs = 15000
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      // @ts-ignore - Supabase types may not include signal yet
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (error) throw error;
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(
        "Timeout: A sincronização demorou muito. Verifique sua conexão com a internet."
      );
    }
    throw error;
  }
};

export const useSyncOura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      student_id,
      date,
      days = 1,
      onProgress,
    }: {
      student_id: string;
      date?: string;
      days?: number;
      onProgress?: (current: number, total: number) => void;
    }) => {
      // Detectar status offline ANTES de fazer requisição
      if (!navigator.onLine) {
        throw new Error(
          "Você está offline. Conecte-se à internet para sincronizar."
        );
      }

      if (days === 1) {
        // Single day sync
        onProgress?.(1, 1);
        const data = await invokeWithTimeout("oura-sync", {
          student_id,
          date,
        });
        return data;
      } else {
        // Multiple days sync with progress tracking
        const results = [];
        let completed = 0;

        for (let i = 0; i < days; i++) {
          const syncDate = new Date();
          syncDate.setDate(syncDate.getDate() - i);
          const dateStr = syncDate.toISOString().split("T")[0];

          try {
            const data = await invokeWithTimeout("oura-sync", {
              student_id,
              date: dateStr,
            });

            completed++;
            onProgress?.(completed, days);
            results.push({ status: "fulfilled", value: data });
          } catch (error) {
            completed++;
            onProgress?.(completed, days);
            results.push({ status: "rejected", reason: error });
          }
        }

        const successful = results.filter((r) => r.status === "fulfilled")
          .length;
        const failed = results.filter((r) => r.status === "rejected").length;

        if (successful === 0) {
          throw new Error("Falha ao sincronizar todos os dias");
        }

        return {
          success: true,
          total: days,
          successful,
          failed,
          message:
            failed > 0
              ? `Sincronizados ${successful} de ${days} dias (${failed} com problemas)`
              : `Todos os ${days} dias sincronizados com sucesso!`,
        };
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["oura-connection", variables.student_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["oura-metrics", variables.student_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["oura-metrics-latest", variables.student_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["oura-workouts", variables.student_id],
      });

      if (variables.days && variables.days > 1) {
        const message = data.message || `Sincronização concluída`;
        const description = data.failed > 0
          ? `${data.successful} dias sincronizados. Alguns dias podem não ter dados disponíveis ainda.`
          : `${data.successful} dias sincronizados com sucesso!`;
        
        toast.success(message, { description });
      } else {
        toast.success("Dados atualizados!", {
          description: "Métricas do Oura Ring sincronizadas"
        });
      }
    },
    onError: (error: Error) => {
      console.error("Oura sync error:", error);

      let title = "❌ Erro na sincronização";
      let description = "";

      // Detectar tipo específico de erro para feedback preciso
      if (
        !navigator.onLine ||
        error.message.includes("offline") ||
        error.message.includes("Você está offline")
      ) {
        title = "🔴 Sem conexão com a internet";
        description = "Conecte-se à internet e tente novamente.";
      } else if (
        error.message.includes("timeout") ||
        error.message.includes("Timeout")
      ) {
        title = "⏱️ Tempo esgotado";
        description =
          "A sincronização demorou muito. Verifique sua conexão e tente novamente.";
      } else if (
        error.message.includes("token") ||
        error.message.includes("unauthorized") ||
        error.message.includes("autenticação")
      ) {
        title = "🔒 Autenticação expirada";
        description =
          "Reconecte o Oura Ring através de um novo link de convite.";
      } else if (error.message.includes("Falha ao sincronizar todos")) {
        title = "❌ Nenhum dado disponível";
        description =
          "Não foi possível sincronizar nenhum dia. Tente mais tarde.";
      } else {
        description =
          "Verifique se o Oura Ring está sincronizado e sua conexão com a internet. Tente novamente mais tarde.";
      }

      toast.error(title, {
        description,
        duration: 8000, // 8 segundos para dar tempo de ler
      });
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
      toast.success("Oura Ring desconectado com sucesso", {
        description: "Seus dados já sincronizados foram preservados. Você pode reconectar a qualquer momento."
      });
    },
    onError: (error: Error) => {
      toast.error("Falha ao desconectar", {
        description: error.message || "Tente novamente em alguns instantes"
      });
    },
  });
};
