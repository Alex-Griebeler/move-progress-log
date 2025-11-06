import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash } from "lucide-react";

interface ManualSessionEntryProps {
  prescriptionExercises: Array<{
    id: string;
    exercise_name: string;
    sets: string;
    reps: string;
    interval_seconds: number | null;
    pse: string | null;
    training_method: string | null;
    observations: string | null;
  }>;
  selectedStudents: Array<{
    id: string;
    name: string;
    weight_kg?: number;
  }>;
  onSave: (data: {
    studentExercises: Array<{
      studentId: string;
      exercises: Array<{
        exercise_name: string;
        sets: number;
        reps: number;
        load_kg: number | null;
        load_breakdown: string;
        observations: string;
      }>;
    }>;
  }) => void;
}

export function ManualSessionEntry({
  prescriptionExercises,
  selectedStudents,
  onSave,
}: ManualSessionEntryProps) {
  
  // Estado para armazenar os dados de execução de cada aluno
  const [studentExercises, setStudentExercises] = useState<{
    [studentId: string]: Array<{
      exercise_name: string;
      sets: number;
      reps: number;
      load_kg: number | null;
      load_breakdown: string;
      observations: string;
    }>;
  }>(() => {
    // Inicializar com os exercícios da prescrição para cada aluno
    const initial: any = {};
    selectedStudents.forEach(student => {
      initial[student.id] = prescriptionExercises.map(ex => ({
        exercise_name: ex.exercise_name,
        sets: parseInt(ex.sets) || 0,
        reps: parseInt(ex.reps) || 0,
        load_kg: null,
        load_breakdown: '',
        observations: ex.observations || '',
      }));
    });
    return initial;
  });

  const updateExercise = (
    studentId: string, 
    exerciseIndex: number, 
    field: string, 
    value: any
  ) => {
    setStudentExercises(prev => {
      const updated = { ...prev };
      updated[studentId] = [...updated[studentId]];
      updated[studentId][exerciseIndex] = {
        ...updated[studentId][exerciseIndex],
        [field]: value
      };
      return updated;
    });
  };

  const handleSubmit = () => {
    const data = {
      studentExercises: selectedStudents.map(student => ({
        studentId: student.id,
        exercises: studentExercises[student.id] || []
      }))
    };
    onSave(data);
  };

  const isValid = selectedStudents.every(student => 
    studentExercises[student.id]?.every(ex => 
      ex.reps > 0 && ex.load_breakdown
    )
  );

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Label>Alunos Selecionados</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedStudents.map(student => (
            <Badge key={student.id} variant="secondary">
              {student.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Exercícios para cada aluno */}
      {selectedStudents.map((student) => (
        <Card key={student.id}>
          <CardHeader>
            <CardTitle className="text-lg">{student.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {studentExercises[student.id]?.map((exercise, idx) => {
              const prescribedEx = prescriptionExercises[idx];
              return (
                <div key={idx} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="space-y-2 mb-3">
                    <Label className="text-xs">Nome do Exercício *</Label>
                    <Input
                      value={exercise.exercise_name}
                      onChange={(e) => updateExercise(student.id, idx, 'exercise_name', e.target.value)}
                      placeholder="Nome do exercício"
                    />
                    {prescribedEx && (
                      <p className="text-xs text-muted-foreground">
                        Prescrito: {prescribedEx.sets} séries × {prescribedEx.reps} reps
                        {prescribedEx.training_method && ` • ${prescribedEx.training_method}`}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid gap-3 md:grid-cols-4 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Séries</Label>
                      <Input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(student.id, idx, 'sets', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Reps</Label>
                      <Input
                        type="number"
                        value={exercise.reps}
                        onChange={(e) => updateExercise(student.id, idx, 'reps', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Carga (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={exercise.load_kg || ''}
                        onChange={(e) => updateExercise(student.id, idx, 'load_kg', parseFloat(e.target.value) || null)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Descrição Carga *</Label>
                      <Input
                        placeholder="Ex: 20kg"
                        value={exercise.load_breakdown}
                        onChange={(e) => updateExercise(student.id, idx, 'load_breakdown', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <Label className="text-xs">Observações</Label>
                    <Textarea
                      placeholder="Observações sobre a execução..."
                      value={exercise.observations}
                      onChange={(e) => updateExercise(student.id, idx, 'observations', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Botão Salvar */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          size="lg"
          className="gap-2"
        >
          Salvar Sessão
        </Button>
      </div>
    </div>
  );
}
