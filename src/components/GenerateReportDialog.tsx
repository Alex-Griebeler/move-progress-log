import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGenerateReport } from "@/hooks/useStudentReports";
import { useExercisesLibrary } from "@/hooks/useExercisesLibrary";
import { Loader2, FileText, Calendar, TrendingUp } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const normalizeComparableText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export function GenerateReportDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: GenerateReportDialogProps) {
  const [periodType, setPeriodType] = useState<string>("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [highlights, setHighlights] = useState("");
  const [attentionPoints, setAttentionPoints] = useState("");
  const [nextCyclePlan, setNextCyclePlan] = useState("");
  const [periodExerciseIds, setPeriodExerciseIds] = useState<string[]>([]);
  const [isLoadingPeriodExercises, setIsLoadingPeriodExercises] = useState(false);

  const generateReport = useGenerateReport();
  const { data: exercisesLibrary } = useExercisesLibrary();
  const eligibleExercises = useMemo(
    () =>
      exercisesLibrary?.filter((exercise) => {
        const category = normalizeComparableText(exercise.category || "");
        return (category.includes("forca") || category.includes("hipertrofia")) && !category.includes("potencia");
      }) || [],
    [exercisesLibrary]
  );

  const resolvePeriodRange = useCallback((): { periodStart: string; periodEnd: string } | null => {
    if (periodType === "custom") {
      if (!customStart || !customEnd) return null;
      return { periodStart: customStart, periodEnd: customEnd };
    }
    const days = parseInt(periodType);
    if (Number.isNaN(days) || days <= 0) return null;
    const periodEnd = format(new Date(), "yyyy-MM-dd");
    const periodStart = format(subDays(new Date(), days - 1), "yyyy-MM-dd");
    return { periodStart, periodEnd };
  }, [periodType, customStart, customEnd]);

  useEffect(() => {
    const loadExercisesExecutedInPeriod = async () => {
      if (!open || !studentId || eligibleExercises.length === 0) {
        setPeriodExerciseIds([]);
        return;
      }

      const range = resolvePeriodRange();
      if (!range) {
        setPeriodExerciseIds([]);
        return;
      }

      setIsLoadingPeriodExercises(true);
      try {
        const { data, error } = await supabase
          .from("workout_sessions")
          .select("exercises(exercise_name)")
          .eq("student_id", studentId)
          .gte("date", range.periodStart)
          .lte("date", range.periodEnd);

        if (error) throw error;

        const executedNames = new Set(
          ((data || []) as Array<{ exercises: Array<{ exercise_name: string }> | null }>)
            .flatMap((session) => session.exercises || [])
            .map((exercise) => normalizeComparableText(exercise.exercise_name))
            .filter(Boolean)
        );

        const idsInPeriod = eligibleExercises
          .filter((exercise) => executedNames.has(normalizeComparableText(exercise.name)))
          .map((exercise) => exercise.id);

        setPeriodExerciseIds(idsInPeriod);
        setSelectedExercises((prev) => prev.filter((exerciseId) => idsInPeriod.includes(exerciseId)));
      } catch {
        // Fallback safe: keep list empty and let backend validation decide.
        setPeriodExerciseIds([]);
      } finally {
        setIsLoadingPeriodExercises(false);
      }
    };

    void loadExercisesExecutedInPeriod();
  }, [open, studentId, eligibleExercises, resolvePeriodRange]);

  const selectableExercises = useMemo(
    () => eligibleExercises.filter((exercise) => periodExerciseIds.includes(exercise.id)),
    [eligibleExercises, periodExerciseIds]
  );

  const handleGenerate = async () => {
    let periodStart: string;
    let periodEnd: string;

    if (periodType === "custom") {
      periodStart = customStart;
      periodEnd = customEnd;
    } else {
      const days = parseInt(periodType);
      periodEnd = format(new Date(), "yyyy-MM-dd");
      periodStart = format(subDays(new Date(), days - 1), "yyyy-MM-dd");
    }

    if (!periodStart || !periodEnd) {
      toast.error("Selecione um período válido");
      return;
    }

    if (periodType === "custom") {
      if (periodStart > periodEnd) {
        toast.error("A data inicial deve ser anterior à data final");
        return;
      }
      const start = new Date(`${periodStart}T00:00:00`);
      const end = new Date(`${periodEnd}T00:00:00`);
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (days < 7) {
        toast.error("O período mínimo para relatório é de 7 dias");
        return;
      }
    }

    if (selectedExercises.length === 0) {
      toast.error("Selecione pelo menos 1 exercício");
      return;
    }

    const invalidSelected = selectedExercises.filter(
      (exerciseId) => !selectableExercises.some((exercise) => exercise.id === exerciseId)
    );
    if (invalidSelected.length > 0) {
      toast.error("Selecione apenas exercícios de força/hipertrofia executados no período");
      return;
    }
    try {
      await generateReport.mutateAsync({
        studentId,
        periodStart,
        periodEnd,
        trackedExercises: selectedExercises,
        trainerNotes: {
          highlights: highlights || undefined,
          attentionPoints: attentionPoints || undefined,
          nextCyclePlan: nextCyclePlan || undefined,
        },
      });

      onOpenChange(false);
      // Reset form
      setPeriodType("30");
      setSelectedExercises([]);
      setHighlights("");
      setAttentionPoints("");
      setNextCyclePlan("");
    } catch {
      // Error feedback is handled in mutation onError.
    }
  };

  const toggleExercise = (exerciseId: string) => {
    setSelectedExercises((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gerar Relatório - {studentName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Period Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Período de Análise
            </Label>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="custom">Período Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {periodType === "custom" && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Exercise Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Exercícios para Acompanhar (2-4 recomendado)
            </Label>
            <p className="text-sm text-muted-foreground">
              Selecione os exercícios principais para análise de evolução de carga
            </p>
            <ScrollArea className="h-[200px] border rounded-md p-4">
              <div className="space-y-2">
                {selectableExercises.map((exercise) => (
                  <div key={exercise.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={exercise.id}
                      checked={selectedExercises.includes(exercise.id)}
                      onCheckedChange={() => toggleExercise(exercise.id)}
                    />
                    <label
                      htmlFor={exercise.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {exercise.name}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {!isLoadingPeriodExercises && selectableExercises.length === 0 && (
              <p className="text-xs text-amber-600">
                Nenhum exercício de força/hipertrofia executado no período selecionado.
              </p>
            )}
            {isLoadingPeriodExercises && (
              <p className="text-xs text-muted-foreground">Carregando exercícios executados no período...</p>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedExercises.length} exercício(s) selecionado(s)
            </p>
          </div>

          {/* Trainer Notes (Optional) */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-sm">Notas do Treinador (Opcional)</h3>
            
            <div className="space-y-2">
              <Label>Destaques Positivos</Label>
              <Textarea
                placeholder="Ex: Evolução consistente na força, melhora da técnica..."
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Pontos de Atenção</Label>
              <Textarea
                placeholder="Ex: Dificuldade em determinado movimento, necessidade de trabalho de mobilidade..."
                value={attentionPoints}
                onChange={(e) => setAttentionPoints(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Plano para o Próximo Ciclo</Label>
              <Textarea
                placeholder="Ex: Foco em ganho de força em exercícios compostos, introdução de novos padrões..."
                value={nextCyclePlan}
                onChange={(e) => setNextCyclePlan(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={generateReport.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateReport.isPending || selectedExercises.length === 0}
          >
            {generateReport.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              "Gerar Relatório"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
