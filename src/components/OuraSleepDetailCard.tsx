import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Moon, Heart, Wind } from "lucide-react";
import { OuraMetrics } from "@/hooks/useOuraMetrics";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface OuraSleepDetailCardProps {
  metrics: OuraMetrics;
}

const getScoreColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 85) return "text-green-500";
  if (score >= 70) return "text-yellow-500";
  return "text-red-500";
};

const getEfficiencyColor = (efficiency: number | null) => {
  if (!efficiency) return "secondary";
  if (efficiency >= 85) return "default";
  if (efficiency >= 75) return "outline";
  return "destructive";
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const formatLatency = (seconds: number | null) => {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
};

export const OuraSleepDetailCard = ({ metrics }: OuraSleepDetailCardProps) => {
  const sleepPhases = [
    { name: "Profundo", value: (metrics.deep_sleep_duration || 0) / 60, fill: "#3b82f6" },
    { name: "REM", value: (metrics.rem_sleep_duration || 0) / 60, fill: "#8b5cf6" },
    { name: "Leve", value: (metrics.light_sleep_duration || 0) / 60, fill: "#10b981" },
    { name: "Acordado", value: (metrics.awake_time || 0) / 60, fill: "#ef4444" },
  ].filter(phase => phase.value > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" />
            <CardTitle>Análise Detalhada do Sono</CardTitle>
          </div>
          {metrics.sleep_score && (
            <Badge className={getScoreColor(metrics.sleep_score)}>
              Score: {metrics.sleep_score}
            </Badge>
          )}
        </div>
        <CardDescription>
          Métricas completas da qualidade do sono
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Sleep Duration */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-card border">
          <div>
            <p className="text-sm text-muted-foreground">Duração Total do Sono</p>
            <p className="text-3xl font-bold">{formatDuration(metrics.total_sleep_duration)}</p>
          </div>
          {metrics.sleep_efficiency && (
            <Badge variant={getEfficiencyColor(metrics.sleep_efficiency)} className="text-base">
              Eficiência: {metrics.sleep_efficiency.toFixed(0)}%
            </Badge>
          )}
        </div>

        {/* Sleep Phases Chart */}
        {sleepPhases.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-3">Fases do Sono (minutos)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sleepPhases}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${Math.round(value)} min`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sleep Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {metrics.sleep_latency !== null && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Latência do Sono</p>
              <p className="text-xl font-semibold">{formatLatency(metrics.sleep_latency)}</p>
            </div>
          )}
          {metrics.lowest_heart_rate !== null && (
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">FC Mínima</p>
                <p className="text-xl font-semibold">{metrics.lowest_heart_rate} bpm</p>
              </div>
            </div>
          )}
          {metrics.average_sleep_hrv !== null && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">HRV Médio</p>
              <p className="text-xl font-semibold">{metrics.average_sleep_hrv.toFixed(1)} ms</p>
            </div>
          )}
          {metrics.average_breath !== null && (
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-blue-500" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Respiração Média</p>
                <p className="text-xl font-semibold">{metrics.average_breath.toFixed(1)} rpm</p>
              </div>
            </div>
          )}
        </div>

        {/* Sleep Quality Indicators */}
        {(metrics.sleep_efficiency || metrics.deep_sleep_duration || metrics.rem_sleep_duration) ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Indicadores de Qualidade</p>
            <div className="flex flex-wrap gap-2">
              {metrics.sleep_efficiency && (
                <Badge variant={metrics.sleep_efficiency >= 85 ? "default" : "secondary"}>
                  Eficiência: {metrics.sleep_efficiency.toFixed(0)}%
                </Badge>
              )}
              {metrics.deep_sleep_duration && (
                <Badge variant={metrics.deep_sleep_duration >= 3600 ? "default" : "secondary"}>
                  Sono Profundo: {formatDuration(metrics.deep_sleep_duration)}
                </Badge>
              )}
              {metrics.rem_sleep_duration && (
                <Badge variant={metrics.rem_sleep_duration >= 5400 ? "default" : "secondary"}>
                  Sono REM: {formatDuration(metrics.rem_sleep_duration)}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
            <p className="text-sm text-muted-foreground text-center">
              💤 Os indicadores de qualidade do sono estarão disponíveis após a próxima sincronização do Oura Ring
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
