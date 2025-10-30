import { useState } from "react";
import { RefreshCw, Unlink, Link2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

  const { data: connection, isLoading } = useOuraConnection(studentId);
  const { data: latestMetrics } = useLatestOuraMetrics(studentId);
  const syncOura = useSyncOura();
  const disconnectOura = useDisconnectOura();

  const handleSync = () => {
    syncOura.mutate({ student_id: studentId });
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
                    Oura Ring conectado! Aguardando sincronização de dados...
                    Os dados são processados pelo Oura após você acordar e sincronizar seu anel.
                    Tente sincronizar novamente mais tarde.
                  </AlertDescription>
                </Alert>
              )}
              {connection.last_sync_at && (
                <p className="text-sm text-muted-foreground">
                  Última sincronização:{" "}
                  {format(
                    new Date(connection.last_sync_at),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR }
                  )}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncOura.isPending}
                  className="flex-1"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      syncOura.isPending ? "animate-spin" : ""
                    }`}
                  />
                  {syncOura.isPending ? "Sincronizando..." : "Sincronizar"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDisconnectDialog(true)}
                  disabled={disconnectOura.isPending}
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
            <AlertDialogDescription>
              Isso impedirá a sincronização automática dos dados do Oura Ring.
              Os dados já sincronizados não serão removidos.
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
