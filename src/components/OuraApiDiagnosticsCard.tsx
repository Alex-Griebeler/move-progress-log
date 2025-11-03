import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { useLatestOuraMetrics } from "@/hooks/useOuraMetrics";
import { useOuraWorkouts } from "@/hooks/useOuraWorkouts";
import { useOuraSyncLogs } from "@/hooks/useOuraSyncLogs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OuraApiDiagnosticsCardProps {
  studentId: string;
}

interface EndpointStatus {
  name: string;
  description: string;
  status: "success" | "empty" | "missing";
  details: string;
}

export const OuraApiDiagnosticsCard = ({ studentId }: OuraApiDiagnosticsCardProps) => {
  const { data: metrics } = useLatestOuraMetrics(studentId);
  const { data: workouts } = useOuraWorkouts(studentId, 1);
  const { data: syncLogs } = useOuraSyncLogs(studentId, 5);

  const getEndpointStatuses = (): EndpointStatus[] => {
    if (!metrics) {
      return [];
    }

    return [
      {
        name: "Daily Readiness",
        description: "/v2/usercollection/daily_readiness",
        status: metrics.readiness_score ? "success" : "empty",
        details: metrics.readiness_score 
          ? `Score: ${metrics.readiness_score}, HRV: ${metrics.hrv_balance || 'N/A'}`
          : "API retorna 200 mas sem dados",
      },
      {
        name: "Daily Sleep",
        description: "/v2/usercollection/daily_sleep",
        status: metrics.sleep_score ? "success" : "empty",
        details: metrics.sleep_score
          ? `Score: ${metrics.sleep_score}`
          : "API retorna 200 mas sem dados",
      },
      {
        name: "Sleep Periods (Detalhes)",
        description: "/v2/usercollection/sleep",
        status: metrics.total_sleep_duration ? "success" : "empty",
        details: metrics.total_sleep_duration
          ? `Total: ${Math.round(metrics.total_sleep_duration / 3600)}h, Deep: ${Math.round((metrics.deep_sleep_duration || 0) / 3600)}h, REM: ${Math.round((metrics.rem_sleep_duration || 0) / 3600)}h`
          : "⚠️ API retorna 200 mas count: 0 (SEM PERÍODOS DE SONO)",
      },
      {
        name: "Daily Activity",
        description: "/v2/usercollection/daily_activity",
        status: metrics.activity_score || metrics.steps ? "success" : "empty",
        details: metrics.steps
          ? `Steps: ${metrics.steps}, Score: ${metrics.activity_score || 'N/A'}`
          : "API retorna 200 mas sem dados",
      },
      {
        name: "Heartrate",
        description: "/v2/usercollection/heartrate",
        status: metrics.resting_heart_rate ? "success" : "empty",
        details: metrics.resting_heart_rate
          ? `Resting HR: ${metrics.resting_heart_rate} bpm`
          : "API retorna 200 mas sem samples",
      },
      {
        name: "Workouts",
        description: "/v2/usercollection/workout",
        status: workouts && workouts.length > 0 ? "success" : "empty",
        details: workouts && workouts.length > 0
          ? `${workouts.length} workout(s) registrado(s)`
          : "API retorna 200 mas count: 0 (sem workouts)",
      },
      {
        name: "Daily Stress",
        description: "/v2/usercollection/daily_stress",
        status: metrics.stress_high_time !== null || metrics.day_summary ? "success" : "empty",
        details: metrics.day_summary
          ? `Summary: ${metrics.day_summary}, High: ${metrics.stress_high_time || 0}s`
          : "API retorna 200 mas sem dados",
      },
      {
        name: "SpO2",
        description: "/v2/usercollection/daily_spo2",
        status: metrics.spo2_average ? "success" : "empty",
        details: metrics.spo2_average
          ? `Avg: ${metrics.spo2_average.toFixed(1)}%, BDI: ${metrics.breathing_disturbance_index || 'N/A'}`
          : "API retorna 200 mas sem dados",
      },
      {
        name: "VO2 Max",
        description: "/v2/usercollection/vo2_max",
        status: metrics.vo2_max ? "success" : "empty",
        details: metrics.vo2_max
          ? `VO2 Max: ${metrics.vo2_max}`
          : "API retorna 200 mas sem dados",
      },
      {
        name: "Resilience",
        description: "/v2/usercollection/daily_resilience",
        status: metrics.resilience_level ? "success" : "empty",
        details: metrics.resilience_level
          ? `Level: ${metrics.resilience_level}`
          : "API retorna 200 mas sem dados",
      },
    ];
  };

  const statuses = getEndpointStatuses();
  const successCount = statuses.filter(s => s.status === "success").length;
  const emptyCount = statuses.filter(s => s.status === "empty").length;

  const getStatusIcon = (status: EndpointStatus["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "empty":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "missing":
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: EndpointStatus["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">Dados OK</Badge>;
      case "empty":
        return <Badge className="bg-yellow-500">Vazio</Badge>;
      case "missing":
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔍 Diagnóstico API Oura</CardTitle>
          <CardDescription>
            Nenhum dado de sincronização encontrado
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔍 Diagnóstico API Oura</span>
          <div className="flex gap-2">
            <Badge className="bg-green-500">{successCount} OK</Badge>
            <Badge className="bg-yellow-500">{emptyCount} Vazios</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Status de cada endpoint da API Oura • Última sincronização:{" "}
          {metrics.date ? new Date(metrics.date).toLocaleDateString('pt-BR') : 'N/A'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {statuses.map((endpoint) => (
            <div
              key={endpoint.name}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="mt-0.5">
                {getStatusIcon(endpoint.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{endpoint.name}</span>
                  {getStatusBadge(endpoint.status)}
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {endpoint.description}
                </p>
                <p className="text-xs text-foreground">
                  {endpoint.details}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted">
          <p className="text-xs text-muted-foreground">
            <strong>📌 Problema principal identificado:</strong> O endpoint{" "}
            <code className="bg-background px-1 py-0.5 rounded">
              /v2/usercollection/sleep
            </code>{" "}
            retorna status 200 mas com <code className="bg-background px-1 py-0.5 rounded">count: 0</code>,
            indicando que a API do Oura não está retornando os períodos de sono detalhados.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>Possíveis causas:</strong>
          </p>
          <ul className="text-xs text-muted-foreground mt-1 ml-4 space-y-1">
            <li>• Oura Ring não sincronizou com o app oficial</li>
            <li>• Dados ainda sendo processados pelo Oura (pode demorar horas)</li>
            <li>• Configurações da conta Oura ou permissões OAuth</li>
          </ul>
        </div>

        {/* Histórico de Sincronizações */}
        {syncLogs && syncLogs.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold">📋 Histórico de Sincronizações</h4>
            <div className="space-y-2">
              {syncLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 p-2 rounded-lg border bg-card text-xs"
                >
                  <div className="mt-0.5">
                    {log.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                    {log.status === 'retrying' && <Clock className="h-4 w-4 text-yellow-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {format(new Date(log.sync_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <Badge 
                        className={
                          log.status === 'success' ? 'bg-green-500' :
                          log.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                        }
                      >
                        {log.status === 'success' ? 'Sucesso' :
                         log.status === 'failed' ? 'Falhou' : 'Tentando'}
                      </Badge>
                      {log.attempt_number > 1 && (
                        <span className="text-muted-foreground">
                          (Tentativa {log.attempt_number})
                        </span>
                      )}
                    </div>
                    {log.error_message && (
                      <p className="text-red-500 mt-1">{log.error_message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
