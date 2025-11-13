import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash, ChevronLeft, ChevronRight, Calculator } from "lucide-react";

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
  onCancel?: () => void;
}

export function ManualSessionEntry({
  prescriptionExercises,
  selectedStudents,
  onSave,
  onCancel,
}: ManualSessionEntryProps) {
  
  // Estado para controlar o aluno atual (visualização página por página)
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  
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

  const currentStudent = selectedStudents[currentStudentIndex];

  const updateExercise = (
    studentId: string, 
    exerciseIndex: number, 
    field: string, 
    value: any
  ) => {
    setStudentExercises(prev => {
      const updated = { ...prev };
      updated[studentId] = [...updated[studentId]];
      
      // Se estiver atualizando load_breakdown, calcular automaticamente load_kg se for peso corporal
      if (field === 'load_breakdown') {
        const student = selectedStudents.find(s => s.id === studentId);
        const isPesoCorporal = value.toLowerCase().includes('peso corporal') || 
                               value.toLowerCase().includes('corporal');
        
        updated[studentId][exerciseIndex] = {
          ...updated[studentId][exerciseIndex],
          [field]: value,
          load_kg: isPesoCorporal && student?.weight_kg ? student.weight_kg : updated[studentId][exerciseIndex].load_kg
        };
      } else {
        updated[studentId][exerciseIndex] = {
          ...updated[studentId][exerciseIndex],
          [field]: value
        };
      }
      
      return updated;
    });
  };

  const removeExercise = (studentId: string, exerciseIndex: number) => {
    setStudentExercises(prev => {
      const updated = { ...prev };
      updated[studentId] = updated[studentId].filter((_, i) => i !== exerciseIndex);
      return updated;
    });
  };

  // Função para calcular a carga baseada na descrição
  const calculateLoadFromDescription = (studentId: string, exerciseIndex: number) => {
    const exercise = studentExercises[studentId]?.[exerciseIndex];
    if (!exercise?.load_breakdown) return;

    const description = exercise.load_breakdown.toLowerCase().trim();
    const student = selectedStudents.find(s => s.id === studentId);
    let calculatedLoad: number | null = null;

    // Peso corporal
    if (description.includes('peso corporal') || description.includes('corporal')) {
      calculatedLoad = student?.weight_kg || null;
    }
    // Elástico/banda - não tem peso mensurável
    else if (description.includes('elástico') || description.includes('banda')) {
      calculatedLoad = null;
    }
    // Formato: "2x10kg" ou "2 x 10kg"
    else if (/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*kg/i.test(description)) {
      const match = description.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*kg/i);
      if (match) {
        const quantity = parseInt(match[1]);
        const weight = parseFloat(match[2]);
        calculatedLoad = quantity * weight;
      }
    }
    // Formato: "10kg cada lado" ou "10kg each side"
    else if (/(\d+(?:\.\d+)?)\s*kg\s*(cada|each)/i.test(description)) {
      const match = description.match(/(\d+(?:\.\d+)?)\s*kg/i);
      if (match) {
        calculatedLoad = parseFloat(match[1]) * 2;
      }
    }
    // Formato simples: "20kg" ou "20.5kg"
    else if (/(\d+(?:\.\d+)?)\s*kg/i.test(description)) {
      const match = description.match(/(\d+(?:\.\d+)?)\s*kg/i);
      if (match) {
        calculatedLoad = parseFloat(match[1]);
      }
    }
    // Formato em libras: "20lb" ou "20lbs"
    else if (/(\d+(?:\.\d+)?)\s*lbs?/i.test(description)) {
      const match = description.match(/(\d+(?:\.\d+)?)\s*lbs?/i);
      if (match) {
        // Converter libras para kg (1 lb = 0.453592 kg)
        calculatedLoad = parseFloat(match[1]) * 0.453592;
      }
    }

    // Atualizar o campo load_kg com o valor calculado
    if (calculatedLoad !== null) {
      updateExercise(studentId, exerciseIndex, 'load_kg', calculatedLoad);
    }
  };

  const goToNextStudent = () => {
    if (currentStudentIndex < selectedStudents.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
    }
  };

  const goToPreviousStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(prev => prev - 1);
    }
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
      ex.exercise_name && ex.sets > 0 && ex.reps > 0 && ex.load_breakdown
    )
  );

  const getValidationErrors = (studentId: string, exerciseIdx: number) => {
    const exercise = studentExercises[studentId]?.[exerciseIdx];
    if (!exercise) return [];
    
    const errors: string[] = [];
    if (!exercise.exercise_name) errors.push("Nome obrigatório");
    if (exercise.sets <= 0) errors.push("Séries deve ser > 0");
    if (exercise.reps <= 0) errors.push("Reps deve ser > 0");
    if (!exercise.load_breakdown) errors.push("Descrição da carga obrigatória");
    
    return errors;
  };

  return (
    <div className="space-y-6">
      {/* Navegação entre alunos */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousStudent}
          disabled={currentStudentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Aluno {currentStudentIndex + 1} de {selectedStudents.length}
          </p>
          <h3 className="text-lg font-semibold">{currentStudent.name}</h3>
          {currentStudent.weight_kg && (
            <p className="text-xs text-muted-foreground">Peso: {currentStudent.weight_kg} kg</p>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextStudent}
          disabled={currentStudentIndex === selectedStudents.length - 1}
        >
          Próximo
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Exercícios do aluno atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Exercícios - {currentStudent.name}</span>
            <Badge variant="secondary">
              {studentExercises[currentStudent.id]?.length || 0} exercícios
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {studentExercises[currentStudent.id]?.map((exercise, idx) => {
              const prescribedEx = prescriptionExercises[idx];
              return (
                <div key={idx} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Nome do Exercício *</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExercise(currentStudent.id, idx)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        value={exercise.exercise_name}
                        onChange={(e) => updateExercise(currentStudent.id, idx, 'exercise_name', e.target.value)}
                        placeholder="Nome do exercício"
                        className={!exercise.exercise_name ? "border-destructive" : ""}
                      />
                      {prescribedEx && (
                        <p className="text-xs text-muted-foreground">
                          Prescrito: {prescribedEx.sets} séries × {prescribedEx.reps} reps
                          {prescribedEx.training_method && ` • ${prescribedEx.training_method}`}
                        </p>
                      )}
                      {getValidationErrors(currentStudent.id, idx).length > 0 && (
                        <p className="text-xs text-destructive">
                          {getValidationErrors(currentStudent.id, idx).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid gap-3 md:grid-cols-4 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Séries *</Label>
                      <Input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(currentStudent.id, idx, 'sets', parseInt(e.target.value) || 0)}
                        min="1"
                        className={exercise.sets <= 0 ? "border-destructive" : ""}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Reps *</Label>
                      <Input
                        type="number"
                        value={exercise.reps}
                        onChange={(e) => updateExercise(currentStudent.id, idx, 'reps', parseInt(e.target.value) || 0)}
                        min="1"
                        className={exercise.reps <= 0 ? "border-destructive" : ""}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Descrição Carga *</Label>
                      <div className="flex gap-1">
                        <Input
                          placeholder="Ex: 20kg, 2x10kg, peso corporal"
                          value={exercise.load_breakdown}
                          onChange={(e) => updateExercise(currentStudent.id, idx, 'load_breakdown', e.target.value)}
                          className={!exercise.load_breakdown ? "border-destructive" : ""}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => calculateLoadFromDescription(currentStudent.id, idx)}
                          disabled={!exercise.load_breakdown}
                          className="shrink-0"
                          title="Calcular carga total"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </div>
                      {exercise.load_breakdown.toLowerCase().includes('peso corporal') && currentStudent.weight_kg && (
                        <p className="text-xs text-green-600">
                          ✓ Carga calculada: {currentStudent.weight_kg} kg
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Carga (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={exercise.load_kg || ''}
                        onChange={(e) => updateExercise(currentStudent.id, idx, 'load_kg', parseFloat(e.target.value) || null)}
                        disabled={exercise.load_breakdown.toLowerCase().includes('peso corporal')}
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <Label className="text-xs">Observações</Label>
                    <Textarea
                      placeholder="Observações sobre a execução..."
                      value={exercise.observations}
                      onChange={(e) => updateExercise(currentStudent.id, idx, 'observations', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

      {/* Botões de Ação */}
      <div className="flex justify-between gap-2">
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            size="lg"
          >
            Voltar
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          size="lg"
          className="gap-2 ml-auto"
        >
          Salvar Sessão
        </Button>
      </div>
    </div>
  );
}
