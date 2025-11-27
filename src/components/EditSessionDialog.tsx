import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Trash, Loader2, Mic } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EditSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  onSuccess?: () => void;
  onReopenForRecording?: (sessionId: string) => void;
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

export function EditSessionDialog({
  open,
  onOpenChange,
  sessionId,
  onSuccess,
  onReopenForRecording,
}: EditSessionDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    if (open && sessionId) {
      loadSessionData();
    }
  }, [open, sessionId]);

  const loadSessionData = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      // Buscar dados da sessão com informações do aluno
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          student:students!student_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Buscar exercícios da sessão
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (exercisesError) throw exercisesError;

      setSessionData(session);
      setExercises(exercisesData || []);
    } catch (error: any) {
      notify.error("Erro ao carregar sessão", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      // Deletar exercícios removidos
      const currentExerciseIds = exercises.map(ex => ex.id).filter(Boolean);
      
      // Só deletar se houver IDs para manter
      if (currentExerciseIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('exercises')
          .delete()
          .eq('session_id', sessionId)
          .not('id', 'in', `(${currentExerciseIds.join(',')})`);

        if (deleteError && deleteError.code !== 'PGRST116') throw deleteError;
      } else {
        // Se não há exercícios para manter, deletar todos
        const { error: deleteError } = await supabase
          .from('exercises')
          .delete()
          .eq('session_id', sessionId);

        if (deleteError) throw deleteError;
      }

      // Atualizar exercícios existentes
      for (const exercise of exercises) {
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
      }

      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessions-with-exercises"] });
      queryClient.invalidateQueries({ queryKey: ["session-detail"] });
      queryClient.invalidateQueries({ queryKey: ["all-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session-exercises"] });

      notify.success("Sessão atualizada", {
        description: "As alterações foram salvas com sucesso.",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      notify.error("Erro ao salvar alterações", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        {loading && !exercises.length ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : sessionData ? (
          <>
            <DialogHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={sessionData.student?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {sessionData.student?.name?.substring(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <DialogTitle className="text-2xl mb-2">
                    Editar Sessão de {sessionData.student?.name}
                  </DialogTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={sessionData.session_type === "individual" ? "default" : "secondary"}>
                      {sessionData.session_type === "individual" ? "Individual" : "Grupo"}
                    </Badge>
                    <Badge variant={sessionData.is_finalized ? "outline" : "default"}>
                      {sessionData.is_finalized ? "Finalizada" : "Em edição"}
                    </Badge>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[calc(90vh-200px)] pr-4 mt-6">
              <div className="space-y-6">
                {/* Info da sessão */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Informações da Sessão</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Data:</span>{" "}
                        {format(new Date(sessionData.date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div>
                        <span className="font-semibold">Horário:</span> {sessionData.time.substring(0, 5)}
                      </div>
                      {sessionData.workout_name && (
                        <div className="col-span-2">
                          <span className="font-semibold">Treino:</span> {sessionData.workout_name}
                        </div>
                      )}
                      {sessionData.trainer_name && (
                        <div className="col-span-2">
                          <span className="font-semibold">Treinador:</span> {sessionData.trainer_name}
                        </div>
                      )}
                      {sessionData.room_name && (
                        <div className="col-span-2">
                          <span className="font-semibold">Sala:</span> {sessionData.room_name}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

              {/* Exercícios */}
              <div className="space-y-4">
                <Label className="text-base">Exercícios ({exercises.length})</Label>
                {exercises.map((exercise, idx) => {
                  const needsAttention = exercise.sets === 0 || exercise.reps === 0;
                  return (
                    <Card key={exercise.id} className={needsAttention ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : ''}>
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
                        {needsAttention && (
                          <div className="mb-3 text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-2">
                            ⚠️ Exercício não registrado no áudio - preencher manualmente
                          </div>
                        )}
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
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </>
        ) : (
          <DialogHeader>
            <DialogTitle>Editar Sessão</DialogTitle>
          </DialogHeader>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {onReopenForRecording && sessionId && (
            <Button
              variant="secondary"
              onClick={() => {
                onReopenForRecording(sessionId);
                onOpenChange(false);
              }}
              disabled={loading}
            >
              <Mic className="h-4 w-4 mr-2" />
              Adicionar Gravações
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
