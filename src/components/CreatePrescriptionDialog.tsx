import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCreatePrescription } from "@/hooks/usePrescriptions";
import { useExercisesLibrary } from "@/hooks/useExercisesLibrary";
import { usePrescriptionDraft } from "@/hooks/usePrescriptionDraft";
import { Plus, Save, History, Trash2 } from "lucide-react";
import { PrescriptionDraftHistoryDialog } from "@/components/PrescriptionDraftHistoryDialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { notify } from "@/lib/notify";
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
  should_track: boolean;
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
      should_track: true,
      adaptations: [],
      showAdaptations: false,
    },
  ]);
  const [loadingRegressions, setLoadingRegressions] = useState<number | null>(null);
  const [focusedExerciseIndex, setFocusedExerciseIndex] = useState<number | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const { data: exercisesLibrary } = useExercisesLibrary();
  const createPrescription = useCreatePrescription();
  const { draft, saveDraft, clearDraft, restoreDraft, isSaving, lastSaved } = usePrescriptionDraft();

  // Carregar rascunho ao abrir dialog
  useEffect(() => {
    if (open && draft) {
      setName(draft.name);
      setObjective(draft.objective);
      setExercises(draft.exercises);
    }
  }, [open, draft]);

  // Auto-save quando dados mudarem
  useEffect(() => {
    if (open && (name || objective || exercises.some(ex => ex.exercise_library_id))) {
      saveDraft({ name, objective, exercises });
    }
  }, [name, objective, exercises, open, saveDraft]);

  // Proteção ao navegar
  useEffect(() => {
    if (!open) return;

    const handler = (e: BeforeUnloadEvent) => {
      if (name || objective || exercises.some(ex => ex.exercise_library_id)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [open, name, objective, exercises]);

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

  const addExercise = (afterIndex?: number) => {
    const newExercise = {
      id: crypto.randomUUID(),
      exercise_library_id: "",
      sets: "",
      reps: "",
      interval_seconds: "",
      pse: "",
      training_method: "",
      observations: "",
      group_with_previous: false,
      should_track: true,
      adaptations: [],
      showAdaptations: false,
    };

    if (afterIndex !== undefined && afterIndex >= 0) {
      console.log('Adding exercise after index:', afterIndex);
      const newExercises = [...exercises];
      newExercises.splice(afterIndex + 1, 0, newExercise);
      setExercises(newExercises);
      setTimeout(() => setFocusedExerciseIndex(afterIndex + 1), 0);
    } else {
      console.log('Adding exercise at end');
      setExercises([...exercises, newExercise]);
      setTimeout(() => setFocusedExerciseIndex(exercises.length), 0);
    }
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
    
    const loadingToastId = sonnerToast.loading("Gerando sugestões de regressões...", {
      description: "A IA está analisando o exercício e buscando alternativas adequadas."
    });

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

      sonnerToast.dismiss(loadingToastId);
      toast({
        title: "Regressões sugeridas com sucesso!",
        description: "A IA sugeriu 3 exercícios de regressão baseados no padrão de movimento.",
      });
    } catch (error: any) {
      sonnerToast.dismiss(loadingToastId);
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
    console.log('[CreatePrescription] Iniciando submit', { name, exerciseCount: exercises.length });
    
    // Validação de nome
    if (!name.trim()) {
      notify.error("Nome obrigatório", {
        description: "Por favor, informe o nome da prescrição antes de salvar."
      });
      return;
    }

    // Validação detalhada de exercícios
    const invalidExercises: string[] = [];
    
    exercises.forEach((ex, index) => {
      const exerciseName = exercisesLibrary?.find(e => e.id === ex.exercise_library_id)?.name || `Exercício ${index + 1}`;
      
      if (!ex.exercise_library_id) {
        invalidExercises.push(`${exerciseName}: selecione um exercício`);
      } else if (!ex.sets) {
        invalidExercises.push(`${exerciseName}: informe as séries`);
      } else if (!ex.reps) {
        invalidExercises.push(`${exerciseName}: informe as repetições`);
      }
    });

    if (invalidExercises.length > 0) {
      notify.error("Exercícios incompletos", {
        description: `Corrija os seguintes campos:\n${invalidExercises.slice(0, 3).join('\n')}${invalidExercises.length > 3 ? `\n...e mais ${invalidExercises.length - 3}` : ''}`
      });
      return;
    }

    const validExercises = exercises.filter((ex) => ex.exercise_library_id && ex.sets && ex.reps);
    console.log('[CreatePrescription] Exercícios válidos:', validExercises.length);

    if (validExercises.length === 0) {
      notify.error("Exercícios obrigatórios", {
        description: "Adicione pelo menos um exercício válido com nome, séries e repetições."
      });
      return;
    }

    try {
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
          should_track: ex.should_track ?? true,
          adaptations: ex.adaptations.filter((a) => a.exercise_library_id),
        })),
      });

      console.log('[CreatePrescription] Prescrição criada com sucesso');
      
      // Limpar rascunho após sucesso
      clearDraft();

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
          should_track: true,
          adaptations: [],
          showAdaptations: false,
        },
      ]);
      onOpenChange(false);
    } catch (error: any) {
      console.error('[CreatePrescription] Erro ao criar prescrição:', error);
      notify.error("Erro ao criar prescrição", {
        description: error?.message || "Ocorreu um erro inesperado. Tente novamente."
      });
    }
  };

  const handleClose = () => {
    const hasContent = name || objective || exercises.some(ex => ex.exercise_library_id);
    
    if (hasContent) {
      const confirmed = confirm(
        'Você tem dados não salvos. Seu rascunho foi salvo automaticamente. Deseja sair?'
      );
      if (!confirmed) return;
    }
    
    onOpenChange(false);
  };

  const handleRestoreDraft = (draftData: any) => {
    setName(draftData.name);
    setObjective(draftData.objective);
    setExercises(draftData.exercises);
    restoreDraft(draftData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Criar Nova Prescrição</DialogTitle>
            <div className="flex items-center gap-xs">
              {lastSaved && (
                <Badge variant="outline" className="gap-1">
                  <Save className="h-3 w-3" />
                  {formatDistanceToNow(lastSaved, { locale: ptBR, addSuffix: true })}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryDialogOpen(true)}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                Histórico
              </Button>
              {draft && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDraft}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
          {exercises.length > 0 && (
            <div className="flex items-center gap-xs pt-xs">
              <Badge variant="secondary" className="text-sm">
                {exercises.filter(ex => ex.should_track !== false).length} de {exercises.length} exercício(s) para registro
              </Badge>
              {exercises.filter(ex => ex.should_track !== false).length === 0 && (
                <Badge variant="destructive" className="text-xs">
                  Atenção: Nenhum exercício marcado para registro
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-md">
          <TooltipProvider>
            <div className="space-y-lg">
              <div className="space-y-md">
                <div className="space-y-sm">
                  <Label htmlFor="name">Nome da Prescrição *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Treino 1 - Potência/Força"
                  />
                </div>

                <div className="space-y-sm">
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

              <div className="space-y-md">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Exercícios</Label>
                  <Button 
                    onClick={() => addExercise(focusedExerciseIndex ?? undefined)} 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                  >
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
                    {exercises.map((exercise, exerciseIndex) => (
                      <SortableExerciseItem
                        key={exercise.id}
                        exercise={exercise}
                        index={exerciseIndex}
                        total={exercises.length}
                        exercisesLibrary={exercisesLibrary?.map((ex) => ({ id: ex.id, name: ex.name })) || []}
                        onUpdate={(field, value) => updateExercise(exerciseIndex, field, value)}
                        onRemove={() => removeExercise(exerciseIndex)}
                        onToggleAdaptations={() => toggleAdaptations(exerciseIndex)}
                        onAddAdaptation={() => addAdaptation(exerciseIndex)}
                        onRemoveAdaptation={(adaptIndex) => removeAdaptation(exerciseIndex, adaptIndex)}
                        onUpdateAdaptation={(adaptIndex, exerciseId) => updateAdaptation(exerciseIndex, adaptIndex, exerciseId)}
                        onSuggestRegressions={() => suggestRegressions(exerciseIndex)}
                        loadingRegressions={loadingRegressions === exerciseIndex}
                        onFocus={() => setFocusedExerciseIndex(exerciseIndex)}
                        isFocused={focusedExerciseIndex === exerciseIndex}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </TooltipProvider>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createPrescription.isPending}>
            {createPrescription.isPending ? "Criando..." : "Criar Prescrição"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <PrescriptionDraftHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        onRestoreDraft={handleRestoreDraft}
      />
    </Dialog>
  );
}
