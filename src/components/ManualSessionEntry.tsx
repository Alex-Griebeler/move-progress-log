import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WORKOUT_TYPES, FABRIK_ROOMS } from "@/constants/workouts";
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
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onSave: (data: {
    workoutType: string;
    room: string;
    trainer: string;
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
  date,
  time,
  onDateChange,
  onTimeChange,
  onSave,
}: ManualSessionEntryProps) {
  const [workoutType, setWorkoutType] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [trainer, setTrainer] = useState<string>('');
  
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
      workoutType,
      room,
      trainer,
      studentExercises: selectedStudents.map(student => ({
        studentId: student.id,
        exercises: studentExercises[student.id] || []
      }))
    };
    onSave(data);
  };

  const isValid = workoutType && room && trainer && 
    selectedStudents.every(student => 
      studentExercises[student.id]?.every(ex => 
        ex.reps > 0 && ex.load_breakdown
      )
    );

  return (
    <div className="space-y-6">
      {/* Contexto da Sessão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contexto da Sessão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="workout-type">Tipo de Treino *</Label>
              <Select value={workoutType} onValueChange={setWorkoutType}>
                <SelectTrigger id="workout-type">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">Sala *</Label>
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger id="room">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {FABRIK_ROOMS.map(room => (
                    <SelectItem key={room.value} value={room.value}>
                      {room.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trainer">Treinador *</Label>
              <Input
                id="trainer"
                placeholder="Nome do treinador"
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alunos Selecionados */}
      <div className="space-y-2">
        <Label>Alunos Participantes</Label>
        <div className="flex flex-wrap gap-2">
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
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{exercise.exercise_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Prescrito: {prescribedEx?.sets} séries × {prescribedEx?.reps} reps
                        {prescribedEx?.training_method && ` • ${prescribedEx.training_method}`}
                      </p>
                    </div>
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
