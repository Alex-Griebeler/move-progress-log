import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { spToday } from "@/hooks/useOuraMetrics";
import { evaluateOuraFreshness } from "@/utils/ouraFreshness";

interface OuraConnectionStatus {
  isConnected: boolean;
  hasIssues: boolean;
  /** Última TENTATIVA (avança mesmo sem dados). */
  lastSyncAt: string | null;
  /** Último dia com sono/prontidão de verdade. */
  lastRealDataDate: string | null;
  /** Frase curta do estado (badge/tooltip). */
  summary: string | null;
  recentFailed: number;
}

export const useOuraConnectionStatus = (studentId: string) => {
  return useQuery({
    queryKey: ["oura-connection-status", studentId],
    enabled: !!studentId,
    refetchOnWindowFocus: false,
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
          lastRealDataDate: null,
          summary: null,
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

      // Último DADO REAL (sono ou prontidão) — `last_sync_at` só diz que tentou.
      const { data: lastReal, error: lastRealError } = await supabase
        .from("oura_metrics")
        .select("date")
        .eq("student_id", studentId)
        .or("sleep_score.not.is.null,readiness_score.not.is.null")
        .lte("date", spToday())
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastRealError) {
        // Falha de leitura NÃO é "nenhum dado ainda": deixa a query em erro
        // em vez de afirmar ausência de histórico.
        logger.warn("[useOuraConnectionStatus] failed to load last real data date", lastRealError);
        throw lastRealError;
      }

      const freshness = evaluateOuraFreshness({
        lastSyncAt: connection.last_sync_at,
        lastRealDataDate: lastReal?.date ?? null,
        recentFailed,
        today: spToday(),
      });

      return {
        isConnected: true,
        hasIssues: freshness.hasIssues,
        lastSyncAt: connection.last_sync_at,
        lastRealDataDate: lastReal?.date ?? null,
        summary: freshness.summary,
        recentFailed,
      };
    },
    staleTime: 60000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};
