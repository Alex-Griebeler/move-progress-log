import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTrainers } from "@/hooks/useTrainers";
import { useStudents } from "@/hooks/useStudents";
import { useStudentsWithActivePrescriptions } from "@/hooks/useStudentDetail";
import { format } from "date-fns";
import { Search, UserPlus } from "lucide-react";
import { AddStudentDialog } from "./AddStudentDialog";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);

  // Buscar prescrições ativas de todos os alunos
  const studentIds = students?.map(s => s.id) || [];
  const { data: activeStudentIds } = useStudentsWithActivePrescriptions(studentIds);

  // Enriquecer estudantes com informação de prescrição ativa
  const enrichedStudents = students?.map(student => ({
    ...student,
    has_active_prescription: activeStudentIds?.has(student.id) || false,
  }));

  // Filtrar estudantes baseado no termo de busca
  const filteredStudents = enrichedStudents?.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStudentCreated = (newStudent: { id: string; name: string }) => {
    // Auto-select the newly created student
    onStudentToggle(newStudent as Student);
  };

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
          <div className="flex items-center gap-3">
            <Label>Alunos * (máximo 10)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddStudentDialog(true)}
              className="h-7 gap-1.5 text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Novo
            </Button>
          </div>
          {selectedStudents.length > 0 && (
            <Badge variant="secondary">
              {selectedStudents.length} selecionado{selectedStudents.length > 1 ? 's' : ''}
              {selectedStudents.length >= 10 && ' (máximo)'}
            </Badge>
          )}
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="session-student-search"
            name="internal-session-student-filter"
            type="text"
            role="search"
            autoComplete="chrome-off"
            data-form-type="other"
            data-lpignore="true"
            placeholder="Buscar aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto space-y-3">
          {filteredStudents?.map((student) => (
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
          {!filteredStudents?.length && enrichedStudents?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum aluno encontrado com "{searchTerm}"
            </p>
          ) : !enrichedStudents?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum aluno cadastrado
            </p>
          ) : null}
        </div>
      </div>

      <AddStudentDialog 
        open={showAddStudentDialog} 
        onOpenChange={setShowAddStudentDialog}
        onStudentCreated={handleStudentCreated}
      />
    </div>
  );
}
