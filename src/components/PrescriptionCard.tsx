import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrescriptionDetails, WorkoutPrescription, PrescriptionExercise } from "@/hooks/usePrescriptions";
import { useFolders } from "@/hooks/useFolders";
import { Calendar, Users, ClipboardList, Pencil, Clock, Dumbbell, MoreVertical, FolderInput, FolderX } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

// Agrupa exercícios baseado no campo group_with_previous
const groupExercises = (exercises: PrescriptionExercise[]) => {
  const groups: Array<{ exercises: PrescriptionExercise[]; isGroup: boolean; method: string | null }> = [];
  let currentGroup: PrescriptionExercise[] = [];

  exercises.forEach((exercise, index) => {
    if (index === 0) {
      // Primeiro exercício sempre inicia um novo grupo
      currentGroup = [exercise];
    } else if (exercise.group_with_previous) {
      // Se deve agrupar com o anterior, adiciona ao grupo atual
      currentGroup.push(exercise);
    } else {
      // Se não deve agrupar, fecha o grupo anterior e inicia novo
      if (currentGroup.length > 0) {
        groups.push({ 
          exercises: currentGroup, 
          isGroup: currentGroup.length > 1,
          method: currentGroup[0].training_method
        });
      }
      currentGroup = [exercise];
    }
  });

  // Adiciona o último grupo
  if (currentGroup.length > 0) {
    groups.push({ 
      exercises: currentGroup, 
      isGroup: currentGroup.length > 1,
      method: currentGroup[0].training_method
    });
  }

  return groups;
};

interface PrescriptionCardProps {
  prescription: WorkoutPrescription;
  onEdit: (id: string) => void;
  onAssign: (id: string) => void;
  onAddSession: (id: string) => void;
  onMoveToFolder: (prescriptionId: string) => void;
  onRemoveFromFolder: (prescriptionId: string) => void;
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
  return `${seconds}s`;
};

export function PrescriptionCard({ 
  prescription, 
  onEdit, 
  onAssign, 
  onAddSession,
  onMoveToFolder,
  onRemoveFromFolder 
}: PrescriptionCardProps) {
  const { data: details, isLoading } = usePrescriptionDetails(prescription.id);
  const { data: folders } = useFolders();

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
            >
              <ClipboardList className="h-4 w-4" />
              Registrar Sessão
            </Button>

            {/* Context Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Menu da prescrição</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Mover para Pasta
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {folders && folders.length > 0 ? (
                      folders
                        .filter(f => f.id !== prescription.folder_id)
                        .map(folder => (
                          <DropdownMenuItem
                            key={folder.id}
                            onClick={() => onMoveToFolder(prescription.id)}
                            data-folder-id={folder.id}
                          >
                            {folder.name}
                          </DropdownMenuItem>
                        ))
                    ) : (
                      <DropdownMenuItem disabled>
                        Nenhuma pasta disponível
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                {prescription.folder_id && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onRemoveFromFolder(prescription.id)}>
                      <FolderX className="h-4 w-4 mr-2" />
                      Remover da Pasta
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
                  <TableHead className="font-semibold text-center">Carga</TableHead>
                  <TableHead className="font-semibold text-center">Intervalo</TableHead>
                  <TableHead className="font-semibold text-center">Método</TableHead>
                  <TableHead className="font-semibold">Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const groups = groupExercises(details.exercises);
                  let exerciseCounter = 0;
                  
                  return groups.map((group, groupIndex) => {
                    return group.exercises.map((exercise, exIndex) => {
                      const isFirstInGroup = exIndex === 0;
                      const isLastInGroup = exIndex === group.exercises.length - 1;
                      exerciseCounter += 1;
                      
                      return (
                        <TableRow 
                          key={exercise.id} 
                          className={`hover:bg-muted/30 ${
                            group.isGroup && !isLastInGroup ? 'border-b-0' : ''
                          }`}
                          style={group.isGroup ? {
                            borderLeft: '4px solid hsl(var(--primary) / 0.6)'
                          } : undefined}
                        >
                          <TableCell className="font-medium text-muted-foreground text-center">
                            {exerciseCounter}
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
                            {exercise.pse ? (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {exercise.pse}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-medium">
                              {formatInterval(exercise.interval_seconds)}
                            </span>
                          </TableCell>
                          {!(group.isGroup && !isFirstInGroup) && (
                            <TableCell className="text-center" rowSpan={group.isGroup && isFirstInGroup ? group.exercises.length : undefined}>
                              {exercise.training_method ? (
                                <Badge variant="secondary" className="text-xs">
                                  {exercise.training_method}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
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
