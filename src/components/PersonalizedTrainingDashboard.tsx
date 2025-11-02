import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertCircle, Activity, Heart, Moon, TrendingUp, Target, Zap } from "lucide-react";
import { OuraMetrics } from "@/hooks/useOuraMetrics";
import { useTrainingRecommendation } from "@/hooks/useTrainingRecommendation";
import { Alert, AlertDescription } from "./ui/alert";

interface PersonalizedTrainingDashboardProps {
  latestMetrics: OuraMetrics | null;
  recentMetrics: OuraMetrics[];
  studentName: string;
}

const PersonalizedTrainingDashboard = ({
  latestMetrics,
  recentMetrics,
  studentName
}: PersonalizedTrainingDashboardProps) => {
  const recommendation = useTrainingRecommendation(latestMetrics, recentMetrics);

  if (!latestMetrics || !recommendation) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aguardando sincronização dos dados do Oura Ring para gerar recomendações personalizadas.</p>
        </div>
      </Card>
    );
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return "secondary";
    if (score >= 80) return "default";
    if (score >= 65) return "outline";
    return "destructive";
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
  };

  return (
    <div className="space-y-6">
      {/* Status de Recuperação Principal */}
      <Card className="p-6 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {recommendation.emoji} Olá, {studentName}!
            </h2>
            <p className="text-lg text-muted-foreground">{recommendation.reason}</p>
          </div>
          <Badge variant={getScoreColor(recommendation.recoveryScore)} className="text-lg px-4 py-2">
            Recuperação: {recommendation.recoveryScore}/100
          </Badge>
        </div>

        {/* Scores Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center space-x-3 p-4 rounded-lg bg-background border">
            <Zap className={`w-8 h-8 ${latestMetrics.readiness_score && latestMetrics.readiness_score >= 70 ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm text-muted-foreground">Prontidão</p>
              <p className="text-2xl font-bold">{latestMetrics.readiness_score || '--'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 rounded-lg bg-background border">
            <Moon className={`w-8 h-8 ${latestMetrics.sleep_score && latestMetrics.sleep_score >= 70 ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm text-muted-foreground">Sono</p>
              <p className="text-2xl font-bold">{latestMetrics.sleep_score || '--'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 rounded-lg bg-background border">
            <Heart className={`w-8 h-8 ${latestMetrics.resting_heart_rate ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm text-muted-foreground">FCR</p>
              <p className="text-2xl font-bold">{latestMetrics.resting_heart_rate || '--'} <span className="text-sm">bpm</span></p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recomendação de Treino */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-bold">Treino Recomendado para Hoje</h3>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-6 space-y-4">
          <div>
            <h4 className="text-2xl font-bold text-primary mb-2">{recommendation.trainingType}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm text-muted-foreground">Intensidade</p>
                <p className="text-lg font-semibold">{recommendation.intensity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duração</p>
                <p className="text-lg font-semibold">{recommendation.duration}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-4 border-t">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm">
              Confiança da recomendação: <span className="font-semibold">{recommendation.confidence}%</span>
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button className="flex-1">Iniciar Treino</Button>
            <Button variant="outline" className="flex-1">Ver Alternativas</Button>
          </div>
        </div>
      </Card>

      {/* Alertas */}
      {recommendation.alerts.length > 0 && (
        <div className="space-y-3">
          {recommendation.alerts.map((alert, idx) => (
            <Alert 
              key={idx} 
              variant={alert.level === 'CRITICAL' ? 'destructive' : 'default'}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Detalhes de Recuperação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center">
            <Moon className="w-4 h-4 mr-2" />
            Sono Ontem
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duração Total</span>
              <span className="font-semibold">{formatDuration(latestMetrics.total_sleep_duration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sono Profundo</span>
              <span className="font-semibold">{formatDuration(latestMetrics.deep_sleep_duration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sono REM</span>
              <span className="font-semibold">{formatDuration(latestMetrics.rem_sleep_duration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Eficiência</span>
              <span className="font-semibold">{latestMetrics.sleep_efficiency ? `${latestMetrics.sleep_efficiency}%` : '--'}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center">
            <Heart className="w-4 h-4 mr-2" />
            Sinais Vitais
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">HRV</span>
              <span className="font-semibold">{latestMetrics.average_sleep_hrv ? `${latestMetrics.average_sleep_hrv.toFixed(1)} ms` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">FC Repouso</span>
              <span className="font-semibold">{latestMetrics.resting_heart_rate ? `${latestMetrics.resting_heart_rate} bpm` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temperatura</span>
              <span className="font-semibold">{latestMetrics.temperature_deviation ? `${latestMetrics.temperature_deviation > 0 ? '+' : ''}${latestMetrics.temperature_deviation.toFixed(1)}°C` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nível de Fadiga</span>
              <span className="font-semibold capitalize">{recommendation.fatigueLevel}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Atividade Recente
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Calorias Ativas</span>
              <span className="font-semibold">{latestMetrics.active_calories ? `${latestMetrics.active_calories} kcal` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Passos</span>
              <span className="font-semibold">{latestMetrics.steps ? latestMetrics.steps.toLocaleString() : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Score Atividade</span>
              <span className="font-semibold">{latestMetrics.activity_score || '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">MET Minutos</span>
              <span className="font-semibold">{latestMetrics.met_minutes || '--'}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PersonalizedTrainingDashboard;
