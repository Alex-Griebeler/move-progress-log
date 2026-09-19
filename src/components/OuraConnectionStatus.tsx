import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useLatestOuraMetrics } from "@/hooks/useOuraMetrics";

interface OuraConnectionStatusProps {
  studentId: string;
  hasConnection: boolean;
}

export const OuraConnectionStatus = ({ studentId, hasConnection }: OuraConnectionStatusProps) => {
  const { data: metrics } = useLatestOuraMetrics(studentId);

  if (!hasConnection) {
    return null;
  }

  // Se tem conexão mas não tem métricas (ou nenhuma linha ainda), aguardando
  // sync. O guard de !metrics evita crash: `metrics?.x === null` é false pra
  // undefined e o código seguia pra `metrics.readiness_score` sem objeto.
  if (
    !metrics ||
    (metrics.readiness_score === null &&
      metrics.sleep_score === null &&
      metrics.activity_score === null)
  ) {
    return (
      <Alert variant="default" className="border-warning/40 bg-warning/10">
        <AlertCircle className="h-4 w-4 text-warning" aria-hidden />
        <AlertDescription className="text-sm text-foreground">
          Conectado ao Oura Ring, aguardando sincronização de dados.
        </AlertDescription>
      </Alert>
    );
  }

  // Se tem métricas mas algumas estão faltando, mostrar aviso discreto
  const missingMetrics = [];
  if (metrics.readiness_score === null) missingMetrics.push("Prontidão");
  if (metrics.sleep_score === null) missingMetrics.push("Sono");
  if (metrics.activity_score === null) missingMetrics.push("Atividade");

  if (missingMetrics.length > 0) {
    return (
      <Alert variant="default" className="border-info/40 bg-info/10">
        <AlertCircle className="h-4 w-4 text-info" aria-hidden />
        <AlertDescription className="text-sm text-foreground">
          Ainda sem sincronizar: {missingMetrics.join(", ")}.
        </AlertDescription>
      </Alert>
    );
  }

  // Tudo OK
  return (
    <Alert variant="default" className="border-success/40 bg-success/10">
      <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
      <AlertDescription className="text-sm text-foreground">
        Dados do Oura Ring sincronizados
      </AlertDescription>
    </Alert>
  );
};
