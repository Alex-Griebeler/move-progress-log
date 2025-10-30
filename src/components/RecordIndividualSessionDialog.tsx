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
  const [extractedData, setExtractedData] = useState<SessionData | null>(null);

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

  useEffect(() => {
    if (!open) {
      setDialogState('setup');
      setSelectedPrescriptionId(null);
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setExtractedData(null);
    }
  }, [open]);

  const handleSessionData = (data: SessionData) => {
    console.log('Received session data:', data);
    setExtractedData(data);
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
    if (!extractedData || !extractedData.sessions?.[0]) return;

    const sessionData = extractedData.sessions[0];

    try {
      // Criar sessão de treino
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

      // Criar exercícios
      const exercises = sessionData.exercises.map(ex => ({
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

      // Criar observações clínicas
      if (sessionData.clinical_observations && sessionData.clinical_observations.length > 0) {
        const observations = sessionData.clinical_observations.map(obs => ({
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
        description: `Sessão de ${studentName} salva com sucesso`,
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

  const handleBack = () => {
    setDialogState('setup');
    setExtractedData(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Registrar Sessão Individual - {studentName}
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

        {dialogState === 'preview' && extractedData && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Revise os dados extraídos da gravação antes de salvar
              </AlertDescription>
            </Alert>

            {extractedData.sessions[0]?.clinical_observations && 
             extractedData.sessions[0].clinical_observations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Observações Clínicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {extractedData.sessions[0].clinical_observations.map((obs, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                      <Badge variant={
                        obs.severity === 'alta' ? 'destructive' : 
                        obs.severity === 'média' ? 'default' : 
                        'secondary'
                      }>
                        {obs.category}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm">{obs.observation_text}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {obs.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Exercícios Executados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {extractedData.sessions[0]?.exercises.map((ex, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{ex.executed_exercise_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ex.sets && `${ex.sets}x`}{ex.reps} reps • {ex.load_breakdown}
                          {ex.is_best_set && ' • 🏆 Melhor série'}
                        </p>
                        {ex.observations && (
                          <p className="text-xs text-muted-foreground mt-1">{ex.observations}</p>
                        )}
                      </div>
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
                Voltar
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Sessão
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
