import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAssignPrescription } from "@/hooks/usePrescriptions";
import { useStudents } from "@/hooks/useStudents";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [time, setTime] = useState("");

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
    if (!prescriptionId || selectedStudents.length === 0 || !dateRange?.from) {
      return;
    }

    const customAdaptations: any = {};
    if (selectedWeekdays.length > 0) {
      customAdaptations.weekdays = selectedWeekdays;
    }
    if (time) {
      customAdaptations.time = time;
    }

    await assignPrescription.mutateAsync({
      prescription_id: prescriptionId,
      student_ids: selectedStudents,
      start_date: format(dateRange.from, "yyyy-MM-dd"),
      end_date: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
      custom_adaptations: Object.keys(customAdaptations).length > 0 ? customAdaptations : undefined,
    });

    setSelectedStudents([]);
    setDateRange(undefined);
    setSelectedWeekdays([]);
    setTime("");
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

          <div className="space-y-2">
            <Label>Período da Prescrição *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
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

          <div className="space-y-2">
            <Label htmlFor="time">Horário do Treino (opcional)</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="Ex: 08:00"
            />
            <p className="text-xs text-muted-foreground">
              Defina um horário específico ou deixe vazio para treinos em múltiplos horários
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
              !dateRange?.from
            }
          >
            {assignPrescription.isPending ? "Atribuindo..." : "Atribuir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
