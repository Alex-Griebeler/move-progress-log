import { useState } from "react";
import { RefreshCw, Unlink, Link2, Info, CheckCircle2, AlertCircle, WifiOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useOuraConnection,
  useSyncOura,
  useDisconnectOura,
} from "@/hooks/useOuraConnection";
import { useLatestOuraMetrics } from "@/hooks/useOuraMetrics";
import { useOuraConnectionStatus } from "@/hooks/useOuraConnectionStatus";
import { parseDateOnly } from "@/utils/ouraFreshness";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";
import { SendOuraConnectDialog } from "@/components/SendOuraConnectDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { buildErrorDescription } from "@/utils/errorParsing";
import { formatDateSP, formatTimeSP } from "@/utils/displayFormat";

interface OuraConnectionCardProps {
  studentId: string;
  studentName?: string;
}

export const OuraConnectionCard = ({ studentId, studentName }: OuraConnectionCardProps) => {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showOuraConnectDialog, setShowOuraConnectDialog] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [syncError, setSyncError] = useState<string | null>(null);

  const { data: connection, isLoading, isFetching } = useOuraConnection(studentId, {
    pollUntilConnected: true,
    refetchIntervalMs: 5000,
  });
  const { data: latestMetrics } = useLatestOuraMetrics(studentId);
  const {
    data: connectionStatus,
    isLoading: statusLoading,
    isError: statusError,
  } = useOuraConnectionStatus(studentId);
  const syncOura = useSyncOura();
  const disconnectOura = useDisconnectOura();
  const isOnline = useOfflineDetection();

  const handleSync = () => {
    setSyncProgress(0);
    setSyncStatus("Iniciando sincronização…");
    setSyncError(null); // Limpar erro anterior
    
    const syncToastId = toast.loading("Iniciando sincronização do Oura Ring…", {
      description: "Conectando com a API do Oura"
    });
    
    syncOura.mutate(
      { 
        student_id: studentId,
        days: 7,
        onProgress: (current, total) => {
          setSyncProgress((current / total) * 100);
          const statusMsg = `Sincronizando dia ${current} de ${total}…`;
          setSyncStatus(statusMsg);
          
          toast.loading(statusMsg, {
            id: syncToastId,
            description: `${Math.round((current / total) * 100)}% concluído`
          });
        }
      },
      {
        onSuccess: () => {
          setSyncProgress(100);
          setSyncStatus("Sincronização concluída");
          setSyncError(null);
          
          // O feedback consolidado (dias com dados / sem dados) vem do hook useSyncOura.
          toast.dismiss(syncToastId);
          
          setTimeout(() => {
            setSyncProgress(0);
            setSyncStatus("");
          }, 2000);
        },
        onError: (error) => {
          setSyncProgress(0);
          setSyncStatus("");
          setSyncError(error instanceof Error ? error.message : String(error));
          
          toast.dismiss(syncToastId);
          toast.error("Erro ao sincronizar Oura Ring", {
            description: buildErrorDescription(error, "Não foi possível conectar com a API do Oura. Tente novamente."),
            duration: 7000,
          });
          
          // Limpar erro automaticamente após 10 segundos
          setTimeout(() => setSyncError(null), 10000);
        }
      }
    );
  };

  const handleDisconnect = () => {
    const disconnectToastId = toast.loading("Desconectando Oura Ring…", {
      description: "Removendo conexão"
    });
    
    disconnectOura.mutate(studentId, {
      onSuccess: () => {
        toast.dismiss(disconnectToastId);
        toast.success("Oura Ring desconectado", {
          description: "Os dados sincronizados foram preservados no sistema.",
        });
        setShowDisconnectDialog(false);
      },
      onError: (error: Error) => {
        toast.dismiss(disconnectToastId);
        toast.error("Erro ao desconectar", {
          description: buildErrorDescription(error, "Não foi possível desconectar o Oura Ring. Tente novamente."),
        });
      }
    });
  };

  const handleConnect = () => {
    setShowOuraConnectDialog(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conexão Oura Ring</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Conexão Oura Ring</span>
            {connection && (
              <Badge variant="outline" className="border-success/40 font-normal text-success">
                Conectado
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!connection ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {isFetching ? "Verificando aceite do convite Oura…" : "Oura Ring não conectado"}
              </p>
              <Button
                variant="outline"
                onClick={handleConnect}
                className="w-full"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Conectar via convite
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Alerta de modo offline */}
              {!isOnline && (
                <Alert variant="destructive">
                  <WifiOff className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold">Você está offline</p>
                    <p className="text-sm">
                      Mostrando dados em cache. Conecte-se à internet para
                      sincronizar novos dados.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Alerta de erro persistente com botão "Tentar novamente" */}
              {syncError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold">Erro na sincronização</p>
                    <p className="text-sm mb-2">{syncError}</p>
                    <Button
                      variant="outline"
                      onClick={handleSync}
                      disabled={syncOura.isPending}
                      className="mt-1"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Tentar novamente
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {!latestMetrics && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-1">Oura Ring conectado</p>
                    <p className="text-sm">
                      Ainda sem dados. O Oura processa as métricas depois que o anel
                      sincroniza pela manhã, o que pode levar algumas horas; se nada
                      aparecer, sincronize de novo à tarde.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
              {connection.last_sync_at && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Última tentativa de sincronização:{" "}
                    {formatDateSP(connection.last_sync_at, true)} às{" "}
                    {formatTimeSP(connection.last_sync_at)}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="oura-last-real-data">
                    Último dado real (sono/prontidão):{" "}
                    {statusError
                      ? "não foi possível verificar"
                      : statusLoading || !connectionStatus
                        ? "verificando…"
                        : connectionStatus.lastRealDataDate
                          ? format(parseDateOnly(connectionStatus.lastRealDataDate), "dd/MM/yyyy", { locale: ptBR })
                          : "nenhum ainda"}
                  </p>
                  {connectionStatus?.summary && connectionStatus.hasIssues && (
                    <p className="text-xs text-warning">{connectionStatus.summary}</p>
                  )}
                  {latestMetrics && (
                    <p className="text-xs text-muted-foreground">
                      Última linha registrada: {format(parseDateOnly(latestMetrics.date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              )}
              {syncOura.isPending && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{syncStatus}</span>
                    <span className="text-muted-foreground">{Math.round(syncProgress)}%</span>
                  </div>
                  <Progress value={syncProgress} className="h-2" />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncOura.isPending}
                  className="flex-1"
                  aria-label="Sincronizar dados do Oura Ring dos últimos 7 dias"
                  title="Sincronizar dados do Oura Ring dos últimos 7 dias"
                >
                  {syncOura.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      Sincronizando…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                      Sincronizar últimos 7 dias
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDisconnectDialog(true)}
                  disabled={disconnectOura.isPending || syncOura.isPending}
                  aria-label="Desconectar Oura Ring"
                  title="Desconectar Oura Ring"
                >
                  <Unlink className="h-4 w-4 mr-2" aria-hidden="true" />
                  Desconectar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar o Oura Ring{studentName ? ` de ${studentName}` : ""}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Os dados já sincronizados ficam preservados, mas novos dados deixam
                de chegar. Para reconectar será preciso enviar um novo convite.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnectOura.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleDisconnect}
              disabled={disconnectOura.isPending}
            >
              {disconnectOura.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desconectando…
                </>
              ) : (
                "Desconectar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SendOuraConnectDialog
        open={showOuraConnectDialog}
        onOpenChange={setShowOuraConnectDialog}
        studentId={studentId}
        studentName={studentName ?? "a pessoa"}
      />
    </>
  );
};
