import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Footprints, Flame, Clock, TrendingUp, Calendar } from "lucide-react";
import { OuraMetrics } from "@/hooks/useOuraMetrics";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { LazyChart } from "./LazyChart";
import { formatLocalDate } from "@/utils/dateUtils";

interface OuraActivityCardProps {
  metrics: OuraMetrics;
}

const getScoreColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 85) return "text-primary";
  if (score >= 70) return "text-secondary-foreground";
  return "text-destructive";
};

const getScoreLabel = (score: number | null) => {
  if (!score) return "Sem dados";
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Bom";
  return "Baixo";
};

const formatTime = (seconds: number | null) => {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const OuraActivityCard = ({ metrics }: OuraActivityCardProps) => {
  // Check if we have any activity data
  const hasActivityData = metrics.steps || metrics.active_calories || metrics.activity_score;
  
  if (!hasActivityData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Atividade Diária</CardTitle>
          </div>
          <CardDescription>
            Sem dados de atividade registrados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Os dados de atividade não estão disponíveis para este dia. Possíveis motivos:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>O anel não foi usado durante o dia</li>
            <li>Dados ainda não processados (disponíveis após 24h)</li>
            <li>O anel não foi sincronizado com o app Oura</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            💡 Use o anel durante todo o dia e sincronize-o regularmente.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const activityData = [
    { name: "Alta", value: metrics.high_activity_time || 0, color: "hsl(var(--destructive))" },
    { name: "Média", value: metrics.medium_activity_time || 0, color: "hsl(var(--chart-2))" },
    { name: "Baixa", value: metrics.low_activity_time || 0, color: "hsl(var(--chart-3))" },
    { name: "Sedentário", value: metrics.sedentary_time || 0, color: "hsl(var(--muted))" },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          {metrics.date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{formatLocalDate(metrics.date)}</span>
            </div>
          )}
          {metrics.activity_score && (
            <Badge className={getScoreColor(metrics.activity_score)}>
              {metrics.activity_score} - {getScoreLabel(metrics.activity_score)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Atividade Diária</CardTitle>
        </div>
        <CardDescription>
          Métricas de atividade e movimento do dia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Steps and Calories */}
        <div className="grid grid-cols-2 gap-md">
          <div className="flex items-center gap-md p-md rounded-radius-lg bg-card border">
            <Footprints className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Passos</p>
              <p className="text-2xl font-bold">{metrics.steps?.toLocaleString() || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-md p-md rounded-radius-lg bg-card border">
            <Flame className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">Calorias Ativas</p>
              <p className="text-2xl font-bold">{metrics.active_calories ? `${metrics.active_calories} kcal` : "—"}</p>
            </div>
          </div>
        </div>

        {/* Total Calories and MET */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Calorias Totais</p>
            <p className="text-xl font-semibold">{metrics.total_calories || "—"} kcal</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Equivalente Caminhada</p>
            <p className="text-xl font-semibold">{metrics.met_minutes ? `${(metrics.met_minutes / 1000).toFixed(1)} km` : "—"}</p>
          </div>
        </div>

        {/* Training Metrics */}
        {(metrics.training_volume || metrics.training_frequency) && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Volume de Treino</p>
                <Badge variant="outline">{metrics.training_volume || "—"}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Frequência</p>
                <Badge variant="outline">{metrics.training_frequency || "—"}</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Activity Time Distribution */}
        {activityData.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-3">Distribuição do Tempo</p>
            <LazyChart height={120}>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={activityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                    >
                      {activityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {activityData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{formatTime(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </LazyChart>
          </div>
        )}

        {/* Sedentary Warning */}
        {metrics.sedentary_time && metrics.sedentary_time > 28800 && (
          <div className="p-md rounded-radius-lg bg-secondary border">
            <p className="text-sm text-secondary-foreground">
              ⚠️ Tempo sedentário elevado: {formatTime(metrics.sedentary_time)}. Considere pausas ativas a cada hora.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
