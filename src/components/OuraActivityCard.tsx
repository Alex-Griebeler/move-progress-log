import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Footprints, Flame, Clock, TrendingUp } from "lucide-react";
import { OuraMetrics } from "@/hooks/useOuraMetrics";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface OuraActivityCardProps {
  metrics: OuraMetrics;
}

const getScoreColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 85) return "text-green-500";
  if (score >= 70) return "text-yellow-500";
  return "text-red-500";
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
  const activityData = [
    { name: "Alta", value: metrics.high_activity_time || 0, color: "#ef4444" },
    { name: "Média", value: metrics.medium_activity_time || 0, color: "#f59e0b" },
    { name: "Baixa", value: metrics.low_activity_time || 0, color: "#10b981" },
    { name: "Sedentário", value: metrics.sedentary_time || 0, color: "#6b7280" },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Atividade Diária</CardTitle>
          </div>
          {metrics.activity_score && (
            <Badge className={getScoreColor(metrics.activity_score)}>
              {metrics.activity_score} - {getScoreLabel(metrics.activity_score)}
            </Badge>
          )}
        </div>
        <CardDescription>
          Métricas de atividade e movimento do dia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Steps and Calories */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <Footprints className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Passos</p>
              <p className="text-2xl font-bold">{metrics.steps?.toLocaleString() || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <Flame className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Calorias Ativas</p>
              <p className="text-2xl font-bold">{metrics.active_calories || "—"}</p>
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
            <p className="text-sm text-muted-foreground">MET (minutos)</p>
            <p className="text-xl font-semibold">{metrics.met_minutes || "—"}</p>
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
          </div>
        )}

        {/* Sedentary Warning */}
        {metrics.sedentary_time && metrics.sedentary_time > 43200 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Tempo sedentário elevado: {formatTime(metrics.sedentary_time)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
