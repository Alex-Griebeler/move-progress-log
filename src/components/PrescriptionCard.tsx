import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePrescriptionDetails, WorkoutPrescription, PrescriptionExercise } from "@/hooks/usePrescriptions";
import { Calendar, Users, ClipboardList, Pencil, Clock, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

// Métodos que agrupam exercícios
const GROUPING_METHODS = ["Superset", "Triset", "Circuito", "Pré-Exaustão", "Pós-Exaustão", "Contraste"];

const shouldGroup = (method: string | null) => {
  if (!method) return false;
  // Normaliza comparação (banco usa nomes exatos das constantes)
  const normalizedMethod = method.toLowerCase().replace(/-/g, '').replace(/\s/g, '');
  return GROUPING_METHODS.some(m => 
    m.toLowerCase().replace(/-/g, '').replace(/\s/g, '') === normalizedMethod
  );
};

// Agrupa exercícios consecutivos com o mesmo método de agrupamento
const groupExercises = (exercises: PrescriptionExercise[]) => {
  const groups: Array<{ exercises: PrescriptionExercise[]; isGroup: boolean; method: string | null }> = [];
  let currentGroup: PrescriptionExercise[] = [];
  let currentMethod: string | null = null;

  exercises.forEach((exercise, index) => {
    const exerciseMethod = exercise.training_method;
    
    if (shouldGroup(exerciseMethod)) {
      if (exerciseMethod === currentMethod) {
        currentGroup.push(exercise);
      } else {
        if (currentGroup.length > 0) {
          groups.push({ 
            exercises: currentGroup, 
            isGroup: currentGroup.length > 1, 
            method: currentMethod 
          });
        }
        currentGroup = [exercise];
        currentMethod = exerciseMethod;
      }
    } else {
      if (currentGroup.length > 0) {
        groups.push({ 
          exercises: currentGroup, 
          isGroup: currentGroup.length > 1, 
          method: currentMethod 
        });
        currentGroup = [];
        currentMethod = null;
      }
      groups.push({ exercises: [exercise], isGroup: false, method: null });
    }
  });

  if (currentGroup.length > 0) {
    groups.push({ 
      exercises: currentGroup, 
      isGroup: currentGroup.length > 1, 
      method: currentMethod 
    });
  }

  return groups;
};

interface PrescriptionCardProps {
  prescription: WorkoutPrescription;
  onEdit: (id: string) => void;
  onAssign: (id: string) => void;
  onAddSession: (id: string) => void;
}

const getAssignmentBadge = (count: number) => {
  if (count === 0) {
    return (
      <Badge variant="outline" className="gap-1.5 border-destructive/50 text-destructive">
        <div className="h-2 w-2 rounded-full bg-destructive" />
        Não atribuída
      </Badge>
    );
  }
  if (count === 1) {
    return (
      <Badge variant="outline" className="gap-1.5 border-yellow-500/50 text-yellow-600 dark:text-yellow-500">
        <div className="h-2 w-2 rounded-full bg-yellow-500" />
        1 aluno
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 border-green-500/50 text-green-600 dark:text-green-500">
      <div className="h-2 w-2 rounded-full bg-green-500" />
      {count} alunos
    </Badge>
  );
};

const formatInterval = (seconds: number | null) => {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};

export function PrescriptionCard({ prescription, onEdit, onAssign, onAddSession }: PrescriptionCardProps) {
  const { data: details, isLoading } = usePrescriptionDetails(prescription.id);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-2xl">{prescription.name}</CardTitle>
              {getAssignmentBadge(prescription.assigned_students_count || 0)}
            </div>
            {prescription.objective && (
              <CardDescription className="text-base">
                {prescription.objective}
              </CardDescription>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
              <Calendar className="h-4 w-4" />
              <span>
                Criada em {format(new Date(prescription.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onEdit(prescription.id)}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onAssign(prescription.id)}
            >
              <Users className="h-4 w-4" />
              {prescription.assigned_students_count === 0 ? "Atribuir" : "Gerenciar"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onAddSession(prescription.id)}
              disabled={prescription.assigned_students_count === 0}
            >
              <ClipboardList className="h-4 w-4" />
              Registrar Sessão
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : details?.exercises && details.exercises.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">#</TableHead>
                  <TableHead className="font-semibold">Exercício</TableHead>
                  <TableHead className="font-semibold text-center">Séries</TableHead>
                  <TableHead className="font-semibold text-center">Reps</TableHead>
                  <TableHead className="font-semibold text-center">Método</TableHead>
                  <TableHead className="font-semibold text-center">PSE</TableHead>
                  <TableHead className="font-semibold text-center">Intervalo</TableHead>
                  <TableHead className="font-semibold">Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const groups = groupExercises(details.exercises);
                  let exerciseCounter = 0;
                  
                  return groups.map((group, groupIndex) => {
                    const groupNumber = exerciseCounter + 1;
                    exerciseCounter += group.exercises.length;
                    
                    return group.exercises.map((exercise, exIndex) => {
                      const isFirstInGroup = exIndex === 0;
                      const isLastInGroup = exIndex === group.exercises.length - 1;
                      
                      return (
                        <TableRow 
                          key={exercise.id} 
                          className={`hover:bg-muted/30 ${
                            group.isGroup ? 'border-l-4 border-l-primary/40' : ''
                          } ${
                            group.isGroup && !isLastInGroup ? 'border-b-0' : ''
                          }`}
                        >
                          <TableCell className="font-medium text-muted-foreground">
                            {isFirstInGroup && (
                              <div className="flex items-center gap-1">
                                {groupNumber}
                                {group.isGroup && (
                                  <span className="text-xs">
                                    ({String.fromCharCode(97 + exIndex)})
                                  </span>
                                )}
                              </div>
                            )}
                            {!isFirstInGroup && group.isGroup && (
                              <span className="text-xs pl-4">
                                ({String.fromCharCode(97 + exIndex)})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Dumbbell className="h-4 w-4 text-muted-foreground" />
                              {exercise.exercise_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {exercise.sets}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {exercise.reps}
                          </TableCell>
                          <TableCell className="text-center">
                            {exercise.training_method && isFirstInGroup ? (
                              <Badge variant="secondary" className="text-xs">
                                {exercise.training_method}
                              </Badge>
                            ) : exercise.training_method && !isFirstInGroup && !group.isGroup ? (
                              <Badge variant="secondary" className="text-xs">
                                {exercise.training_method}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {exercise.pse ? (
                              <Badge variant="outline" className="text-xs">
                                {exercise.pse}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatInterval(exercise.interval_seconds)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {exercise.observations || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  });
                })()}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum exercício cadastrado nesta prescrição
          </div>
        )}
      </CardContent>
    </Card>
  );
}
