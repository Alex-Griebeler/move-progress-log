/**
 * Dialog para Geração de Mesociclo com IA
 * Fabrik Performance - Back to Basics
 * 
 * Fluxo:
 * 1. Selecionar nível do grupo (iniciante/intermediário/avançado)
 * 2. Configurar valências para cada slot (A/B/C) - máx 2 por sessão
 * 3. IA gera os 3 treinos de uma vez
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Users,
  Calendar,
} from "lucide-react";
import { useGenerateGroupSession } from "@/hooks/useGenerateGroupSession";
import {
  MESOCYCLE_STRUCTURE,
  TRAINING_VALENCES,
  STUDENT_LEVELS,
} from "@/constants/backToBasics";
import type { 
  MesocycleGenerationInput, 
  GeneratedMesocycle,
  WorkoutSlotConfig,
} from "@/types/aiSession";
import type { TrainingValence, WorkoutSlot } from "@/constants/backToBasics";

// ============================================================================
// TIPOS LOCAIS
// ============================================================================

type Step = "level" | "valences" | "generating" | "preview";

type GroupLevel = "iniciante" | "intermediario" | "avancado";

interface GenerateGroupSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMesocycleGenerated?: (mesocycle: GeneratedMesocycle) => void;
  groupReadiness?: number; // MEL-IA-002: média do readiness do grupo (0-100)
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function GenerateGroupSessionDialog({
  open,
  onOpenChange,
  onMesocycleGenerated,
  groupReadiness,
}: GenerateGroupSessionDialogProps) {
  const [step, setStep] = useState<Step>("level");
  const [generatedMesocycle, setGeneratedMesocycle] = useState<GeneratedMesocycle | null>(null);

  // Form state
  const [groupLevel, setGroupLevel] = useState<GroupLevel>("intermediario");
  const [workoutConfigs, setWorkoutConfigs] = useState<Record<WorkoutSlot, TrainingValence[]>>({
    A: ["forca"],
    B: ["hipertrofia"],
    C: ["condicionamento"],
  });

  const generateMesocycle = useGenerateGroupSession();

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleValenceToggle = (slot: WorkoutSlot, valence: TrainingValence) => {
    setWorkoutConfigs((prev) => {
      const current = prev[slot];
      
      if (current.includes(valence)) {
        // Remover (mas manter pelo menos 1)
        if (current.length > 1) {
          return { ...prev, [slot]: current.filter((v) => v !== valence) };
        }
        return prev;
      }
      
      // Adicionar (máx 2)
      if (current.length >= 2) {
        return { ...prev, [slot]: [current[1], valence] };
      }
      
      return { ...prev, [slot]: [...current, valence] };
    });
  };

  const handleGenerate = async () => {
    setStep("generating");

    const input: MesocycleGenerationInput = {
      groupLevel,
      workouts: (Object.keys(workoutConfigs) as WorkoutSlot[]).map((slot) => ({
        slot,
        valences: workoutConfigs[slot],
      })),
      groupReadiness, // MEL-IA-002
    };

    try {
      const mesocycle = await generateMesocycle.mutateAsync(input);
      setGeneratedMesocycle(mesocycle);
      setStep("preview");
    } catch {
      setStep("valences");
    }
  };

  const handleConfirm = () => {
    if (generatedMesocycle && onMesocycleGenerated) {
      onMesocycleGenerated(generatedMesocycle);
    }
    handleClose();
  };

  const handleClose = () => {
    setStep("level");
    setGeneratedMesocycle(null);
    onOpenChange(false);
  };

  const canProceedToValences = !!groupLevel;
  const canGenerate = Object.values(workoutConfigs).every((v) => v.length >= 1);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Mesociclo com IA
          </DialogTitle>
          <DialogDescription>
            {step === "level" && "Defina o nível médio do grupo"}
            {step === "valences" && "Configure os objetivos de cada treino semanal"}
            {step === "generating" && "Montando seu mesociclo Back to Basics..."}
            {step === "preview" && "Revise os 3 treinos gerados"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          {/* ============================================================ */}
          {/* STEP 1: NÍVEL DO GRUPO */}
          {/* ============================================================ */}
          {step === "level" && (
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-base font-medium">Nível Médio do Grupo</span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(STUDENT_LEVELS) as [GroupLevel, typeof STUDENT_LEVELS.iniciante][]).map(
                    ([key, config]) => (
                      <Card
                        key={key}
                        className={`cursor-pointer transition-all ${
                          groupLevel === key
                            ? "ring-2 ring-primary border-primary"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setGroupLevel(key)}
                      >
                        <CardContent className="p-4 text-center">
                          <span className="text-lg font-medium">{config.name}</span>
                          <p className="text-xs text-muted-foreground mt-2">
                            {config.monthsTraining.min === 0
                              ? "0-6 meses"
                              : config.monthsTraining.max === Infinity
                              ? "24+ meses"
                              : `${config.monthsTraining.min}-${config.monthsTraining.max} meses`}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
              </div>

              {/* Info sobre o mesociclo */}
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-base font-medium">Estrutura do Mesociclo</span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(MESOCYCLE_STRUCTURE.workoutSlots) as [WorkoutSlot, typeof MESOCYCLE_STRUCTURE.workoutSlots.A][]).map(
                    ([slot, config]) => (
                      <Card key={slot} className="border-dashed">
                        <CardContent className="p-3 text-center">
                          <Badge 
                            variant="outline" 
                            className={`mb-2 bg-${config.color}-500/10 text-${config.color}-600 border-${config.color}-200`}
                          >
                            {config.name}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {config.days.join(" e ")}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground text-center">
                  4 semanas • Progressão automática S1→S4
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 2: VALÊNCIAS POR SLOT */}
          {/* ============================================================ */}
          {step === "valences" && (
            <div className="space-y-6 py-4">
              <p className="text-sm text-muted-foreground">
                Selecione até 2 valências para cada treino. A IA vai garantir que todos os 
                padrões de movimento sejam trabalhados em cada sessão (full body).
              </p>

              {(Object.entries(MESOCYCLE_STRUCTURE.workoutSlots) as [WorkoutSlot, typeof MESOCYCLE_STRUCTURE.workoutSlots.A][]).map(
                ([slot, slotConfig]) => (
                  <Card key={slot}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline">{slotConfig.name}</Badge>
                          <span className="text-muted-foreground font-normal">
                            {slotConfig.days.join(" e ")}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {workoutConfigs[slot].length}/2
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(TRAINING_VALENCES) as TrainingValence[]).map((valence) => (
                          <Badge
                            key={valence}
                            variant={workoutConfigs[slot].includes(valence) ? "default" : "outline"}
                            className="cursor-pointer px-3 py-1.5 transition-all"
                            onClick={() => handleValenceToggle(slot, valence)}
                          >
                            {TRAINING_VALENCES[valence]}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              )}

              {/* Resumo */}
              <Separator />
              
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Resumo</span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {STUDENT_LEVELS[groupLevel].name}
                  </Badge>
                  {(Object.entries(workoutConfigs) as [WorkoutSlot, TrainingValence[]][]).map(
                    ([slot, valences]) => (
                      <Badge key={slot} variant="outline">
                        {slot}: {valences.map((v) => TRAINING_VALENCES[v]).join(" + ")}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: GERANDO */}
          {/* ============================================================ */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Gerando seu mesociclo...</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Selecionando exercícios, balanceando padrões de movimento e 
                garantindo core triplanar em cada sessão
              </p>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 4: PREVIEW */}
          {/* ============================================================ */}
          {step === "preview" && generatedMesocycle && (
            <div className="space-y-6 py-4">
              {/* Header do mesociclo */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {STUDENT_LEVELS[generatedMesocycle.groupLevel].name}
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    4 semanas
                  </Badge>
                </div>
              </div>

              {/* Treinos A, B, C */}
              {generatedMesocycle.workouts.map((workout) => (
                <Card key={workout.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge>{MESOCYCLE_STRUCTURE.workoutSlots[workout.slot].name}</Badge>
                        {workout.name}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {workout.totalDuration} min
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {workout.valences.map((v) => (
                        <Badge key={v} variant="outline" className="text-xs">
                          {TRAINING_VALENCES[v]}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Core Triplanar Check */}
                    <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        {workout.coreTriplanarCheck.anti_extensao ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        )}
                        <span>Anti-ext</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {workout.coreTriplanarCheck.anti_flexao_lateral ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        )}
                        <span>Anti-flex lat</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {workout.coreTriplanarCheck.anti_rotacao ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        )}
                        <span>Anti-rot</span>
                      </div>
                    </div>

                    {/* Fases detalhadas */}
                    {workout.phases.map((phase) => (
                      <div key={phase.id} className="border-l-2 border-muted pl-3 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{phase.name}</span>
                          <span className="text-xs text-muted-foreground">{phase.duration} min</span>
                        </div>
                        {phase.blocks.map((block) => (
                          <div key={block.id} className="space-y-1 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                {block.name}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0">
                                {block.method}
                              </Badge>
                            </div>
                            {block.exercises.length > 0 ? (
                              <div className="space-y-1 ml-2">
                                {block.exercises.map((exercise) => (
                                  <div key={exercise.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                                    <span className="font-medium truncate max-w-[180px]">
                                      {exercise.name}
                                    </span>
                                    <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
                                      <span>{exercise.sets}x{exercise.reps}</span>
                                      {exercise.interval > 0 && (
                                        <span>{exercise.interval}s</span>
                                      )}
                                      {exercise.pse && (
                                        <span>PSE {exercise.pse}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground ml-2 italic">
                                {block.notes || "Sem exercícios prescritos"}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* FOOTER / NAVIGATION */}
        {/* ============================================================ */}
        <div className="flex justify-between pt-4 border-t">
          {step === "level" && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={() => setStep("valences")} disabled={!canProceedToValences}>
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {step === "valences" && (
            <>
              <Button variant="ghost" onClick={() => setStep("level")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={!canGenerate || generateMesocycle.isPending}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Mesociclo
              </Button>
            </>
          )}

          {step === "generating" && (
            <div className="w-full text-center text-sm text-muted-foreground">
              Isso pode levar alguns segundos...
            </div>
          )}

          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStep("valences")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ajustar
              </Button>
              <Button onClick={handleConfirm}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar e Salvar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
