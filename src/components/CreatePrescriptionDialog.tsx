import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePrescription } from "@/hooks/usePrescriptions";
import { useExercisesLibrary } from "@/hooks/useExercisesLibrary";
import { Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableExerciseItem } from "@/components/SortableExerciseItem";

interface Exercise {
  id: string;
  exercise_library_id: string;
  sets: string;
  reps: string;
  interval_seconds: string;
  pse: string;
  training_method: string;
  observations: string;
  group_with_previous: boolean;
  adaptations: Array<{
    type: "regression_1" | "regression_2" | "regression_3";
    exercise_library_id: string;
  }>;
  showAdaptations: boolean;
}

interface CreatePrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePrescriptionDialog({ open, onOpenChange }: CreatePrescriptionDialogProps) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([
    {
      id: crypto.randomUUID(),
      exercise_library_id: "",
      sets: "",
      reps: "",
      interval_seconds: "",
      pse: "",
      training_method: "",
      observations: "",
      group_with_previous: false,
      adaptations: [],
      showAdaptations: false,
    },
  ]);
  const [loadingRegressions, setLoadingRegressions] = useState<number | null>(null);

  const { data: exercisesLibrary } = useExercisesLibrary();
  const createPrescription = useCreatePrescription();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setExercises((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        id: crypto.randomUUID(),
        exercise_library_id: "",
        sets: "",
        reps: "",
        interval_seconds: "",
        pse: "",
        training_method: "",
        observations: "",
        group_with_previous: false,
        adaptations: [],
        showAdaptations: false,
      },
    ]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const toggleAdaptations = (index: number) => {
    updateExercise(index, "showAdaptations", !exercises[index].showAdaptations);
  };

  const addAdaptation = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    if (exercise.adaptations.length >= 3) return;

    const adaptationType =
      exercise.adaptations.length === 0
        ? "regression_1"
        : exercise.adaptations.length === 1
        ? "regression_2"
        : "regression_3";

    updateExercise(exerciseIndex, "adaptations", [
      ...exercise.adaptations,
      { type: adaptationType as any, exercise_library_id: "" },
    ]);
  };

  const removeAdaptation = (exerciseIndex: number, adaptIndex: number) => {
    const exercise = exercises[exerciseIndex];
    updateExercise(
      exerciseIndex,
      "adaptations",
      exercise.adaptations.filter((_, i) => i !== adaptIndex)
    );
  };

  const updateAdaptation = (
    exerciseIndex: number,
    adaptIndex: number,
    exerciseId: string
  ) => {
    const exercise = exercises[exerciseIndex];
    const updated = [...exercise.adaptations];
    updated[adaptIndex] = { ...updated[adaptIndex], exercise_library_id: exerciseId };
    updateExercise(exerciseIndex, "adaptations", updated);
  };

  const suggestRegressions = async (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise.exercise_library_id || !exercisesLibrary) return;

    const selectedExercise = exercisesLibrary.find((ex) => ex.id === exercise.exercise_library_id);
    if (!selectedExercise) return;

    setLoadingRegressions(exerciseIndex);

    try {
      const { data, error } = await supabase.functions.invoke("suggest-regressions", {
        body: {
          exerciseId: selectedExercise.id,
          exerciseName: selectedExercise.name,
          movementPattern: selectedExercise.movement_pattern,
          movementPlane: selectedExercise.movement_plane,
          laterality: selectedExercise.laterality,
          availableExercises: exercisesLibrary.map((ex) => ({
            id: ex.id,
            name: ex.name,
            movement_pattern: ex.movement_pattern,
            movement_plane: ex.movement_plane,
            laterality: ex.laterality,
          })),
        },
      });

      if (error) throw error;

      const suggestions = data.regressions.map((r: any, i: number) => ({
        type: i === 0 ? "regression_1" : i === 1 ? "regression_2" : "regression_3",
        exercise_library_id: r.exercise_id,
      }));

      updateExercise(exerciseIndex, "adaptations", suggestions);
      updateExercise(exerciseIndex, "showAdaptations", true);

      toast({
        title: "Regressões sugeridas",
        description: "A IA sugeriu 3 exercícios de regressão baseados no padrão de movimento.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao sugerir regressões",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoadingRegressions(null);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }

    const validExercises = exercises.filter((ex) => ex.exercise_library_id && ex.sets && ex.reps);

    if (validExercises.length === 0) {
      return;
    }

    await createPrescription.mutateAsync({
      name,
      objective,
      exercises: validExercises.map((ex, index) => ({
        exercise_library_id: ex.exercise_library_id,
        sets: ex.sets,
        reps: ex.reps,
        interval_seconds: ex.interval_seconds ? parseInt(ex.interval_seconds) : undefined,
        pse: ex.pse || undefined,
        training_method: ex.training_method || undefined,
        observations: ex.observations || undefined,
        group_with_previous: index > 0 ? ex.group_with_previous : false,
        adaptations: ex.adaptations.filter((a) => a.exercise_library_id),
      })),
    });

    setName("");
    setObjective("");
    setExercises([
      {
        id: crypto.randomUUID(),
        exercise_library_id: "",
        sets: "",
        reps: "",
        interval_seconds: "",
        pse: "",
        training_method: "",
        observations: "",
        group_with_previous: false,
        adaptations: [],
        showAdaptations: false,
      },
    ]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Criar Nova Prescrição</DialogTitle>
        </DialogHeader>

        <TooltipProvider>
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Prescrição *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Treino 1 - Potência/Força"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo</Label>
                <Textarea
                  id="objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Desenvolvimento de potência e força com ênfase em membros inferiores"
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Exercícios</Label>
                <Button onClick={addExercise} variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Exercício
                </Button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={exercises.map((ex) => ex.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {exercises.map((exercise, index) => (
                    <SortableExerciseItem
                      key={exercise.id}
                      exercise={exercise}
                      index={index}
                      total={exercises.length}
                      exercisesLibrary={exercisesLibrary?.map((ex) => ({ id: ex.id, name: ex.name })) || []}
                      onUpdate={(field, value) => updateExercise(index, field, value)}
                      onRemove={() => removeExercise(index)}
                      onToggleAdaptations={() => toggleAdaptations(index)}
                      onAddAdaptation={() => addAdaptation(index)}
                      onRemoveAdaptation={(adaptIndex) => removeAdaptation(index, adaptIndex)}
                      onUpdateAdaptation={(adaptIndex, exerciseId) => updateAdaptation(index, adaptIndex, exerciseId)}
                      onSuggestRegressions={() => suggestRegressions(index)}
                      loadingRegressions={loadingRegressions === index}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createPrescription.isPending}>
            {createPrescription.isPending ? "Criando..." : "Criar Prescrição"}
          </Button>
        </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
