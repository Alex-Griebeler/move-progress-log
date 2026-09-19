import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { siglasInNames } from "@/constants/exerciseSiglas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Monitor } from "lucide-react";
import { WorkoutPrescription, PrescriptionExercise } from "@/hooks/usePrescriptions";
import { ExerciseLoadHistoryPopover } from "@/components/ExerciseLoadHistoryPopover";

interface PrescriptionTVModeProps {
  open: boolean;
  onClose: () => void;
  prescription: WorkoutPrescription;
  exercises: PrescriptionExercise[];
}

const groupExercises = (exercises: PrescriptionExercise[]) => {
  const groups: Array<{ exercises: PrescriptionExercise[]; isGroup: boolean }> = [];
  let currentGroup: PrescriptionExercise[] = [];

  exercises.forEach((exercise, index) => {
    if (index === 0) {
      currentGroup = [exercise];
    } else if (exercise.group_with_previous) {
      currentGroup.push(exercise);
    } else {
      if (currentGroup.length > 0) {
        groups.push({ exercises: currentGroup, isGroup: currentGroup.length > 1 });
      }
      currentGroup = [exercise];
    }
  });

  if (currentGroup.length > 0) {
    groups.push({ exercises: currentGroup, isGroup: currentGroup.length > 1 });
  }

  return groups;
};

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const PrescriptionTVMode = ({ open, onClose, prescription, exercises }: PrescriptionTVModeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Esc fecha; Tab fica preso dentro do overlay (é um diálogo modal).
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key !== "Tab" || !containerRef.current) return;
    const focusables = Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (!active || !containerRef.current.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown);
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      previouslyFocused?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const groups = groupExercises(exercises);
  const intensityLabel = prescription.prescription_type === "individual" ? "Carga" : "PSE";
  const hasAnyObservations = groups.some((g) =>
    g.exercises.some((ex) => ex.observations?.trim())
  );

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label={`Modo TV — ${prescription.name}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-10 sm:py-6 shrink-0 border-b border-border">
        <div className="flex min-w-0 items-center gap-4">
          <Monitor className="hidden h-8 w-8 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{prescription.name}</h1>
            {prescription.objective && (
              <p className="text-base mt-1 text-muted-foreground sm:text-xl">{prescription.objective}</p>
            )}
          </div>
        </div>
        <Button
          ref={closeButtonRef}
          variant="outline"
          size="lg"
          onClick={onClose}
          className="shrink-0"
          aria-label="Sair do modo TV"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          Sair
        </Button>
      </div>

      {/* Tabela: rolagem horizontal própria quando não cabe (tablet em
          retrato) — nenhuma coluna é cortada. */}
      <div className="flex-1 px-4 py-6 sm:px-10 sm:py-8">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-lg">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="font-semibold text-lg text-center py-4 px-4 text-muted-foreground">Exercício</th>
                <th className="font-semibold text-lg text-center py-4 px-4 text-muted-foreground">Séries × reps / intervalo</th>
                <th className="font-semibold text-lg text-center py-4 px-4 text-muted-foreground">{intensityLabel}</th>
                {prescription.prescription_type === 'individual' && (
                  <th className="font-semibold text-lg text-center py-4 px-4 text-muted-foreground">Reserva</th>
                )}
                <th className="font-semibold text-lg text-center py-4 px-4 text-muted-foreground">Método</th>
                {hasAnyObservations && (
                  <th className="font-semibold text-lg text-center py-4 px-4 text-muted-foreground">Observações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) =>
                group.exercises.map((exercise, exIndex) => {
                  const isFirstInGroup = exIndex === 0;
                  const isLastInGroup = exIndex === group.exercises.length - 1;

                  const setsReps = `${exercise.sets} × ${exercise.reps}`;
                  const interval = exercise.interval_seconds ? ` / ${exercise.interval_seconds}s` : "";
                  const setsRepsInt = `${setsReps}${interval}`;

                  const intensityValue =
                    prescription.prescription_type === "individual" ? exercise.load : exercise.pse;

                  return (
                    <tr
                      key={exercise.id}
                      className={`${group.isGroup && !isLastInGroup ? "" : "border-b border-border/50"} ${group.isGroup ? "border-l-4 border-l-primary/60" : ""}`}
                    >
                      <td className="font-semibold text-xl py-5 px-6 text-foreground">
                        {exercise.exercise_name}
                      </td>
                      <td className="text-center font-bold text-xl whitespace-nowrap py-5 px-6 text-foreground/90">
                        {setsRepsInt}
                      </td>
                      <td className="text-center py-5 px-6">
                        <ExerciseLoadHistoryPopover
                          exerciseName={exercise.exercise_name}
                          exerciseLibraryId={exercise.exercise_library_id}
                          prescriptionId={prescription.id}
                        >
                          {intensityValue ? (
                            <span className="text-xl font-semibold text-foreground/90">{intensityValue}</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </ExerciseLoadHistoryPopover>
                      </td>
                      {prescription.prescription_type === 'individual' && (
                        <td className="text-center py-5 px-6">
                          {exercise.rir ? (
                            <span className="text-xl font-semibold text-foreground/90">{exercise.rir}</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                      )}
                      {!(group.isGroup && !isFirstInGroup) && (
                        <td
                          className="text-center py-5 px-6"
                          rowSpan={group.isGroup && isFirstInGroup ? group.exercises.length : undefined}
                        >
                          {exercise.training_method ? (
                            <Badge className="text-base bg-muted text-muted-foreground border border-border">
                              {exercise.training_method}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                      )}
                      {hasAnyObservations && (
                        <td className="text-lg text-center max-w-md py-5 px-6 text-muted-foreground">
                          {exercise.observations || "—"}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer — legenda de siglas (dicionário canônico) + atalho */}
      <div className="px-10 py-4 text-center shrink-0 border-t border-border space-y-1">
        {(() => {
          const legenda = siglasInNames(exercises.map((ex) => ex.exercise_name));
          if (legenda.length === 0) return null;
          return (
            <p className="text-sm text-muted-foreground/80">
              {legenda.map(([sigla, significado]) => `${sigla} = ${significado}`).join("  ·  ")}
            </p>
          );
        })()}
        {/* Só faz sentido com teclado físico; no toque o botão "Sair" basta. */}
        <p className="hidden text-sm text-muted-foreground [@media(pointer:fine)]:block">
          Esc também fecha o modo TV
        </p>
      </div>
    </div>,
    document.body
  );
};
