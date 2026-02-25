import { useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Monitor } from "lucide-react";
import { WorkoutPrescription, PrescriptionExercise } from "@/hooks/usePrescriptions";
import { motion, AnimatePresence } from "framer-motion";

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
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const groups = groupExercises(exercises);
  const intensityLabel = prescription.prescription_type === "individual" ? "Carga" : "PSE";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex flex-col bg-[#0a0a0a] text-[#f0f0f0] overflow-auto"
          role="dialog"
          aria-modal="true"
          aria-label={`Modo TV — ${prescription.name}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-10 py-6 border-b border-[#222]">
            <div className="flex items-center gap-4">
              <Monitor className="h-8 w-8 text-[#888]" />
              <div>
                <h1 className="text-4xl font-bold tracking-tight">{prescription.name}</h1>
                {prescription.objective && (
                  <p className="text-xl text-[#999] mt-1">{prescription.objective}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="lg"
              onClick={onClose}
              className="text-[#888] hover:text-[#f0f0f0] hover:bg-[#222] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
              aria-label="Sair do modo TV"
            >
              <X className="h-6 w-6 mr-2" />
              <span className="text-lg">ESC</span>
            </Button>
          </div>

          {/* Table */}
          <div className="flex-1 px-10 py-8">
            <div className="rounded-lg border border-[#333] overflow-hidden">
              <Table className="text-lg">
                <TableHeader>
                  <TableRow className="bg-[#161616] border-b border-[#333] hover:bg-[#161616]">
                    <TableHead className="font-bold text-xl text-[#ccc] py-5 px-6">Exercício</TableHead>
                    <TableHead className="font-bold text-xl text-[#ccc] text-center py-5 px-6">Sets × Reps / Int</TableHead>
                    <TableHead className="font-bold text-xl text-[#ccc] text-center py-5 px-6">{intensityLabel}</TableHead>
                    <TableHead className="font-bold text-xl text-[#ccc] text-center py-5 px-6">Método</TableHead>
                    <TableHead className="font-bold text-xl text-[#ccc] py-5 px-6">Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                        <TableRow
                          key={exercise.id}
                          className={`border-b border-[#222] hover:bg-[#1a1a1a] ${
                            group.isGroup && !isLastInGroup ? "border-b-0" : ""
                          }`}
                          style={
                            group.isGroup
                              ? { borderLeft: "4px solid hsl(var(--primary) / 0.6)" }
                              : undefined
                          }
                        >
                          <TableCell className="font-semibold text-xl py-5 px-6 text-[#f0f0f0]">
                            {exercise.exercise_name}
                          </TableCell>
                          <TableCell className="text-center font-bold text-xl whitespace-nowrap py-5 px-6 text-[#e0e0e0]">
                            {setsRepsInt}
                          </TableCell>
                          <TableCell className="text-center py-5 px-6">
                            {intensityValue ? (
                              <span className="text-xl font-semibold text-[#e0e0e0]">{intensityValue}</span>
                            ) : (
                              <span className="text-[#555]">—</span>
                            )}
                          </TableCell>
                          {!(group.isGroup && !isFirstInGroup) && (
                            <TableCell
                              className="text-center py-5 px-6"
                              rowSpan={group.isGroup && isFirstInGroup ? group.exercises.length : undefined}
                            >
                              {exercise.training_method ? (
                                <Badge className="text-base bg-[#2a2a2a] text-[#ccc] border border-[#444] hover:bg-[#333]">
                                  {exercise.training_method}
                                </Badge>
                              ) : (
                                <span className="text-[#555]">—</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-lg text-[#999] max-w-md py-5 px-6">
                            {exercise.observations || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer */}
          <div className="px-10 py-4 border-t border-[#222] text-center">
            <p className="text-sm text-[#555]">
              Pressione ESC para sair do modo TV
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
