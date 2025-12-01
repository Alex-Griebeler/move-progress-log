import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StudentCardData {
  ouraMetrics: {
    readiness_score: number | null;
  } | null;
  importantObservations: Array<{
    id: string;
    observation_text: string;
    severity: string | null;
    created_at: string | null;
    categories: string[] | null;
    is_resolved: boolean | null;
  }>;
  ouraStatus: {
    isConnected: boolean;
    hasIssues: boolean;
  };
}

type StudentCardDataMap = Record<string, StudentCardData>;

/**
 * Hook otimizado que busca dados de todos os alunos em batch
 * Reduz de N*3 queries para apenas 3 queries totais
 */
export const useStudentsCardData = (studentIds: string[]) => {
  return useQuery({
    queryKey: ["students-card-data", studentIds.sort().join(",")],
    enabled: studentIds.length > 0,
    staleTime: 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
    queryFn: async (): Promise<StudentCardDataMap> => {
      // Query 1: Buscar métricas Oura mais recentes de todos os alunos
      const { data: allMetrics } = await supabase
        .from("oura_metrics")
        .select("student_id, readiness_score, date")
        .in("student_id", studentIds)
        .order("date", { ascending: false });

      // Agrupar por student_id e pegar apenas o mais recente
      const latestMetricsByStudent: Record<string, { readiness_score: number | null }> = {};
      allMetrics?.forEach((metric) => {
        if (!latestMetricsByStudent[metric.student_id]) {
          latestMetricsByStudent[metric.student_id] = {
            readiness_score: metric.readiness_score,
          };
        }
      });

      // Query 2: Buscar observações importantes de todos os alunos
      const { data: allObservations } = await supabase
        .from("student_observations")
        .select("id, student_id, observation_text, severity, created_at, categories, is_resolved")
        .in("student_id", studentIds)
        .eq("is_resolved", false)
        .in("severity", ["baixa", "média", "alta"])
        .order("severity", { ascending: false })
        .order("created_at", { ascending: false });

      // Agrupar observações por student_id
      const observationsByStudent: Record<string, typeof allObservations> = {};
      allObservations?.forEach((obs) => {
        if (!observationsByStudent[obs.student_id]) {
          observationsByStudent[obs.student_id] = [];
        }
        observationsByStudent[obs.student_id].push(obs);
      });

      // Query 3: Buscar status de conexão Oura de todos os alunos
      const { data: allConnections } = await supabase
        .from("oura_connections")
        .select("student_id, last_sync_at, is_active")
        .in("student_id", studentIds)
        .eq("is_active", true);

      // Query 4: Buscar logs de falha das últimas 24h para alunos conectados
      const connectedStudentIds = allConnections?.map((c) => c.student_id) || [];
      let failedLogsByStudent: Record<string, number> = {};

      if (connectedStudentIds.length > 0) {
        const { data: failedLogs } = await supabase
          .from("oura_sync_logs")
          .select("student_id")
          .in("student_id", connectedStudentIds)
          .eq("status", "failed")
          .gte("sync_time", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        failedLogs?.forEach((log) => {
          failedLogsByStudent[log.student_id] = (failedLogsByStudent[log.student_id] || 0) + 1;
        });
      }

      // Mapear conexões por student_id
      const connectionsByStudent: Record<string, { last_sync_at: string | null; is_active: boolean }> = {};
      allConnections?.forEach((conn) => {
        connectionsByStudent[conn.student_id] = {
          last_sync_at: conn.last_sync_at,
          is_active: conn.is_active ?? false,
        };
      });

      // Construir resultado final
      const result: StudentCardDataMap = {};

      studentIds.forEach((studentId) => {
        const connection = connectionsByStudent[studentId];
        const isConnected = !!connection?.is_active;
        const lastSync = connection?.last_sync_at ? new Date(connection.last_sync_at) : null;
        const isStale = lastSync ? Date.now() - lastSync.getTime() > 24 * 60 * 60 * 1000 : true;
        const recentFailed = failedLogsByStudent[studentId] || 0;

        result[studentId] = {
          ouraMetrics: latestMetricsByStudent[studentId] || null,
          importantObservations: observationsByStudent[studentId] || [],
          ouraStatus: {
            isConnected,
            hasIssues: isConnected && (recentFailed > 0 || isStale),
          },
        };
      });

      return result;
    },
  });
};
