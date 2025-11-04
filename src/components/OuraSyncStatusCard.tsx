import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const OuraSyncStatusCard = () => {
  const { data: syncStatus, isLoading } = useQuery({
    queryKey: ["oura-sync-status"],
    queryFn: async () => {
      const { data: connections, error } = await supabase
        .from("oura_connections")
        .select("student_id, last_sync_at")
        .eq("is_active", true);

      if (error) throw error;

      const { data: recentLogs } = await supabase
        .from("oura_sync_logs")
        .select("status")
        .gte("sync_time", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("sync_time", { ascending: false });

      return {
        totalConnections: connections?.length || 0,
        recentSuccess: recentLogs?.filter(l => l.status === 'success').length || 0,
        recentFailed: recentLogs?.filter(l => l.status === 'failed').length || 0,
        lastSync: connections?.[0]?.last_sync_at,
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading || !syncStatus || syncStatus.totalConnections === 0) return null;

  const hasIssues = syncStatus.recentFailed > 0;

  return (
    <Alert className={hasIssues ? "border-yellow-500" : ""}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasIssues ? (
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <div>
            <p className="text-sm font-medium">
              Sincronização Oura: {syncStatus.totalConnections} {syncStatus.totalConnections === 1 ? 'aluno' : 'alunos'}
            </p>
            <p className="text-xs text-muted-foreground">
              Última sync automática às 10h • {syncStatus.recentSuccess} sucessos, {syncStatus.recentFailed} falhas (24h)
            </p>
          </div>
        </div>
      </div>
    </Alert>
  );
};
