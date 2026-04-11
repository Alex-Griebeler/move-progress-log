import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
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
  const [showDetails, setShowDetails] = useState(false);
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
        status: metrics.readiness_score !== null ? "success" : "empty",
        details: metrics.readiness_score 
          ? `Score: ${metrics.readiness_score}, HRV: ${metrics.hrv_balance ?? 'N/A'}`
          : "API retorna 200 mas sem dados",
      },
      {
        name: "Daily Sleep",
        description: "/v2/usercollection/daily_sleep",
        status: metrics.sleep_score !== null ? "success" : "empty",
        details: metrics.sleep_score
          ? `Score: ${metrics.sleep_score}`
          : "API retorna 200 mas sem dados",
      },
      {
        name: "Sleep Periods (Detalhes)",
        description: "/v2/usercollection/sleep",
        status: metrics.total_sleep_duration !== null ? "success" : "empty",
        details: metrics.total_sleep_duration !== null
          ? `Total: ${Math.round(metrics.total_sleep_duration / 3600)}h, Deep: ${Math.round((metrics.deep_sleep_duration ?? 0) / 3600)}h, REM: ${Math.round((metrics.rem_sleep_duration ?? 0) / 3600)}h`
          : "⚠️ API retorna 200 mas count: 0 (SEM PERÍODOS DE SONO)",
      },
      {
        name: "Daily Activity",
        description: "/v2/usercollection/daily_activity",
        status: metrics.activity_score !== null || metrics.steps !== null ? "success" : "empty",
        details: metrics.steps !== null
          ? `Steps: ${metrics.steps}, Score: ${metrics.activity_score ?? 'N/A'}`
          : "API retorna 200 mas sem dados",
      },
      {
        name: "Heartrate",
        description: "/v2/usercollection/heartrate",
        status: metrics.resting_heart_rate !== null ? "success" : "empty",
        details: metrics.resting_heart_rate !== null
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
          ? `Summary: ${metrics.day_summary}, High: ${metrics.stress_high_time ?? 0}s`
          : "API retorna 200 mas sem dados",
      },
      {
        name: "SpO2",
        description: "/v2/usercollection/daily_spo2",
        status: metrics.spo2_average !== null ? "success" : "empty",
        details: metrics.spo2_average !== null
          ? `Avg: ${metrics.spo2_average.toFixed(1)}%, BDI: ${metrics.breathing_disturbance_index ?? 'N/A'}`
          : "API retorna 200 mas sem dados",
      },
      {
        name: "VO2 Max",
        description: "/v2/usercollection/vo2_max",
        status: metrics.vo2_max !== null ? "success" : "empty",
        details: metrics.vo2_max !== null
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
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <AlertCircle className="h-5 w-5 text-primary" />
            Integração Oura não configurada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              Para visualizar diagnósticos detalhados da API Oura, é necessário:
            </p>
            <ol className="space-y-2 list-decimal list-inside text-muted-foreground ml-2">
              <li>Conectar o Oura Ring do aluno através do perfil</li>
              <li>Realizar a primeira sincronização de dados</li>
              <li>Aguardar o processamento das métricas (pode levar alguns minutos)</li>
            </ol>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Os dados serão atualizados automaticamente após a configuração inicial.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔍 Diagnóstico API Oura</span>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500">{successCount} OK</Badge>
            <Badge className="bg-yellow-500">{emptyCount} Vazios</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Status de cada endpoint da API Oura • Última sincronização:{" "}
          {metrics.date ? new Date(metrics.date).toLocaleDateString('pt-BR') : 'N/A'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDetails && (
          <>
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

            <div className="p-md rounded-radius-lg bg-muted">
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
              <div className="space-y-2">
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
          </>
        )}
      </CardContent>
    </Card>
  );
};
