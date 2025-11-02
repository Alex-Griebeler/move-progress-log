import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Heart, Flame, MapPin } from "lucide-react";
import { useOuraWorkouts } from "@/hooks/useOuraWorkouts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { translateActivity, translateIntensity } from "@/utils/ouraTranslations";

interface OuraWorkoutsCardProps {
  studentId: string;
  limit?: number;
}

const getIntensityColor = (intensity: string | null) => {
  if (!intensity) return "secondary";
  const lower = intensity.toLowerCase();
  if (lower === "easy") return "default";
  if (lower === "moderate") return "outline";
  return "destructive";
};

const getIntensityLabel = (intensity: string | null) => {
  return translateIntensity(intensity);
};

const formatDuration = (start: string, end: string) => {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const durationMs = endTime.getTime() - startTime.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${minutes}m`;
};

const formatDistance = (meters: number | null) => {
  if (!meters) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters} m`;
};

export const OuraWorkoutsCard = ({ studentId, limit = 10 }: OuraWorkoutsCardProps) => {
  const { data: workouts, isLoading } = useOuraWorkouts(studentId, limit);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Treinos Registrados</CardTitle>
          <CardDescription>Carregando treinos...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Treinos Registrados</CardTitle>
          <CardDescription>Nenhum treino registrado pelo Oura Ring</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <CardTitle>Treinos Registrados</CardTitle>
        </div>
        <CardDescription>
          {workouts.length} treino(s) detectado(s) pelo Oura Ring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {workouts.map((workout) => (
          <div 
            key={workout.id} 
            className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-lg">
                  {translateActivity(workout.activity)}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(workout.start_datetime), "PPP 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <Badge variant={getIntensityColor(workout.intensity)}>
                {getIntensityLabel(workout.intensity)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Duration */}
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Dumbbell className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duração</p>
                  <p className="text-sm font-semibold">
                    {formatDuration(workout.start_datetime, workout.end_datetime)}
                  </p>
                </div>
              </div>

              {/* Calories */}
              {workout.calories && (
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent/50">
                    <Flame className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Calorias</p>
                    <p className="text-sm font-semibold">{workout.calories} kcal</p>
                  </div>
                </div>
              )}

              {/* Heart Rate */}
              {workout.average_heart_rate && (
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <Heart className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">FC Média</p>
                    <p className="text-sm font-semibold">
                      {workout.average_heart_rate} bpm
                      {workout.max_heart_rate && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (máx: {workout.max_heart_rate})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Distance */}
              {workout.distance && (
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Distância</p>
                    <p className="text-sm font-semibold">{formatDistance(workout.distance)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Source */}
            {workout.source && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Fonte: <span>{translateActivity(workout.source)}</span>
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
