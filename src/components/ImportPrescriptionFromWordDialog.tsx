import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Upload, FileText, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreatePrescription } from "@/hooks/usePrescriptions";
import { useExercisesLibrary } from "@/hooks/useExercisesLibrary";
import { notify } from "@/lib/notify";
import { ExerciseCombobox } from "@/components/ExerciseCombobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ParsedExercise {
  name: string;
  sets: string;
  reps: string;
  interval_seconds?: number | null;
  pse?: string | null;
  training_method?: string | null;
  group_with_previous?: boolean;
  observations?: string | null;
  matches: Array<{ id: string; name: string; similarity: number }>;
  matched_exercise_id: string | null;
  matched_exercise_name: string | null;
  match_confidence: number;
}

interface ParsedPrescription {
  name: string;
  objective: string;
  day_of_week?: string;
  exercises: ParsedExercise[];
}

type Step = "upload" | "parsing" | "review";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportPrescriptionFromWordDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [prescriptions, setPrescriptions] = useState<ParsedPrescription[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedExercises, setExpandedExercises] = useState<Set<number>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const createPrescription = useCreatePrescription();
  const { data: exercisesLibrary } = useExercisesLibrary();

  const resetState = () => {
    setStep("upload");
    setPrescriptions([]);
    setSelectedIndex(0);
    setExpandedExercises(new Set());
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".docx")) {
      notify.error("Formato inválido", { description: "Apenas arquivos .docx são suportados." });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notify.error("Arquivo muito grande", { description: "O limite é 10MB." });
      return;
    }

    setStep("parsing");

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("parse-word-prescription", {
        body: { fileBase64: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (!data?.prescriptions || data.prescriptions.length === 0) {
        notify.error("Nenhum treino encontrado", { description: "O documento não contém treinos identificáveis." });
        setStep("upload");
        return;
      }

      setPrescriptions(data.prescriptions);
      setSelectedIndex(0);
      setStep("review");
    } catch (err: any) {
      console.error("Import error:", err);
      notify.error("Erro ao processar arquivo", { description: err.message });
      setStep("upload");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleExerciseMatch = (exerciseIdx: number, exerciseId: string, exerciseName: string) => {
    setPrescriptions(prev => {
      const updated = [...prev];
      const prescription = { ...updated[selectedIndex] };
      const exercises = [...prescription.exercises];
      exercises[exerciseIdx] = {
        ...exercises[exerciseIdx],
        matched_exercise_id: exerciseId,
        matched_exercise_name: exerciseName,
        match_confidence: 100,
      };
      prescription.exercises = exercises;
      updated[selectedIndex] = prescription;
      return updated;
    });
  };

  const handleConfirm = async (index: number) => {
    const prescription = prescriptions[index];
    const validExercises = prescription.exercises.filter(ex => ex.matched_exercise_id);

    if (validExercises.length === 0) {
      notify.error("Nenhum exercício vinculado", {
        description: "Vincule pelo menos um exercício da biblioteca antes de confirmar.",
      });
      return;
    }

    try {
      await createPrescription.mutateAsync({
        name: prescription.name,
        objective: prescription.objective,
        exercises: validExercises.map(ex => ({
          exercise_library_id: ex.matched_exercise_id!,
          sets: ex.sets,
          reps: ex.reps,
          interval_seconds: ex.interval_seconds || undefined,
          pse: ex.pse || undefined,
          training_method: ex.training_method || undefined,
          observations: ex.observations || undefined,
          group_with_previous: ex.group_with_previous || false,
        })),
      });

      // Mark as created
      setPrescriptions(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], name: `✅ ${updated[index].name}` };
        return updated;
      });

      notify.success(`Prescrição "${prescription.name}" criada com sucesso!`);
    } catch (err: any) {
      notify.error("Erro ao criar prescrição", { description: err.message });
    }
  };

  const getConfidenceBadge = (confidence: number, matched: boolean) => {
    if (!matched) return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Sem match</Badge>;
    if (confidence >= 70) return <Badge className="bg-emerald-600 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />{confidence}%</Badge>;
    if (confidence >= 40) return <Badge className="bg-amber-500 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />{confidence}%</Badge>;
    return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />{confidence}%</Badge>;
  };

  const currentPrescription = prescriptions[selectedIndex];
  const matchedCount = currentPrescription?.exercises.filter(e => e.matched_exercise_id).length ?? 0;
  const totalCount = currentPrescription?.exercises.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Importar Prescrição do Word</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Faça upload de um arquivo .docx para extrair automaticamente os treinos."}
            {step === "parsing" && "Processando o documento..."}
            {step === "review" && `Revise os exercícios extraídos antes de confirmar. ${matchedCount}/${totalCount} vinculados.`}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("word-file-input")?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Arraste um arquivo .docx aqui</p>
            <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
            <input
              id="word-file-input"
              type="file"
              accept=".docx"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        )}

        {step === "parsing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Extraindo exercícios e vinculando à biblioteca...</p>
            <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos.</p>
          </div>
        )}

        {step === "review" && currentPrescription && (
          <div className="space-y-4">
            {/* Prescription selector tabs */}
            {prescriptions.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {prescriptions.map((p, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={i === selectedIndex ? "default" : "outline"}
                    onClick={() => setSelectedIndex(i)}
                    className="text-xs"
                  >
                    {p.name.replace("✅ ", "")}
                  </Button>
                ))}
              </div>
            )}

            {/* Prescription info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-sm">{currentPrescription.name}</p>
              {currentPrescription.objective && (
                <p className="text-xs text-muted-foreground">Objetivo: {currentPrescription.objective}</p>
              )}
              {currentPrescription.day_of_week && (
                <p className="text-xs text-muted-foreground">Dias: {currentPrescription.day_of_week}</p>
              )}
            </div>

            {/* Exercises list */}
            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-2">
                {currentPrescription.exercises.map((exercise, idx) => (
                  <Collapsible
                    key={idx}
                    open={expandedExercises.has(idx)}
                    onOpenChange={(open) => {
                      setExpandedExercises(prev => {
                        const next = new Set(prev);
                        open ? next.add(idx) : next.delete(idx);
                        return next;
                      });
                    }}
                  >
                    <div className={`rounded-lg border p-3 ${
                      exercise.group_with_previous ? "ml-4 border-l-2 border-l-primary/50" : ""
                    }`}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {expandedExercises.has(idx) ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium truncate text-left">
                              {exercise.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {exercise.sets}×{exercise.reps}
                            </span>
                            {getConfidenceBadge(exercise.match_confidence, !!exercise.matched_exercise_id)}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-3 space-y-2">
                        {/* Match details */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Exercício na biblioteca:</label>
                          {exercise.matched_exercise_id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm flex-1">{exercise.matched_exercise_name}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7"
                                onClick={() => {
                                  handleExerciseMatch(idx, "", "");
                                  // Reset to allow re-selection
                                  setPrescriptions(prev => {
                                    const updated = [...prev];
                                    const prescription = { ...updated[selectedIndex] };
                                    const exercises = [...prescription.exercises];
                                    exercises[idx] = {
                                      ...exercises[idx],
                                      matched_exercise_id: null,
                                      matched_exercise_name: null,
                                      match_confidence: 0,
                                    };
                                    prescription.exercises = exercises;
                                    updated[selectedIndex] = prescription;
                                    return updated;
                                  });
                                }}
                              >
                                Alterar
                              </Button>
                            </div>
                          ) : (
                            <ExerciseCombobox
                              exercises={(exercisesLibrary || []).map(e => ({ id: e.id, name: e.name }))}
                              value=""
                              onValueChange={(id) => {
                                const ex = exercisesLibrary?.find(e => e.id === id);
                                if (ex) handleExerciseMatch(idx, ex.id, ex.name);
                              }}
                            />
                          )}
                        </div>

                        {/* Other matches */}
                        {exercise.matches.length > 0 && !exercise.matched_exercise_id && (
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Sugestões:</label>
                            <div className="flex flex-wrap gap-1">
                              {exercise.matches.map((m) => (
                                <Button
                                  key={m.id}
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => handleExerciseMatch(idx, m.id, m.name)}
                                >
                                  {m.name} ({m.similarity}%)
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Exercise details */}
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          {exercise.pse && <span>PSE: {exercise.pse}</span>}
                          {exercise.interval_seconds && <span>Int: {exercise.interval_seconds}s</span>}
                          {exercise.training_method && <span>Método: {exercise.training_method}</span>}
                        </div>
                        {exercise.observations && (
                          <p className="text-xs text-muted-foreground italic">{exercise.observations}</p>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === "review" && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleConfirm(selectedIndex)}
              disabled={createPrescription.isPending || matchedCount === 0}
            >
              {createPrescription.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Criar Prescrição ({matchedCount}/{totalCount} exercícios)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
