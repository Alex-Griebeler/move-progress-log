import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdatePrescription, usePrescriptionDetails } from "@/hooks/usePrescriptions";
import { useExercisesLibrary } from "@/hooks/useExercisesLibrary";
import { TRAINING_METHODS } from "@/constants/trainingMethods";
import { Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Zap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Exercise {
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

interface EditPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescriptionId: string | null;
}

export function EditPrescriptionDialog({ open, onOpenChange, prescriptionId }: EditPrescriptionDialogProps) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([
    {
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

  const { data: prescriptionData } = usePrescriptionDetails(prescriptionId);
  const { data: exercisesLibrary } = useExercisesLibrary();
  const updatePrescription = useUpdatePrescription();

  // Load prescription data when dialog opens
  useEffect(() => {
    if (prescriptionData && open) {
      setName(prescriptionData.name);
      setObjective(prescriptionData.objective || "");
      
      if (prescriptionData.exercises && prescriptionData.exercises.length > 0) {
        setExercises(
          prescriptionData.exercises.map((ex: any) => ({
            exercise_library_id: ex.exercise_library_id,
            sets: ex.sets,
            reps: ex.reps,
            interval_seconds: ex.interval_seconds?.toString() || "",
            pse: ex.pse || "",
            training_method: ex.training_method || "",
            observations: ex.observations || "",
            group_with_previous: ex.group_with_previous || false,
            adaptations: (ex.adaptations || []).map((adapt: any) => ({
              type: adapt.adaptation_type,
              exercise_library_id: adapt.exercise_library_id,
            })),
            showAdaptations: (ex.adaptations || []).length > 0,
          }))
        );
      }
    }
  }, [prescriptionData, open]);

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
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

  const suggestInterval = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise.training_method) return;

    // Intervalos sugeridos baseados no método de treino
    const intervalMap: Record<string, number> = {
      TRADICIONAL: 90,
      CIRCUITO: 30,
      SUPERSET: 60,
      TRISET: 60,
      DROPSET: 120,
      PIRAMIDE_CRESCENTE: 120,
      PIRAMIDE_DECRESCENTE: 90,
      REST_PAUSE: 180,
      CLUSTER: 150,
      AMRAP: 180,
      EMOM: 0,
      E2MOM: 0,
      E3MOM: 0,
      FOR_TIME: 0,
      CONTRASTE: 180,
      PRE_EXAUSTAO: 60,
      POS_EXAUSTAO: 90,
    };

    const suggestedInterval = intervalMap[exercise.training_method] || 90;
    updateExercise(exerciseIndex, "interval_seconds", suggestedInterval.toString());
    
    toast({
      title: "Intervalo sugerido",
      description: `${suggestedInterval}s baseado no método ${TRAINING_METHODS[exercise.training_method as keyof typeof TRAINING_METHODS]?.name}`,
    });
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
    if (!name.trim() || !prescriptionId) {
      return;
    }

    const validExercises = exercises.filter((ex) => ex.exercise_library_id && ex.sets && ex.reps);

    if (validExercises.length === 0) {
      return;
    }

    await updatePrescription.mutateAsync({
      id: prescriptionId,
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

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Prescrição</DialogTitle>
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

              {exercises.map((exercise, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        Exercício {index + 1}
                      </span>
                      {index > 0 && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`group-${index}`}
                            checked={exercise.group_with_previous}
                            onCheckedChange={(checked) =>
                              updateExercise(index, "group_with_previous", checked === true)
                            }
                          />
                          <Label
                            htmlFor={`group-${index}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            Agrupar com exercício anterior
                          </Label>
                        </div>
                      )}
                    </div>
                    {exercises.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExercise(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Exercício *</Label>
                      <Select
                        value={exercise.exercise_library_id}
                        onValueChange={(value) =>
                          updateExercise(index, "exercise_library_id", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o exercício" />
                        </SelectTrigger>
                        <SelectContent>
                          {exercisesLibrary?.map((ex) => (
                            <SelectItem key={ex.id} value={ex.id}>
                              {ex.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2">
                        <Label>Sets *</Label>
                        <Input
                          value={exercise.sets}
                          onChange={(e) => updateExercise(index, "sets", e.target.value)}
                          placeholder="4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reps *</Label>
                        <Input
                          value={exercise.reps}
                          onChange={(e) => updateExercise(index, "reps", e.target.value)}
                          placeholder="10-8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Int (s)</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={exercise.interval_seconds}
                            onChange={(e) =>
                              updateExercise(index, "interval_seconds", e.target.value)
                            }
                            placeholder="60"
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => suggestInterval(index)}
                                disabled={!exercise.training_method}
                                className="px-2"
                              >
                                <Zap className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Sugerir intervalo baseado no método</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Carga</Label>
                      <Input
                        value={exercise.pse}
                        onChange={(e) => updateExercise(index, "pse", e.target.value)}
                        placeholder="Ex: 2RR, 80kg, ~85%"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Método</Label>
                      <Select
                        value={exercise.training_method}
                        onValueChange={(value) =>
                          updateExercise(index, "training_method", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione método" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRAINING_METHODS).map(([key, method]) => (
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <SelectItem value={key}>{method.name}</SelectItem>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-sm">
                                <p className="font-semibold">{method.indication}</p>
                                <p className="text-xs mt-1">{method.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={exercise.observations}
                      onChange={(e) => updateExercise(index, "observations", e.target.value)}
                      placeholder="Controle da pelve, carga leve..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAdaptations(index)}
                        className="gap-2 flex-1"
                      >
                        {exercise.showAdaptations ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        Regressões ({exercise.adaptations.length}/3)
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => suggestRegressions(index)}
                            disabled={!exercise.exercise_library_id || loadingRegressions === index}
                            className="gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            {loadingRegressions === index ? "..." : "IA"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Sugerir regressões com IA</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {exercise.showAdaptations && (
                      <div className="space-y-2 pl-4 border-l-2">
                        {exercise.adaptations.map((adaptation, adaptIndex) => (
                          <div key={adaptIndex} className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground min-w-[100px]">
                              Regressão {adaptIndex + 1}
                            </span>
                            <Select
                              value={adaptation.exercise_library_id}
                              onValueChange={(value) =>
                                updateAdaptation(index, adaptIndex, value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione exercício" />
                              </SelectTrigger>
                              <SelectContent>
                                {exercisesLibrary?.map((ex) => (
                                  <SelectItem key={ex.id} value={ex.id}>
                                    {ex.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAdaptation(index, adaptIndex)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        {exercise.adaptations.length < 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addAdaptation(index)}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar Regressão
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updatePrescription.isPending}>
            {updatePrescription.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
