import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useExerciseHistory, useExerciseStats } from "@/hooks/useExerciseHistory";
import { TrendingUp, Dumbbell, Calendar, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSessionDate } from "@/utils/sessionDate";

interface ExerciseHistoryCardProps {
  studentId: string;
  exerciseName: string;
}

const ExerciseHistoryCard = ({ studentId, exerciseName }: ExerciseHistoryCardProps) => {
  const { data: history, isLoading } = useExerciseHistory(studentId, exerciseName);
  const stats = useExerciseStats(studentId, exerciseName);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum histórico encontrado para este exercício</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          Histórico: {exerciseName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-md">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          <div className="space-y-xs">
            <div className="flex items-center gap-xs text-xs text-muted-foreground">
              <Award className="h-3 w-3" />
              <span>Carga Máxima</span>
            </div>
            <p className="text-xl font-bold text-primary">{stats.maxLoad}kg</p>
          </div>
          
          <div className="space-y-xs">
            <div className="flex items-center gap-xs text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Média de Carga</span>
            </div>
            <p className="text-xl font-bold">{stats.avgLoad}kg</p>
          </div>
          
          <div className="space-y-xs">
            <div className="flex items-center gap-xs text-xs text-muted-foreground">
              <Dumbbell className="h-3 w-3" />
              <span>Volume Total</span>
            </div>
            <p className="text-xl font-bold">{stats.totalVolume}kg</p>
          </div>
          
          <div className="space-y-xs">
            <div className="flex items-center gap-xs text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Sessões</span>
            </div>
            <p className="text-xl font-bold">{stats.sessionsCount}</p>
          </div>
        </div>

        {/* Last Session */}
        {stats.lastSession && (
          <div className="pt-md border-t">
            <p className="text-sm font-medium mb-sm">Última Sessão:</p>
            <div className="flex items-center gap-sm flex-wrap">
              <Badge variant="outline">
                {formatSessionDate(stats.lastSession.session_date)}
              </Badge>
              <Badge variant="secondary">
                {stats.lastSession.sets}x{stats.lastSession.reps} @ {stats.lastSession.load_kg}kg
              </Badge>
              {stats.lastSession.total_volume && (
                <Badge>
                  Vol: {stats.lastSession.total_volume}kg
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExerciseHistoryCard;
