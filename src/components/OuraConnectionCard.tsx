import { useState } from "react";
import { RefreshCw, Unlink, Link2, Info, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OuraConnectionCardProps {
  studentId: string;
}

export const OuraConnectionCard = ({ studentId }: OuraConnectionCardProps) => {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string>("");

  const { data: connection, isLoading } = useOuraConnection(studentId);
  const { data: latestMetrics } = useLatestOuraMetrics(studentId);
  const syncOura = useSyncOura();
  const disconnectOura = useDisconnectOura();

  const handleSync = () => {
    setSyncProgress(0);
    setSyncStatus("Iniciando sincronização...");
    
    syncOura.mutate(
      { 
        student_id: studentId,
        days: 7,
        onProgress: (current, total) => {
          setSyncProgress((current / total) * 100);
          setSyncStatus(`Sincronizando dia ${current} de ${total}...`);
        }
      },
      {
        onSuccess: () => {
          setSyncProgress(100);
          setSyncStatus("Sincronização concluída!");
          setTimeout(() => {
            setSyncProgress(0);
            setSyncStatus("");
          }, 2000);
        },
        onError: () => {
          setSyncProgress(0);
          setSyncStatus("");
        }
      }
    );
  };

  const handleDisconnect = () => {
    disconnectOura.mutate(studentId);
    setShowDisconnectDialog(false);
  };

  const handleConnect = () => {
    // This would typically initiate OAuth flow from trainer side
    // For now, we'll show a message that this should be done via invite link
    alert("Para conectar o Oura Ring, gere um link de convite para o aluno.");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conexão Oura Ring</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
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
            {connection && <Badge className="bg-green-500">Conectado</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!connection ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Oura Ring não conectado
              </p>
              <Button
                variant="outline"
                onClick={handleConnect}
                className="w-full"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Conectar via Convite
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {!latestMetrics && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-1">Oura Ring conectado com sucesso!</p>
                    <p className="text-sm">
                      Aguardando dados disponíveis. O Oura Ring processa suas métricas após:
                    </p>
                    <ul className="text-sm mt-2 space-y-1 ml-4">
                      <li>• Você acordar e sincronizar seu anel</li>
                      <li>• O processamento completo dos dados (pode levar algumas horas)</li>
                    </ul>
                    <p className="text-sm mt-2">
                      💡 Tente sincronizar novamente após o meio-dia ou ao final do dia.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
              {connection.last_sync_at && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Última sincronização:{" "}
                    {format(
                      new Date(connection.last_sync_at),
                      "dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR }
                    )}
                  </p>
                  {latestMetrics && (
                    <p className="text-xs text-muted-foreground">
                      Última métrica: {format(new Date(latestMetrics.date), "dd/MM/yyyy", { locale: ptBR })}
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
                >
                  {syncOura.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sincronizar últimos 7 dias
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDisconnectDialog(true)}
                  disabled={disconnectOura.isPending || syncOura.isPending}
                >
                  <Unlink className="h-4 w-4 mr-2" />
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
            <AlertDialogTitle>Desconectar Oura Ring?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Ao desconectar o Oura Ring:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>✓ Seus dados já sincronizados serão preservados</li>
                <li>✗ Novos dados não serão mais sincronizados automaticamente</li>
                <li>↻ Você pode reconectar a qualquer momento através de um novo convite</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect}>
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
