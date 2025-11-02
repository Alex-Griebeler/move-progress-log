import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Wind, Shield, TrendingUp, Calendar } from "lucide-react";
import { OuraMetrics } from "@/hooks/useOuraMetrics";
import { translateResilience } from "@/utils/ouraTranslations";
import { formatLocalDate } from "@/utils/dateUtils";

interface OuraAdvancedMetricsCardProps {
  metrics: OuraMetrics;
}

const getVo2MaxLevel = (vo2: number | null) => {
  if (!vo2) return { label: "Sem dados", variant: "secondary" as const };
  if (vo2 >= 50) return { label: "Excelente", variant: "default" as const };
  if (vo2 >= 42) return { label: "Bom", variant: "outline" as const };
  if (vo2 >= 35) return { label: "Moderado", variant: "secondary" as const };
  return { label: "Baixo", variant: "destructive" as const };
};

const getResilienceColor = (level: string | null) => {
  if (!level) return "secondary";
  const lower = level.toLowerCase();
  if (lower === "strong") return "default";
  if (lower === "solid" || lower === "adequate") return "outline";
  return "secondary";
};

const getResilienceLabel = (level: string | null) => {
  return translateResilience(level);
};

const getSpo2Status = (spo2: number | null) => {
  if (!spo2) return { label: "Sem dados", variant: "secondary" as const };
  if (spo2 >= 95) return { label: "Normal", variant: "default" as const };
  if (spo2 >= 90) return { label: "Atenção", variant: "outline" as const };
  return { label: "Baixo", variant: "destructive" as const };
};

export const OuraAdvancedMetricsCard = ({ metrics }: OuraAdvancedMetricsCardProps) => {
  const vo2Level = getVo2MaxLevel(metrics.vo2_max);
  const spo2Status = getSpo2Status(metrics.spo2_average);

  const hasData = metrics.vo2_max || metrics.spo2_average || metrics.breathing_disturbance_index || metrics.resilience_level;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas Avançadas</CardTitle>
          <CardDescription>Nenhuma métrica avançada disponível ainda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Estas métricas são calculadas periodicamente pelo Oura Ring:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li><strong>VO2 Max:</strong> Requer treinos cardiovasculares específicos (corrida, ciclismo)</li>
            <li><strong>SpO2:</strong> Medido durante o sono, disponível após 1-2 dias</li>
            <li><strong>Índice Respiratório:</strong> Calculado com base nos dados de sono</li>
            <li><strong>Resiliência:</strong> Tendência baseada em 2+ semanas de dados</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            💡 Continue usando o anel e sincronizando diariamente para ver estas métricas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{formatLocalDate(metrics.date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Métricas Avançadas</CardTitle>
        </div>
        <CardDescription>
          Indicadores cardiovasculares e de resiliência
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* VO2 Max */}
        {metrics.vo2_max ? (
          <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
            <div className="p-3 rounded-full bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">VO2 Max</p>
                <Badge variant={vo2Level.variant}>{vo2Level.label}</Badge>
              </div>
              <p className="text-3xl font-bold">{metrics.vo2_max.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ml/kg/min - Capacidade aeróbica máxima
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-dashed bg-muted/30">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">VO2 Max não disponível</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Realize um treino cardiovascular intenso (corrida, ciclismo) para calcular
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SpO2 Average */}
        {metrics.spo2_average && (
          <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
            <div className="p-3 rounded-full bg-primary/10">
              <Wind className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">Saturação de Oxigênio (SpO2)</p>
                <Badge variant={spo2Status.variant}>{spo2Status.label}</Badge>
              </div>
              <p className="text-3xl font-bold">{metrics.spo2_average.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Média durante o sono
              </p>
            </div>
          </div>
        )}

        {/* Breathing Disturbance Index */}
        {metrics.breathing_disturbance_index !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Índice de Distúrbio Respiratório</p>
              <Badge variant={metrics.breathing_disturbance_index < 5 ? "default" : "outline"}>
                {metrics.breathing_disturbance_index.toFixed(1)}
              </Badge>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  metrics.breathing_disturbance_index < 5 ? 'bg-primary' : 'bg-chart-2'
                }`}
                style={{ width: `${Math.min(metrics.breathing_disturbance_index * 10, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.breathing_disturbance_index < 5 
                ? "Normal - Respiração regular durante o sono" 
                : "Atenção - Considere avaliação médica se persistir"
              }
            </p>
          </div>
        )}

        {/* Resilience Level */}
        {metrics.resilience_level && (
          <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
            <div className="p-3 rounded-full bg-chart-4/10">
              <Shield className="h-6 w-6 text-chart-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">Nível de Resiliência</p>
                <Badge variant={getResilienceColor(metrics.resilience_level)}>
                  {getResilienceLabel(metrics.resilience_level)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Capacidade do corpo de se adaptar ao estresse e treino
              </p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {metrics.vo2_max && metrics.vo2_max < 35 && (
          <div className="p-3 bg-secondary border rounded-lg">
            <p className="text-sm text-secondary-foreground font-medium mb-1">
              💡 Dica: VO2 Max abaixo do ideal
            </p>
            <p className="text-xs text-muted-foreground">
              Considere aumentar gradualmente a intensidade e volume de treinos cardiovasculares.
            </p>
          </div>
        )}

        {metrics.breathing_disturbance_index && metrics.breathing_disturbance_index >= 15 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium mb-1">
              ⚠️ Alerta: Distúrbio respiratório elevado
            </p>
            <p className="text-xs text-destructive/80">
              Recomenda-se avaliação médica para possível apneia do sono.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
