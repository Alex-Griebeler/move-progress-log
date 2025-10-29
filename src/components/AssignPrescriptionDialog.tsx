import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAssignPrescription } from "@/hooks/usePrescriptions";
import { useStudents } from "@/hooks/useStudents";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface AssignPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescriptionId: string | null;
}

export function AssignPrescriptionDialog({
  open,
  onOpenChange,
  prescriptionId,
}: AssignPrescriptionDialogProps) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);

  const weekdays = [
    { value: "monday", label: "Seg" },
    { value: "tuesday", label: "Ter" },
    { value: "wednesday", label: "Qua" },
    { value: "thursday", label: "Qui" },
    { value: "friday", label: "Sex" },
    { value: "saturday", label: "Sáb" },
    { value: "sunday", label: "Dom" },
  ];

  const { data: students } = useStudents();
  const assignPrescription = useAssignPrescription();

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleWeekday = (weekday: string) => {
    setSelectedWeekdays((prev) =>
      prev.includes(weekday)
        ? prev.filter((day) => day !== weekday)
        : [...prev, weekday]
    );
  };

  const handleSubmit = async () => {
    if (!prescriptionId || selectedStudents.length === 0 || !startDate) {
      return;
    }

    await assignPrescription.mutateAsync({
      prescription_id: prescriptionId,
      student_ids: selectedStudents,
      start_date: startDate,
      end_date: endDate || undefined,
      custom_adaptations: selectedWeekdays.length > 0 ? { weekdays: selectedWeekdays } : undefined,
    });

    setSelectedStudents([]);
    setStartDate("");
    setEndDate("");
    setSelectedWeekdays([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atribuir Prescrição aos Alunos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Selecione os Alunos</Label>
            <ScrollArea className="h-[200px] border rounded-md p-4">
              <div className="space-y-3">
                {students?.map((student) => (
                  <div key={student.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={student.id}
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => toggleStudent(student.id)}
                    />
                    <label
                      htmlFor={student.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {student.name}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dias da Semana
            </Label>
            <div className="flex flex-wrap gap-2">
              {weekdays.map((day) => (
                <Badge
                  key={day.value}
                  variant={selectedWeekdays.includes(day.value) ? "default" : "outline"}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleWeekday(day.value)}
                >
                  {day.label}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione os dias em que o treino será realizado
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              assignPrescription.isPending ||
              selectedStudents.length === 0 ||
              !startDate
            }
          >
            {assignPrescription.isPending ? "Atribuindo..." : "Atribuir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
