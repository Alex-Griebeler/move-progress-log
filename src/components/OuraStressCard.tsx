import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingDown, TrendingUp } from "lucide-react";
import { OuraMetrics } from "@/hooks/useOuraMetrics";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface OuraStressCardProps {
  metrics: OuraMetrics;
}

const getDaySummaryColor = (summary: string | null) => {
  if (!summary) return "secondary";
  const lower = summary.toLowerCase();
  if (lower.includes("restored") || lower.includes("good")) return "default";
  if (lower.includes("normal")) return "outline";
  return "destructive";
};

const getDaySummaryLabel = (summary: string | null) => {
  if (!summary) return "Sem dados";
  return summary.charAt(0).toUpperCase() + summary.slice(1);
};

const formatTime = (seconds: number | null) => {
  if (!seconds) return "0h 0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export const OuraStressCard = ({ metrics }: OuraStressCardProps) => {
  const stressData = [
    { 
      name: "Estresse Alto", 
      value: (metrics.stress_high_time || 0) / 60, 
      fill: "#ef4444" 
    },
    { 
      name: "Recuperação Alta", 
      value: (metrics.recovery_high_time || 0) / 60, 
      fill: "#10b981" 
    },
  ].filter(item => item.value > 0);

  const totalTime = (metrics.stress_high_time || 0) + (metrics.recovery_high_time || 0);
  const stressPercentage = totalTime > 0 
    ? ((metrics.stress_high_time || 0) / totalTime * 100).toFixed(0)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Estresse e Recuperação</CardTitle>
          </div>
          {metrics.day_summary && (
            <Badge variant={getDaySummaryColor(metrics.day_summary)}>
              {getDaySummaryLabel(metrics.day_summary)}
            </Badge>
          )}
        </div>
        <CardDescription>
          Balanço entre estresse e recuperação do dia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stress Balance Overview */}
        {totalTime > 0 && (
          <div className="p-4 rounded-lg bg-card border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Balanço Estresse/Recuperação</p>
              <Badge variant={Number(stressPercentage) > 50 ? "destructive" : "default"}>
                {stressPercentage}% estresse
              </Badge>
            </div>
            <div className="w-full h-4 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all"
                style={{ width: `${stressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Time Distribution Chart */}
        {stressData.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-3">Distribuição do Tempo (minutos)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stressData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${Math.round(value)} min`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detailed Time Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <TrendingUp className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Tempo em Estresse Alto</p>
              <p className="text-xl font-bold">{formatTime(metrics.stress_high_time)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <TrendingDown className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Tempo em Recuperação Alta</p>
              <p className="text-xl font-bold">{formatTime(metrics.recovery_high_time)}</p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {metrics.stress_high_time && metrics.stress_high_time > 7200 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-1">
              ⚠️ Nível de estresse elevado detectado
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Considere técnicas de relaxamento, meditação ou reduzir a intensidade do treino.
            </p>
          </div>
        )}

        {metrics.recovery_high_time && metrics.recovery_high_time > 14400 && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
              ✓ Excelente recuperação detectada - momento ideal para treinos intensos!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
