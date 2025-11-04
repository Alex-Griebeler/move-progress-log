import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const OuraSyncStatusCard = () => {
  const { data: syncStatus, isLoading } = useQuery({
    queryKey: ["oura-sync-status"],
    queryFn: async () => {
      // Busca status de todas as conexões ativas
      const { data: connections, error } = await supabase
        .from("oura_connections")
        .select(`
          student_id,
          last_sync_at,
          is_active,
          students (
            name
          )
        `)
        .eq("is_active", true);

      if (error) throw error;

      // Busca logs recentes
      const { data: recentLogs } = await supabase
        .from("oura_sync_logs")
        .select("*")
        .order("sync_time", { ascending: false })
        .limit(10);

      return {
        connections: connections || [],
        recentLogs: recentLogs || [],
      };
    },
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status de Sincronização</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const activeConnections = syncStatus?.connections || [];
  const recentLogs = syncStatus?.recentLogs || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "retrying":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      failed: "destructive",
      retrying: "secondary",
    };
    return variants[status] || "outline";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Status de Sincronização Automática
        </CardTitle>
        <CardDescription>
          Sincronização diária automática configurada para 10h (horário de Brasília)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conexões Ativas */}
        <div>
          <h4 className="font-medium mb-2">
            Conexões Ativas ({activeConnections.length})
          </h4>
          {activeConnections.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nenhum aluno conectado ao Oura Ring
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {activeConnections.map((conn: any) => (
                <div
                  key={conn.student_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{conn.students?.name}</p>
                    {conn.last_sync_at && (
                      <p className="text-xs text-muted-foreground">
                        Última sync:{" "}
                        {formatDistanceToNow(new Date(conn.last_sync_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>
                  <Badge variant={conn.last_sync_at ? "default" : "secondary"}>
                    {conn.last_sync_at ? "Sincronizado" : "Aguardando"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logs Recentes */}
        <div>
          <h4 className="font-medium mb-2">Histórico Recente</h4>
          {recentLogs.length === 0 ? (
            <Alert>
              <AlertDescription>Nenhum log de sincronização ainda</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {recentLogs.slice(0, 5).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 text-sm border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.sync_time).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <Badge variant={getStatusBadge(log.status)} className="text-xs">
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informações */}
        <Alert>
          <AlertDescription className="text-xs">
            <strong>Automação configurada:</strong> O sistema sincroniza automaticamente
            os dados do Oura Ring todos os dias às 10h. Você também pode sincronizar
            manualmente usando o botão "Sincronizar Todos Agora".
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
