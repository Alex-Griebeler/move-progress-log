import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PrescriptionExercise {
  id?: string;
  exercise_name?: string;
  exercises_library?: { name: string };
  sets?: string;
  reps?: string;
  training_method?: string;
  observations?: string;
  should_track?: boolean;
}

interface PrescriptionSidebarProps {
  exercises: PrescriptionExercise[];
}

export function PrescriptionSidebar({ exercises }: PrescriptionSidebarProps) {
  const trackable = exercises.filter((ex) => ex.should_track !== false);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Prescrição - Exercícios a Registrar</CardTitle>
          <Badge variant="secondary">{trackable.length} exercícios</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6 pb-6">
          {trackable.map((exercise, index) => (
            <div
              key={exercise.id || index}
              className="mb-4 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium text-sm mb-1">
                {exercise.exercise_name || exercise.exercises_library?.name}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {exercise.sets && exercise.reps && (
                  <div>📊 {exercise.sets} x {exercise.reps}</div>
                )}
                {exercise.training_method && (
                  <div>🎯 {exercise.training_method}</div>
                )}
                {exercise.observations && (
                  <div className="mt-1 text-xs italic">💬 {exercise.observations}</div>
                )}
              </div>
            </div>
          ))}
          {trackable.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhum exercício para rastrear nesta prescrição</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
