import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useTrainers } from "@/hooks/useTrainers";
import { useStudents } from "@/hooks/useStudents";
import { format } from "date-fns";

interface Student {
  id: string;
  name: string;
  has_active_prescription?: boolean;
}

interface SessionSetupFormProps {
  date: string;
  time: string;
  trainerName: string;
  selectedStudents: Student[];
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onTrainerNameChange: (trainer: string) => void;
  onStudentToggle: (student: Student) => void;
}

export function SessionSetupForm({
  date,
  time,
  trainerName,
  selectedStudents,
  onDateChange,
  onTimeChange,
  onTrainerNameChange,
  onStudentToggle,
}: SessionSetupFormProps) {
  const { data: trainers } = useTrainers();
  const { data: students } = useStudents();

  // Converter date de YYYY-MM-DD para DD/MM/YYYY para exibição
  const dateForDisplay = date ? format(new Date(date + 'T00:00:00'), 'dd/MM/yyyy') : '';
  
  const handleDateChange = (displayDate: string) => {
    // Converter de DD/MM/YYYY para YYYY-MM-DD
    const parts = displayDate.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      onDateChange(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
  };

  // Enriquecer estudantes com informação de prescrição ativa
  const enrichedStudents = students?.map(student => ({
    ...student,
    has_active_prescription: false, // TODO: buscar da tabela prescription_assignments
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Data *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Horário *</Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Treinador Responsável *</Label>
        <Select value={trainerName} onValueChange={onTrainerNameChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o treinador" />
          </SelectTrigger>
          <SelectContent>
            {trainers?.map((trainer) => (
              <SelectItem key={trainer.id} value={trainer.full_name || ''}>
                {trainer.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Alunos * (máximo 10)</Label>
          {selectedStudents.length > 0 && (
            <Badge variant="secondary">
              {selectedStudents.length} selecionado{selectedStudents.length > 1 ? 's' : ''}
              {selectedStudents.length >= 10 && ' (máximo)'}
            </Badge>
          )}
        </div>
        <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto space-y-3">
          {enrichedStudents?.map((student) => (
            <div key={student.id} className="flex items-center space-x-2">
              <Checkbox
                id={`student-${student.id}`}
                checked={selectedStudents.some(s => s.id === student.id)}
                onCheckedChange={() => onStudentToggle(student)}
                disabled={selectedStudents.length >= 10 && !selectedStudents.some(s => s.id === student.id)}
              />
              <label
                htmlFor={`student-${student.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2 flex-1"
              >
                {student.name}
                {student.has_active_prescription && (
                  <Badge variant="secondary" className="text-xs">Com prescrição</Badge>
                )}
              </label>
            </div>
          ))}
          {!enrichedStudents?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum aluno cadastrado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
