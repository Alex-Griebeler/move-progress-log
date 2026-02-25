import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Monitor } from "lucide-react";
import { WorkoutPrescription, PrescriptionExercise } from "@/hooks/usePrescriptions";

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

export const PrescriptionTVMode = ({ open, onClose, prescription, exercises }: PrescriptionTVModeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const groups = groupExercises(exercises);
  const intensityLabel = prescription.prescription_type === "individual" ? "Carga" : "PSE";

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col overflow-auto animate-fade-in"
      style={{ background: "#0a0a0a", color: "#f0f0f0" }}
      role="dialog"
      aria-modal="true"
      aria-label={`Modo TV — ${prescription.name}`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-10 py-6 shrink-0"
        style={{ borderBottom: "1px solid #222" }}
      >
        <div className="flex items-center gap-4">
          <Monitor className="h-8 w-8" style={{ color: "#888" }} />
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{prescription.name}</h1>
            {prescription.objective && (
              <p className="text-xl mt-1" style={{ color: "#999" }}>{prescription.objective}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="lg"
          onClick={onClose}
          className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          style={{ color: "#888" }}
          aria-label="Sair do modo TV"
        >
          <X className="h-6 w-6 mr-2" />
          <span className="text-lg">ESC</span>
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 px-10 py-8">
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #333" }}>
          <table className="w-full text-lg">
            <thead>
              <tr style={{ background: "#161616", borderBottom: "1px solid #333" }}>
                <th className="font-bold text-xl text-center uppercase tracking-wider py-5 px-6" style={{ color: "#ccc" }}>Exercício</th>
                <th className="font-bold text-xl text-center uppercase tracking-wider py-5 px-6" style={{ color: "#ccc" }}>Sets × Reps / Int</th>
                <th className="font-bold text-xl text-center uppercase tracking-wider py-5 px-6" style={{ color: "#ccc" }}>{intensityLabel}</th>
                <th className="font-bold text-xl text-center uppercase tracking-wider py-5 px-6" style={{ color: "#ccc" }}>Método</th>
                <th className="font-bold text-xl text-center uppercase tracking-wider py-5 px-6" style={{ color: "#ccc" }}>OBS</th>
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
                      style={{
                        borderBottom: group.isGroup && !isLastInGroup ? "none" : "1px solid #222",
                        borderLeft: group.isGroup ? "4px solid hsl(var(--primary) / 0.6)" : undefined,
                      }}
                    >
                      <td className="font-semibold text-xl text-center py-5 px-6" style={{ color: "#f0f0f0" }}>
                        {exercise.exercise_name}
                      </td>
                      <td className="text-center font-bold text-xl whitespace-nowrap py-5 px-6" style={{ color: "#e0e0e0" }}>
                        {setsRepsInt}
                      </td>
                      <td className="text-center py-5 px-6">
                        {intensityValue ? (
                          <span className="text-xl font-semibold" style={{ color: "#e0e0e0" }}>{intensityValue}</span>
                        ) : (
                          <span style={{ color: "#555" }}>—</span>
                        )}
                      </td>
                      {!(group.isGroup && !isFirstInGroup) && (
                        <td
                          className="text-center py-5 px-6"
                          rowSpan={group.isGroup && isFirstInGroup ? group.exercises.length : undefined}
                        >
                          {exercise.training_method ? (
                            <Badge
                              className="text-base"
                              style={{ background: "#2a2a2a", color: "#ccc", border: "1px solid #444" }}
                            >
                              {exercise.training_method}
                            </Badge>
                          ) : (
                            <span style={{ color: "#555" }}>—</span>
                          )}
                        </td>
                      )}
                      <td className="text-lg text-center max-w-md py-5 px-6" style={{ color: "#999" }}>
                        {exercise.observations || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="px-10 py-4 text-center shrink-0" style={{ borderTop: "1px solid #222" }}>
        <p className="text-sm" style={{ color: "#555" }}>
          Pressione ESC para sair do modo TV
        </p>
      </div>
    </div>,
    document.body
  );
};
