import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Plus, Trash } from "lucide-react";
import { SessionExercise } from "@/types/sessionRecording";
import { calculateLoadFromBreakdown } from "@/utils/loadCalculation";
import { notify } from "@/lib/notify";
import { formatKg } from "@/utils/displayFormat";
import { LOAD_BREAKDOWN_LABEL, LOAD_BREAKDOWN_PLACEHOLDER, LOAD_TOTAL_LABEL } from "./loadCopy";

interface ExerciseEditorProps {
  exercises: SessionExercise[];
  onExercisesChange: (exercises: SessionExercise[]) => void;
  onOpenExerciseSelection: (index: number) => void;
  /** If true, sets are required (e.g. free session without prescription) */
  requireSets?: boolean;
  /** Whether to auto-calculate load from breakdown on change */
  autoCalculateLoad?: boolean;
}

export function ExerciseEditor({
  exercises,
  onExercisesChange,
  onOpenExerciseSelection,
  requireSets = false,
  autoCalculateLoad = false,
}: ExerciseEditorProps) {
  const updateExercise = (index: number, updates: Partial<SessionExercise>) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], ...updates };
    onExercisesChange(updated);
  };

  const removeExercise = (index: number) => {
    onExercisesChange(exercises.filter((_, i) => i !== index));
  };

  const addExercise = () => {
    onExercisesChange([
      ...exercises,
      {
        executed_exercise_name: '',
        sets: null,
        reps: null,
        // Reserva inicia vazia — coach preenche manualmente; nunca inferido.
        reserve_reps: null,
        load_kg: null,
        load_breakdown: '',
        observations: null,
        is_best_set: true,
      },
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2">
          Exercícios executados
          <Button size="sm" variant="outline" className="min-h-10" onClick={addExercise}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar exercício
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {exercises.map((ex, idx) => (
          <div key={idx} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Exercício {idx + 1}</Label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeExercise(idx)}
                aria-label={`Remover exercício ${idx + 1}`}
                title="Remover exercício"
                className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>

            {/* Name + Replace */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">Exercício *</Label>
                <div className="flex gap-2">
                  <Input
                    value={ex.executed_exercise_name}
                    readOnly
                    placeholder="Escolha no catálogo"
                    className="flex-1"
                    title="Use o botão ao lado para escolher o exercício"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onOpenExerciseSelection(idx)}
                    className="h-10 w-10 shrink-0"
                    aria-label="Escolher exercício cadastrado"
                    title="Escolher exercício cadastrado"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs" htmlFor={`ee-reps-${idx}`}>
                  Reps <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`ee-reps-${idx}`}
                  type="number"
                  inputMode="numeric"
                  value={ex.reps ?? ''}
                  onChange={(e) =>
                    updateExercise(idx, {
                      reps: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Obrigatório"
                  className={
                    ex.reps === 0 || ex.reps === null
                      ? 'number-input-clean min-h-11 text-base border-destructive text-center focus:border-destructive'
                      : 'number-input-clean min-h-11 text-base text-center'
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1" htmlFor={`ee-sets-${idx}`}>
                  Séries
                  {requireSets && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id={`ee-sets-${idx}`}
                  type="number"
                  inputMode="numeric"
                  value={ex.sets ?? ''}
                  onChange={(e) =>
                    updateExercise(idx, {
                      sets: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={requireSets ? 'Obrigatório' : 'Auto'}
                  className={
                    requireSets && (ex.sets === null || ex.sets === 0)
                      ? 'number-input-clean min-h-11 text-base border-destructive text-center focus:border-destructive'
                      : 'number-input-clean min-h-11 text-base text-center'
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs" htmlFor={`ee-total-${idx}`}>{LOAD_TOTAL_LABEL}</Label>
                <Input
                  id={`ee-total-${idx}`}
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={ex.load_kg ?? ''}
                  onChange={(e) =>
                    updateExercise(idx, {
                      load_kg: e.target.value ? parseFloat(e.target.value.replace(',', '.')) : null,
                    })
                  }
                  className="number-input-clean min-h-11 text-base text-center font-mono"
                />
              </div>
            </div>

            {/* Load Breakdown */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1" htmlFor={`ee-breakdown-${idx}`}>
                {LOAD_BREAKDOWN_LABEL}
                <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`ee-breakdown-${idx}`}
                  value={ex.load_breakdown || ''}
                  onChange={(e) => {
                    const newBreakdown = e.target.value;
                    const updates: Partial<SessionExercise> = { load_breakdown: newBreakdown };
                    if (autoCalculateLoad) {
                      const calculated = calculateLoadFromBreakdown(newBreakdown);
                      if (calculated !== null) {
                        updates.load_kg = calculated;
                      }
                    }
                    updateExercise(idx, updates);
                  }}
                  placeholder={LOAD_BREAKDOWN_PLACEHOLDER}
                  className={
                    !ex.load_breakdown || ex.load_kg === null || ex.load_kg === 0
                      ? 'min-h-11 text-base border-destructive focus:border-destructive'
                      : 'min-h-11 text-base'
                  }
                />
                {!autoCalculateLoad && (
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => {
                      if (ex.load_breakdown) {
                        const calculated = calculateLoadFromBreakdown(ex.load_breakdown);
                        if (calculated !== null) {
                          updateExercise(idx, { load_kg: calculated });
                          notify.info('Carga calculada', { description: formatKg(calculated) });
                        }
                      }
                    }}
                  >
                    Calcular
                  </Button>
                )}
              </div>

            </div>

            {/* Observations */}
            <div className="space-y-2">
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={ex.observations ?? ''}
                onChange={(e) =>
                  updateExercise(idx, { observations: e.target.value || null })
                }
                rows={2}
                placeholder="Observações técnicas..."
              />
            </div>

            {/* Melhor série: alvo de toque inteiro na linha (checkbox + rótulo) */}
            <label
              htmlFor={`ee-best-${idx}`}
              className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                id={`ee-best-${idx}`}
                checked={ex.is_best_set}
                onCheckedChange={(checked) => updateExercise(idx, { is_best_set: checked === true })}
              />
              Melhor série
            </label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
