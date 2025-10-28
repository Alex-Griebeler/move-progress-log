import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/AppHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Filter, X, Database } from "lucide-react";
import { AddExerciseDialog } from "@/components/AddExerciseDialog";
import { EditExerciseLibraryDialog } from "@/components/EditExerciseLibraryDialog";
import {
  useExercisesLibrary,
  useDeleteExercise,
  ExerciseLibrary,
  MOVEMENT_PATTERNS,
  LATERALITY_OPTIONS,
  MOVEMENT_PLANES,
  CONTRACTION_TYPES,
  LEVEL_OPTIONS,
  ExerciseFilters,
} from "@/hooks/useExercisesLibrary";
import { populateExercisesLibrary } from "@/utils/populateExercises";
import { toast } from "sonner";

export default function ExercisesLibraryPage() {
  const [filters, setFilters] = useState<ExerciseFilters>({});
  const [editingExercise, setEditingExercise] = useState<ExerciseLibrary | null>(null);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);
  const [isPopulating, setIsPopulating] = useState(false);

  const { data: exercises, isLoading, refetch } = useExercisesLibrary(filters);
  const deleteExercise = useDeleteExercise();

  const handlePopulateDatabase = async () => {
    setIsPopulating(true);
    try {
      const result = await populateExercisesLibrary();
      
      if (result.success) {
        toast.success(
          `${result.added} exercícios adicionados com sucesso! ${result.skipped} já existiam.`
        );
        refetch();
      } else {
        toast.error("Erro ao popular banco de dados");
      }
    } catch (error) {
      console.error("Erro ao popular banco:", error);
      toast.error("Erro ao popular banco de dados");
    } finally {
      setIsPopulating(false);
    }
  };

  const handleDelete = async () => {
    if (deletingExerciseId) {
      await deleteExercise.mutateAsync(deletingExerciseId);
      setDeletingExerciseId(null);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AppHeader
        title="Biblioteca de Exercícios"
        subtitle="Gerencie exercícios com classificações por padrões de movimento"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePopulateDatabase}
              disabled={isPopulating}
            >
              <Database className="h-4 w-4 mr-2" />
              {isPopulating ? "Importando..." : "Importar Exercícios"}
            </Button>
            <AddExerciseDialog />
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filtros</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Padrão de Movimento</label>
            <Select
              value={filters.movement_pattern || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  movement_pattern: value === "all" ? undefined : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(MOVEMENT_PATTERNS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lateralidade</label>
            <Select
              value={filters.laterality || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  laterality: value === "all" ? undefined : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(LATERALITY_OPTIONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Plano de Movimento</label>
            <Select
              value={filters.movement_plane || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  movement_plane: value === "all" ? undefined : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(MOVEMENT_PLANES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Contração</label>
            <Select
              value={filters.contraction_type || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  contraction_type: value === "all" ? undefined : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(CONTRACTION_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nível</label>
            <Select
              value={filters.level || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  level: value === "all" ? undefined : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(LEVEL_OPTIONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Exercise List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !exercises || exercises.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? "Nenhum exercício encontrado com os filtros selecionados."
                : "Nenhum exercício cadastrado. Adicione o primeiro exercício à biblioteca!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((exercise) => (
            <Card key={exercise.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{exercise.name}</CardTitle>
                    <CardDescription className="mt-2 space-y-1">
                      <Badge variant="secondary">
                        {MOVEMENT_PATTERNS[exercise.movement_pattern as keyof typeof MOVEMENT_PATTERNS]}
                      </Badge>
                      {exercise.laterality && (
                        <Badge variant="outline" className="ml-2">
                          {LATERALITY_OPTIONS[exercise.laterality as keyof typeof LATERALITY_OPTIONS]}
                        </Badge>
                      )}
                      {exercise.movement_plane && (
                        <Badge variant="outline" className="ml-2">
                          {MOVEMENT_PLANES[exercise.movement_plane as keyof typeof MOVEMENT_PLANES]}
                        </Badge>
                      )}
                      {exercise.contraction_type && (
                        <Badge variant="outline" className="ml-2">
                          {CONTRACTION_TYPES[exercise.contraction_type as keyof typeof CONTRACTION_TYPES]}
                        </Badge>
                      )}
                      {exercise.level && (
                        <Badge variant="outline" className="ml-2">
                          {LEVEL_OPTIONS[exercise.level as keyof typeof LEVEL_OPTIONS]}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {exercise.description && (
                  <p className="text-sm text-muted-foreground mb-4">{exercise.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingExercise(exercise)}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeletingExerciseId(exercise.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingExercise && (
        <EditExerciseLibraryDialog
          exercise={editingExercise}
          open={!!editingExercise}
          onOpenChange={(open) => !open && setEditingExercise(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingExerciseId} onOpenChange={() => setDeletingExerciseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este exercício? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
