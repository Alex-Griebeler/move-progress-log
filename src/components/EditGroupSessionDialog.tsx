import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Trash, Loader2, Mic, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface EditGroupSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescriptionId: string | null;
  date: string;
  time: string;
  onSuccess?: () => void;
  onReopenForRecording?: (prescriptionId: string, date: string, time: string) => void;
}

interface Student {
  id: string;
  name: string;
}

interface Exercise {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  load_kg: number | null;
  load_breakdown: string;
  observations: string | null;
  is_best_set: boolean;
}

interface SessionData {
  sessionId: string;
  studentId: string;
  studentName: string;
  exercises: Exercise[];
}

export function EditGroupSessionDialog({
  open,
  onOpenChange,
  prescriptionId,
  date,
  time,
  onSuccess,
  onReopenForRecording,
}: EditGroupSessionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sessionsData, setSessionsData] = useState<SessionData[]>([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [editableExercises, setEditableExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    if (open && prescriptionId && date && time) {
      loadSessionsData();
    }
  }, [open, prescriptionId, date, time]);

  useEffect(() => {
    if (sessionsData.length > 0 && currentStudentIndex < sessionsData.length) {
      setEditableExercises([...sessionsData[currentStudentIndex].exercises]);
    }
  }, [currentStudentIndex, sessionsData]);

  const loadSessionsData = async () => {
    if (!prescriptionId || !date || !time) return;

    setLoading(true);
    try {
      // Buscar todas as sessões do grupo (mesma prescrição, data e hora)
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, student_id, students!inner(name)')
        .eq('prescription_id', prescriptionId)
        .eq('date', date)
        .eq('time', time)
        .order('students(name)', { ascending: true });

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        notify.warning("Nenhuma sessão encontrada", {
          description: "Não foram encontradas sessões para editar neste grupo.",
        });
        onOpenChange(false);
        return;
      }

      // Para cada sessão, buscar seus exercícios
      const sessionsWithExercises = await Promise.all(
        sessions.map(async (session: { id: string; student_id: string; students: { name: string } }) => {
          const { data: exercises, error: exercisesError } = await supabase
            .from('exercises')
            .select('*')
            .eq('session_id', session.id)
            .order('created_at', { ascending: true });

          if (exercisesError) throw exercisesError;

          return {
            sessionId: session.id,
            studentId: session.student_id,
            studentName: session.students.name,
            exercises: exercises || [],
          };
        })
      );

      setSessionsData(sessionsWithExercises);
      setCurrentStudentIndex(0);
    } catch (error) {
      notify.error("Erro ao carregar sessões", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateExercise = (index: number, field: keyof Exercise, value: Exercise[keyof Exercise]) => {
    const updated = [...editableExercises];
    updated[index] = { ...updated[index], [field]: value };
    setEditableExercises(updated);
  };

  const removeExercise = (index: number) => {
    setEditableExercises(editableExercises.filter((_, i) => i !== index));
  };

  const handleSaveCurrentStudent = async () => {
    if (sessionsData.length === 0) return;

    const currentSession = sessionsData[currentStudentIndex];
    
    setLoading(true);
    try {
      // Deletar exercícios removidos
      const currentExerciseIds = editableExercises.map(ex => ex.id).filter(Boolean);
      
      if (currentExerciseIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('exercises')
          .delete()
          .eq('session_id', currentSession.sessionId)
          .not('id', 'in', `(${currentExerciseIds.join(',')})`);

        if (deleteError && deleteError.code !== 'PGRST116') throw deleteError;
      } else {
        // Se não há exercícios com ID, deletar todos
        const { error: deleteError } = await supabase
          .from('exercises')
          .delete()
          .eq('session_id', currentSession.sessionId);

        if (deleteError) throw deleteError;
      }

      // Atualizar exercícios existentes e inserir novos
      for (const exercise of editableExercises) {
        if (exercise.id) {
          // Atualizar existente
          const { error } = await supabase
            .from('exercises')
            .update({
              exercise_name: exercise.exercise_name,
              sets: exercise.sets,
              reps: exercise.reps,
              load_kg: exercise.load_kg,
              load_breakdown: exercise.load_breakdown,
              observations: exercise.observations,
              is_best_set: exercise.is_best_set,
            })
            .eq('id', exercise.id);

          if (error) throw error;
        } else {
          // Inserir novo
          const { error } = await supabase
            .from('exercises')
            .insert({
              session_id: currentSession.sessionId,
              exercise_name: exercise.exercise_name,
              sets: exercise.sets,
              reps: exercise.reps,
              load_kg: exercise.load_kg,
              load_breakdown: exercise.load_breakdown,
              observations: exercise.observations,
              is_best_set: exercise.is_best_set,
            });

          if (error) throw error;
        }
      }

      // Atualizar os dados da sessão no estado
      const updatedSessionsData = [...sessionsData];
      updatedSessionsData[currentStudentIndex].exercises = editableExercises;
      setSessionsData(updatedSessionsData);

      notify.success("Alterações salvas", {
        description: `Sessão de ${currentSession.studentName} atualizada.`,
      });

      // Se for o último aluno, fechar o diálogo
      if (currentStudentIndex === sessionsData.length - 1) {
        onSuccess?.();
        onOpenChange(false);
      } else {
        // Avançar para o próximo aluno
        setCurrentStudentIndex(prev => prev + 1);
      }
    } catch (error) {
      notify.error("Erro ao salvar alterações", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentStudentIndex < sessionsData.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
    }
  };

  const currentStudent = sessionsData[currentStudentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Sessão em Grupo</DialogTitle>
          {sessionsData.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                Aluno {currentStudentIndex + 1} de {sessionsData.length}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {currentStudent?.studentName}
              </span>
            </div>
          )}
        </DialogHeader>

        {loading && sessionsData.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : currentStudent ? (
          <ScrollArea className="max-h-[calc(90vh-250px)] pr-4">
            <div className="space-y-4">
              <Label className="text-base">Exercícios ({editableExercises.length})</Label>
              {editableExercises.map((exercise, idx) => (
                <Card key={exercise.id || idx}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Exercício {idx + 1}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExercise(idx)}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Nome do Exercício *</Label>
                      <Input
                        value={exercise.exercise_name}
                        onChange={(e) => updateExercise(idx, 'exercise_name', e.target.value)}
                        placeholder="Nome do exercício"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Séries</Label>
                        <Input
                          type="number"
                          value={exercise.sets}
                          onChange={(e) => updateExercise(idx, 'sets', parseInt(e.target.value) || 0)}
                          min="1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Reps</Label>
                        <Input
                          type="number"
                          value={exercise.reps}
                          onChange={(e) => updateExercise(idx, 'reps', parseInt(e.target.value) || 0)}
                          min="1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Carga (kg)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={exercise.load_kg || ''}
                          onChange={(e) => updateExercise(idx, 'load_kg', parseFloat(e.target.value) || null)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Descrição Carga</Label>
                        <Input
                          value={exercise.load_breakdown}
                          onChange={(e) => updateExercise(idx, 'load_breakdown', e.target.value)}
                          placeholder="Ex: 20kg"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Observações</Label>
                      <Textarea
                        value={exercise.observations || ''}
                        onChange={(e) => updateExercise(idx, 'observations', e.target.value)}
                        placeholder="Observações sobre a execução..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : null}

        <DialogFooter className="gap-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStudentIndex === 0 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentStudentIndex === sessionsData.length - 1 || loading}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {onReopenForRecording && prescriptionId && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    onReopenForRecording(prescriptionId, date, time);
                    onOpenChange(false);
                  }}
                  disabled={loading}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Adicionar Gravações
                </Button>
              )}
              <Button onClick={handleSaveCurrentStudent} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : currentStudentIndex === sessionsData.length - 1 ? (
                  "Salvar e Concluir"
                ) : (
                  "Salvar e Avançar"
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
