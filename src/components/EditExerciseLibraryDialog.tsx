import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useUpdateExercise,
  useDeleteExercise,
  MOVEMENT_PATTERNS,
  BASE_TYPE_OPTIONS,
  MOVEMENT_PLANES,
  ExerciseLibrary,
} from "@/hooks/useExercisesLibrary";

interface EditExerciseLibraryDialogProps {
  exercise: ExerciseLibrary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditExerciseLibraryDialog = ({
  exercise,
  open,
  onOpenChange,
}: EditExerciseLibraryDialogProps) => {
  const [name, setName] = useState(exercise.name);
  const [movementPattern, setMovementPattern] = useState(exercise.movement_pattern);
  const [laterality, setLaterality] = useState(exercise.laterality || "");
  const [movementPlane, setMovementPlane] = useState(exercise.movement_plane || "");
  const [description, setDescription] = useState(exercise.description || "");

  const updateExercise = useUpdateExercise();

  useEffect(() => {
    setName(exercise.name);
    setMovementPattern(exercise.movement_pattern);
    setLaterality(exercise.laterality || "");
    setMovementPlane(exercise.movement_plane || "");
    setDescription(exercise.description || "");
  }, [exercise]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !movementPattern) {
      return;
    }

    await updateExercise.mutateAsync({
      id: exercise.id,
      name: name.trim(),
      movement_pattern: movementPattern,
      laterality: laterality || null,
      movement_plane: movementPlane || null,
      description: description.trim() || null,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Exercício</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Exercício *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Agachamento Livre"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-movement-pattern">Padrão de Movimento *</Label>
            <Select value={movementPattern} onValueChange={setMovementPattern} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o padrão" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MOVEMENT_PATTERNS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

            <div className="space-y-2">
              <Label htmlFor="edit-laterality">Tipo de Base</Label>
              <Select value={laterality} onValueChange={setLaterality}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {Object.entries(BASE_TYPE_OPTIONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          <div className="space-y-2">
            <Label htmlFor="edit-movement-plane">Plano de Movimento</Label>
            <Select value={movementPlane} onValueChange={setMovementPlane}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {Object.entries(MOVEMENT_PLANES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do exercício"
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={updateExercise.isPending}>
            {updateExercise.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
