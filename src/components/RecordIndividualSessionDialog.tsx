import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

type DialogState = 'setup' | 'recording' | 'processing' | 'preview';

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
      reps: number;
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
    reps: number;
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

      const exercises = mergedData.exercises.map(ex => ({
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

      if (mergedData.clinical_observations && mergedData.clinical_observations.length > 0) {
        const observations = mergedData.clinical_observations.map(obs => ({
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                        <div>
                          <span className="text-muted-foreground">Carga: </span>
                          <span className="font-semibold">{ex.load_breakdown}</span>
                        </div>
                      </div>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
