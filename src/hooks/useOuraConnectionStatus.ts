import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

interface OuraConnectionStatus {
  isConnected: boolean;
  hasIssues: boolean;
  lastSyncAt: string | null;
  recentFailed: number;
}

export const useOuraConnectionStatus = (studentId: string) => {
  return useQuery({
    queryKey: ["oura-connection-status", studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<OuraConnectionStatus> => {
      // Verificar se tem conexão ativa
      const { data: connection, error: connectionError } = await supabase
        .from("oura_connections")
        .select("last_sync_at, is_active")
        .eq("student_id", studentId)
        .eq("is_active", true)
        .maybeSingle();

      if (connectionError) throw connectionError;

      if (!connection) {
        return {
          isConnected: false,
          hasIssues: false,
          lastSyncAt: null,
          recentFailed: 0,
        };
      }

      // Verificar logs de falha recentes (últimas 24h)
      const { data: failedLogs, error: failedLogsError } = await supabase
        .from("oura_sync_logs")
        .select("status")
        .eq("student_id", studentId)
        .eq("status", "failed")
        .gte("sync_time", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (failedLogsError) {
        logger.warn("[useOuraConnectionStatus] failed to load recent sync failures", failedLogsError);
      }

      const recentFailed = failedLogs?.length || 0;

      // Verificar se última sync foi há mais de 24h
      const lastSync = connection.last_sync_at ? new Date(connection.last_sync_at) : null;
      const isStale = lastSync ? Date.now() - lastSync.getTime() > 24 * 60 * 60 * 1000 : true;

      return {
        isConnected: true,
        hasIssues: recentFailed > 0 || isStale,
        lastSyncAt: connection.last_sync_at,
        recentFailed,
      };
    },
    staleTime: 60000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};
