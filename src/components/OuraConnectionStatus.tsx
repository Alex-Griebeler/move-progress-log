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

  // Se tem conexão mas não tem métricas, pode haver problema
  if (!metrics?.readiness_score && !metrics?.sleep_score && !metrics?.activity_score) {
    return (
      <Alert variant="default" className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          Conectado ao Oura Ring, aguardando sincronização de dados.
        </AlertDescription>
      </Alert>
    );
  }

  // Se tem métricas mas algumas estão faltando, mostrar aviso discreto
  const missingMetrics = [];
  if (!metrics.readiness_score) missingMetrics.push("Prontidão");
  if (!metrics.sleep_score) missingMetrics.push("Sono");
  if (!metrics.activity_score) missingMetrics.push("Atividade");

  if (missingMetrics.length > 0) {
    return (
      <Alert variant="default" className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          Alguns dados do Oura Ring ainda não foram sincronizados: {missingMetrics.join(", ")}
        </AlertDescription>
      </Alert>
    );
  }

  // Tudo OK
  return (
    <Alert variant="default" className="border-green-200 bg-green-50">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800 text-sm">
        Dados do Oura Ring sincronizados com sucesso
      </AlertDescription>
    </Alert>
  );
};
