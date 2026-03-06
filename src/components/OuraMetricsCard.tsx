import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Heart, Moon, Thermometer, TrendingUp, Calendar } from "lucide-react";
import { OuraMetrics } from "@/hooks/useOuraMetrics";
import { formatLocalDate } from "@/utils/dateUtils";

interface OuraMetricsCardProps {
  metrics: OuraMetrics;
}

const OuraMetricsCard = ({ metrics }: OuraMetricsCardProps) => {
  const getScoreColor = (score: number | null) => {
    if (!score) return "bg-muted text-muted-foreground";
    if (score >= 85) return "bg-primary/10 text-primary";
    if (score >= 70) return "bg-secondary/50 text-secondary-foreground";
    return "bg-destructive/10 text-destructive";
  };

  const getScoreLabel = (score: number | null) => {
    if (!score) return "N/A";
    if (score >= 85) return "Ótimo";
    if (score >= 70) return "Bom";
    return "Atenção";
  };


  return (
    <Card className="hover:shadow-premium transition-smooth rounded-lg">
      <CardHeader className="p-lg space-y-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{formatLocalDate(metrics.date)}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Oura Ring
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-md p-lg pt-0">
        {/* Readiness Score */}
        <div className="space-y-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-base font-medium">Prontidão</span>
            </div>
            <Badge className={getScoreColor(metrics.readiness_score)}>
              {metrics.readiness_score || "N/A"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {getScoreLabel(metrics.readiness_score)}
          </div>
        </div>

        {/* Sleep Score */}
        <div className="space-y-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <span className="text-base font-medium">Sono</span>
            </div>
            <Badge className={getScoreColor(metrics.sleep_score)}>
              {metrics.sleep_score || "N/A"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {getScoreLabel(metrics.sleep_score)}
          </div>
        </div>

        {/* HRV Balance */}
        {metrics.hrv_balance !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Balanço HRV</span>
              </div>
              <span className="text-sm font-semibold">{metrics.hrv_balance.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Resting Heart Rate */}
        {metrics.resting_heart_rate !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">FC Repouso</span>
              </div>
              <span className="text-sm font-semibold">{metrics.resting_heart_rate} bpm</span>
            </div>
          </div>
        )}

        {/* Temperature Deviation */}
        {metrics.temperature_deviation !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Variação Temp.</span>
              </div>
              <span className="text-sm font-semibold">
                {metrics.temperature_deviation > 0 ? '+' : ''}{metrics.temperature_deviation.toFixed(2)}°C
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OuraMetricsCard;
