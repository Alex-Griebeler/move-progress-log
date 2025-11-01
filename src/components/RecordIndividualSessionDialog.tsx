import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceSessionRecorder } from "./VoiceSessionRecorder";
import { usePrescriptionAssignments } from "@/hooks/usePrescriptions";
import { useCreateWorkoutSession } from "@/hooks/useWorkoutSessions";
import { supabase } from "@/integrations/supabase/client";
import { Mic, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface RecordIndividualSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

type DialogState = 'setup' | 'recording' | 'processing' | 'preview' | 'edit';

interface SessionData {
  sessions: Array<{
    student_name: string;
    clinical_observations?: Array<{
      observation_text: string;
      category: 'dor' | 'mobilidade' | 'força' | 'técnica' | 'geral';
      severity: 'baixa' | 'média' | 'alta';
    }>;
    exercises: Array<{
      prescribed_exercise_name?: string | null;
      executed_exercise_name: string;
      sets?: number | null;
      reps: number | null;
      load_kg?: number | null;
      load_breakdown: string;
      observations?: string | null;
      is_best_set: boolean;
    }>;
  }>;
}

interface AccumulatedRecording {
  recordingNumber: number;
  timestamp: string;
  data: SessionData;
}

interface MergedData {
  clinical_observations: Array<{
    observation_text: string;
    category: 'dor' | 'mobilidade' | 'força' | 'técnica' | 'geral';
    severity: 'baixa' | 'média' | 'alta';
  }>;
  exercises: Array<{
    prescribed_exercise_name?: string | null;
    executed_exercise_name: string;
    sets?: number | null;
    reps: number | null;
    load_kg?: number | null;
    load_breakdown: string;
    observations?: string | null;
    is_best_set: boolean;
  }>;
}

const MAX_RECORDINGS = 10;

export function RecordIndividualSessionDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: RecordIndividualSessionDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>('setup');
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [accumulatedRecordings, setAccumulatedRecordings] = useState<AccumulatedRecording[]>([]);
  const [currentRecordingNumber, setCurrentRecordingNumber] = useState(1);
  const [mergedData, setMergedData] = useState<MergedData | null>(null);
  const [editableObservations, setEditableObservations] = useState<MergedData['clinical_observations']>([]);
  const [editableExercises, setEditableExercises] = useState<MergedData['exercises']>([]);

  // Validation states
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [exercisesNeedingValidation, setExercisesNeedingValidation] = useState<number[]>([]);

  const { data: assignments } = usePrescriptionAssignments(studentId);
  const createSession = useCreateWorkoutSession();
  const { toast } = useToast();

  // Buscar prescrições com nomes
  const { data: prescriptions } = useQuery({
    queryKey: ['student-prescriptions', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescription_assignments')
        .select(`
          prescription_id,
          workout_prescriptions!inner(id, name)
        `)
        .eq('student_id', studentId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  const prescriptionOptions = [
    { id: null, name: "Sessão Livre (sem prescrição)" },
    ...(prescriptions?.map(p => ({
      id: p.prescription_id,
      name: p.workout_prescriptions.name
    })) || [])
  ];

  const areSimilarObservations = (obs1: string, obs2: string): boolean => {
    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
    const n1 = normalize(obs1);
    const n2 = normalize(obs2);
    
    if (n1 === n2) return true;
    
    const shorter = n1.length < n2.length ? n1 : n2;
    const longer = n1.length >= n2.length ? n1 : n2;
    
    return longer.includes(shorter) && (shorter.length / longer.length) > 0.8;
  };

  const mergeAllRecordings = (recordings: AccumulatedRecording[]): MergedData => {
    const allObservations: Array<{
      observation_text: string;
      category: 'dor' | 'mobilidade' | 'força' | 'técnica' | 'geral';
      severity: 'baixa' | 'média' | 'alta';
    }> = [];
    const allExercises: Array<any> = [];

    recordings.forEach(recording => {
      const session = recording.data.sessions[0];
      if (!session) return;

      if (session.clinical_observations) {
        session.clinical_observations.forEach(newObs => {
          const isDuplicate = allObservations.some(
            existingObs => areSimilarObservations(existingObs.observation_text, newObs.observation_text)
          );
          if (!isDuplicate) {
            allObservations.push(newObs);
          }
        });
      }

      allExercises.push(...session.exercises);
    });

    return {
      clinical_observations: allObservations,
      exercises: allExercises
    };
  };

  useEffect(() => {
    if (!open) {
      setDialogState('setup');
      setSelectedPrescriptionId(null);
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setAccumulatedRecordings([]);
      setCurrentRecordingNumber(1);
      setMergedData(null);
    }
  }, [open]);

  const handleSessionData = (data: SessionData) => {
    console.log('Received session data from recording', currentRecordingNumber, ':', data);
    
    const newRecording: AccumulatedRecording = {
      recordingNumber: currentRecordingNumber,
      timestamp: new Date().toISOString(),
      data
    };
    
    const updatedRecordings = [...accumulatedRecordings, newRecording];
    setAccumulatedRecordings(updatedRecordings);
    
    const merged = mergeAllRecordings(updatedRecordings);
    setMergedData(merged);
    setEditableObservations(merged.clinical_observations);
    setEditableExercises(merged.exercises);
    
    setDialogState('preview');
  };

  const handleError = (error: string) => {
    toast({
      title: "Erro na gravação",
      description: error,
      variant: "destructive",
    });
    setDialogState('setup');
  };

  const handleSave = async () => {
    if (!mergedData) return;

    try {
      const workoutSession = {
        student_id: studentId,
        prescription_id: selectedPrescriptionId,
        date,
        time,
      };

      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert(workoutSession)
        .select()
        .single();

      if (sessionError) throw sessionError;

      const exercises = editableExercises.map(ex => ({
        session_id: session.id,
        exercise_name: ex.executed_exercise_name,
        sets: ex.sets,
        reps: ex.reps,
        load_kg: ex.load_kg,
        load_breakdown: ex.load_breakdown,
        observations: ex.observations,
        is_best_set: ex.is_best_set,
      }));

      const { error: exercisesError } = await supabase
        .from('exercises')
        .insert(exercises);

      if (exercisesError) throw exercisesError;

      if (editableObservations && editableObservations.length > 0) {
        const observations = editableObservations.map(obs => ({
          student_id: studentId,
          session_id: session.id,
          observation_text: obs.observation_text,
          category: obs.category,
          severity: obs.severity,
        }));

        const { error: observationsError } = await supabase
          .from('student_observations')
          .insert(observations);

        if (observationsError) throw observationsError;
      }

      toast({
        title: "Sessão registrada",
        description: `${accumulatedRecordings.length} gravação(ões) processada(s) com sucesso`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving session:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddAnotherRecording = () => {
    if (accumulatedRecordings.length >= MAX_RECORDINGS) {
      toast({
        title: "Limite atingido",
        description: `Máximo de ${MAX_RECORDINGS} gravações por sessão`,
        variant: "destructive"
      });
      return;
    }
    
    setCurrentRecordingNumber(prev => prev + 1);
    setDialogState('recording');
  };

  const handleBack = () => {
    setDialogState('setup');
    setAccumulatedRecordings([]);
    setCurrentRecordingNumber(1);
    setMergedData(null);
    setShowValidationDialog(false);
    setExercisesNeedingValidation([]);
  };

  // Função para calcular load_kg automaticamente durante edição
  const calculateLoadFromBreakdown = (breakdown: string): number | null => {
    try {
      let total = 0;
      
      const eachSideMatch = breakdown.match(/\((.*?)\)\s*de cada lado/i);
      if (eachSideMatch) {
        const content = eachSideMatch[1];
        
        const kgMatches = content.match(/(\d+(?:\.\d+)?)\s*kg/gi);
        kgMatches?.forEach(m => { total += parseFloat(m) * 2; });
        
        const lbMatches = content.match(/(\d+(?:\.\d+)?)\s*lb/gi);
        lbMatches?.forEach(m => { total += parseFloat(m) * 0.45 * 2; });
      }
      
      const barraMatch = breakdown.match(/barra\s*(\d+(?:\.\d+)?)\s*kg/i);
      if (barraMatch) total += parseFloat(barraMatch[1]);
      
      return total > 0 ? Math.round(total * 10) / 10 : null;
    } catch {
      return null;
    }
  };

  const validateExercisesBeforeSave = () => {
    const invalidExercises: number[] = [];
    
    console.log('🔍 VALIDAÇÃO - Exercícios:', editableExercises);
    
    editableExercises.forEach((ex, idx) => {
      // ❌ ERROS CRÍTICOS (bloqueiam o save)
      const criticalIssues = [];
      
      if (!ex.executed_exercise_name.trim()) {
        criticalIssues.push('Nome vazio');
        invalidExercises.push(idx);
      }
      
      if (!selectedPrescriptionId && (ex.sets === null || ex.sets === 0)) {
        criticalIssues.push('Séries obrigatórias (treino livre)');
        invalidExercises.push(idx);
      }
      
      // ❌ ERROS CRÍTICOS: Carga e Reps são obrigatórios
      const missingLoad = !ex.load_breakdown || ex.load_kg === null || ex.load_kg === 0;
      const missingReps = ex.reps === null || ex.reps === 0;
      
      if (missingLoad) {
        criticalIssues.push('Carga não informada');
        invalidExercises.push(idx);
      }
      
      if (missingReps) {
        criticalIssues.push('Reps não informadas');
        invalidExercises.push(idx);
      }
      
      if (criticalIssues.length > 0) {
        console.log(`❌ Exercício #${idx + 1} (${ex.executed_exercise_name || 'SEM NOME'}):`, criticalIssues);
      }
    });
    
    if (invalidExercises.length > 0) {
      console.log('❌ VALIDAÇÃO FALHOU. Total de exercícios inválidos:', invalidExercises.length);
      setExercisesNeedingValidation(invalidExercises);
      setShowValidationDialog(true);
      return false;
    }
    
    console.log('✅ VALIDAÇÃO OK - Prosseguindo com save');
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent forceMount className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            {dialogState === 'setup' && `Registrar Sessão Individual (Voz) - ${studentName}`}
            {dialogState === 'recording' && `🎤 Gravação ${currentRecordingNumber} - ${studentName}`}
            {dialogState === 'preview' && `Preview da Sessão - ${studentName}`}
          </DialogTitle>
        </DialogHeader>

        {dialogState === 'setup' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Horário</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prescrição</Label>
              <Select
                value={selectedPrescriptionId || "null"}
                onValueChange={(value) => setSelectedPrescriptionId(value === "null" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prescriptionOptions.map((option) => (
                    <SelectItem key={option.id || "null"} value={option.id || "null"}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {dialogState === 'recording' && (
          <VoiceSessionRecorder
            prescriptionId={selectedPrescriptionId}
            selectedStudents={[{ id: studentId, name: studentName, weight_kg: undefined }]}
            date={date}
            time={time}
            onSessionData={handleSessionData}
            onError={handleError}
            autoStart={true}
          />
        )}

        {dialogState === 'preview' && mergedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base">
                {accumulatedRecordings.length} gravação(ões) realizada(s)
              </Badge>
            </div>

            <Alert>
              <AlertDescription>
                Revise os dados consolidados antes de salvar
              </AlertDescription>
            </Alert>

            {mergedData.clinical_observations && mergedData.clinical_observations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    🩺 Observações Clínicas ({mergedData.clinical_observations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mergedData.clinical_observations.map((obs, idx) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          obs.severity === 'alta' ? 'destructive' : 
                          obs.severity === 'média' ? 'default' : 
                          'secondary'
                        }>
                          {obs.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {obs.category}
                        </Badge>
                      </div>
                      <p className="text-sm">{obs.observation_text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  💪 Exercícios Executados ({mergedData.exercises.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mergedData.exercises.map((ex, idx) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-sm flex-1">{ex.executed_exercise_name}</p>
                        {ex.is_best_set && (
                          <Badge variant="secondary" className="text-xs">
                            🏆 Melhor série
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Séries: </span>
                          <span className="font-semibold">
                            {ex.sets !== null && ex.sets !== undefined ? 
                              ex.sets : 
                              <Badge variant="outline" className="text-xs">Prescrito</Badge>
                            }
                          </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reps: </span>
                        <span className="font-semibold">{ex.reps}</span>
                      </div>
                    </div>
                    {ex.load_breakdown && (
                      <div className="mt-2">
                        <span className="text-muted-foreground text-sm">Carga: </span>
                        <div className="font-medium">{ex.load_breakdown}</div>
                        {ex.load_kg && (
                          <div className="text-sm text-primary font-semibold mt-1">
                            = {ex.load_kg} kg total
                          </div>
                        )}
                      </div>
                    )}
                      {ex.observations && (
                        <p className="text-xs text-muted-foreground mt-2">{ex.observations}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {dialogState === 'edit' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  🩺 Observações Clínicas
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setEditableObservations([...editableObservations, {
                        observation_text: '',
                        category: 'geral',
                        severity: 'baixa'
                      }]);
                    }}
                  >
                    + Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editableObservations.map((obs, idx) => (
                  <div key={idx} className="p-3 border rounded-lg space-y-2">
                    <Textarea
                      value={obs.observation_text}
                      onChange={(e) => {
                        const updated = [...editableObservations];
                        updated[idx].observation_text = e.target.value;
                        setEditableObservations(updated);
                      }}
                      placeholder="Descrição da observação..."
                    />
                    <div className="flex gap-2">
                      <Select
                        value={obs.category}
                        onValueChange={(value) => {
                          const updated = [...editableObservations];
                          updated[idx].category = value as any;
                          setEditableObservations(updated);
                        }}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dor">Dor</SelectItem>
                          <SelectItem value="mobilidade">Mobilidade</SelectItem>
                          <SelectItem value="força">Força</SelectItem>
                          <SelectItem value="técnica">Técnica</SelectItem>
                          <SelectItem value="geral">Geral</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={obs.severity}
                        onValueChange={(value) => {
                          const updated = [...editableObservations];
                          updated[idx].severity = value as any;
                          setEditableObservations(updated);
                        }}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="média">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setEditableObservations(editableObservations.filter((_, i) => i !== idx));
                        }}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  💪 Exercícios Executados
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setEditableExercises([...editableExercises, {
                        executed_exercise_name: '',
                        sets: null,
                        reps: null,
                        load_kg: null,
                        load_breakdown: '',
                        observations: null,
                        is_best_set: true
                      }]);
                    }}
                  >
                    + Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editableExercises.map((ex, idx) => (
                  <div key={idx} className="p-3 border rounded-lg space-y-2">
                    <Input
                      value={ex.executed_exercise_name}
                      onChange={(e) => {
                        const updated = [...editableExercises];
                        updated[idx].executed_exercise_name = e.target.value;
                        setEditableExercises(updated);
                      }}
                      placeholder="Nome do exercício..."
                    />
                    
                    <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    Séries
                    {!selectedPrescriptionId && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    value={ex.sets ?? ''}
                    onChange={(e) => {
                      const updated = [...editableExercises];
                      updated[idx].sets = e.target.value ? parseInt(e.target.value) : null;
                      setEditableExercises(updated);
                    }}
                    placeholder={selectedPrescriptionId ? "Auto" : "Obrigatório"}
                    className={
                      !selectedPrescriptionId && (ex.sets === null || ex.sets === 0)
                        ? "border-destructive focus:border-destructive"
                        : ""
                    }
                  />
                </div>
                      
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          Reps
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          value={ex.reps ?? ''}
                          onChange={(e) => {
                            const updated = [...editableExercises];
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            updated[idx].reps = value;
                            setEditableExercises(updated);
                            
                            // Remover da lista de inválidos se corrigiu
                            if (value && value > 0) {
                              setExercisesNeedingValidation(prev => prev.filter(i => i !== idx));
                            }
                          }}
                          placeholder="Obrigatório"
                          className={
                            ex.reps === 0 || ex.reps === null
                              ? "border-destructive focus:border-destructive"
                              : ""
                          }
                        />
                      </div>
                    </div>
                    
                    {/* Carga Total e Breakdown */}
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          Descrição da Carga
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={ex.load_breakdown || ''}
                          onChange={(e) => {
                            const updated = [...editableExercises];
                            updated[idx].load_breakdown = e.target.value;
                            
                            // Auto-calcular load_kg
                            const calculated = calculateLoadFromBreakdown(e.target.value);
                            if (calculated !== null) {
                              updated[idx].load_kg = calculated;
                            }
                            
                            setEditableExercises(updated);
                          }}
                          placeholder="Ex: (25 lb + 2 kg) de cada lado + barra 10 kg"
                          className={
                            (!ex.load_breakdown || ex.load_kg === null || ex.load_kg === 0)
                              ? "text-sm border-destructive focus:border-destructive"
                              : "text-sm"
                          }
                        />
                      </div>
                      
                      {/* Display do load_kg calculado */}
                      {ex.load_kg !== null && (
                        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                          <span className="text-xs text-muted-foreground">Carga Total:</span>
                          <Badge variant="default" className="font-bold">
                            {ex.load_kg} kg
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-xs">Observações</Label>
                      <Input
                        value={ex.observations ?? ''}
                        onChange={(e) => {
                          const updated = [...editableExercises];
                          updated[idx].observations = e.target.value || null;
                          setEditableExercises(updated);
                        }}
                        placeholder="Observações técnicas..."
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={ex.is_best_set}
                          onChange={(e) => {
                            const updated = [...editableExercises];
                            updated[idx].is_best_set = e.target.checked;
                            setEditableExercises(updated);
                          }}
                        />
                        <Label className="text-xs">Melhor série</Label>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setEditableExercises(editableExercises.filter((_, i) => i !== idx));
                        }}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          {dialogState === 'setup' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setDialogState('recording')}>
                <Mic className="h-4 w-4 mr-2" />
                Iniciar Gravação
              </Button>
            </>
          )}

          {dialogState === 'preview' && (
            <>
              <Button variant="outline" onClick={handleBack}>
                ← Voltar
              </Button>
              <Button 
                variant="secondary"
                onClick={() => setDialogState('edit')}
              >
                ✏️ Editar Dados
              </Button>
              <Button 
                variant="secondary"
                onClick={handleAddAnotherRecording}
                disabled={!mergedData || accumulatedRecordings.length >= MAX_RECORDINGS}
              >
                <Mic className="h-4 w-4 mr-2" />
                Adicionar Gravação
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Finalizar e Salvar
              </Button>
            </>
          )}

          {dialogState === 'edit' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (mergedData) {
                    setEditableObservations(mergedData.clinical_observations);
                    setEditableExercises(mergedData.exercises);
                  }
                  setDialogState('preview');
                }}
              >
                ← Cancelar Edição
              </Button>
              <Button 
                onClick={() => {
                  // ✅ Validar ANTES de aplicar edições
                  if (!validateExercisesBeforeSave()) {
                    return; // Bloqueia se houver erros críticos
                  }
                  
                  if (mergedData) {
                    setMergedData({
                      clinical_observations: editableObservations,
                      exercises: editableExercises
                    });
                  }
                  setDialogState('preview');
                  toast({
                    title: "Edições aplicadas",
                    description: "Dados validados e prontos para salvar",
                  });
                }}
              >
                ✅ Aplicar Edições
              </Button>
            </>
          )}
        </DialogFooter>

        {/* Dialog de Validação de Campos Críticos */}
        {showValidationDialog && (
          <Alert className="mt-4 border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-700">
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold text-red-900 dark:text-red-100">
                  ❌ Campos obrigatórios não preenchidos
                </p>
                <div className="space-y-2">
                  {exercisesNeedingValidation.map(idx => {
                    const ex = editableExercises[idx];
                    const issues = [];
                    
                    if (!ex.executed_exercise_name.trim()) issues.push("Nome do exercício");
                    if (!selectedPrescriptionId && (ex.sets === null || ex.sets === 0)) {
                      issues.push("Número de séries (obrigatório em treinos livres)");
                    }
                    if (!ex.load_breakdown || ex.load_kg === null || ex.load_kg === 0) {
                      issues.push("Carga (obrigatório)");
                    }
                    if (ex.reps === null || ex.reps === 0) {
                      issues.push("Repetições (obrigatório)");
                    }
                    
                    return (
                      <div key={idx} className="text-sm text-red-800 dark:text-red-200 bg-white dark:bg-red-900/50 p-2 rounded border border-red-200 dark:border-red-700">
                        <strong>Exercício #{idx + 1}:</strong> {ex.executed_exercise_name || '(sem nome)'}
                        <ul className="list-disc list-inside ml-4 mt-1">
                          {issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowValidationDialog(false);
                      setDialogState('edit');
                      toast({
                        title: "Corrija os campos obrigatórios",
                        description: "Complete todos os dados antes de salvar",
                        variant: "destructive",
                      });
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    ✏️ Corrigir Agora
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
