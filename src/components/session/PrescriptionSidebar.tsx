import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

/**
 * Roteiro da prescrição ao lado do gravador. No celular fica compacto
 * (rolagem própria, altura limitada) para o gravador aparecer sem rolar
 * a tela inteira; no desktop acompanha a altura do gravador.
 */
export function PrescriptionSidebar({ exercises }: PrescriptionSidebarProps) {
  const trackable = exercises.filter((ex) => ex.should_track !== false);

  return (
    <Card className="flex max-h-64 flex-col lg:h-[600px] lg:max-h-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Exercícios a registrar</CardTitle>
          <Badge variant="secondary">{trackable.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-6 pb-6 pt-0">
        {trackable.map((exercise, index) => (
          <div
            key={exercise.id || index}
            className="mb-3 rounded-lg border bg-muted/30 p-3"
          >
            <div className="mb-1 text-sm font-medium">
              {exercise.exercise_name || exercise.exercises_library?.name}
            </div>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              {exercise.sets && exercise.reps && (
                <div>{exercise.sets} × {exercise.reps}</div>
              )}
              {exercise.training_method && <div>Método: {exercise.training_method}</div>}
              {exercise.observations && (
                <div className="mt-1 italic">{exercise.observations}</div>
              )}
            </div>
          </div>
        ))}
        {trackable.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Nenhum exercício para registrar nesta prescrição</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
