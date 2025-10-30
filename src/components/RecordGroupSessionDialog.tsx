import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VoiceSessionRecorder } from "./VoiceSessionRecorder";
import { useStudents } from "@/hooks/useStudents";
import { usePrescriptionAssignments } from "@/hooks/usePrescriptions";
import { useCreateGroupWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { usePrescriptionDetails } from "@/hooks/usePrescriptions";
import { supabase } from "@/integrations/supabase/client";
import { Mic, User, AlertTriangle, XCircle, Save, Edit, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecordGroupSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescriptionId?: string | null;
}

type DialogState = 'selecting' | 'recording' | 'processing' | 'preview';

interface Student {
  id: string;
  name: string;
  weight_kg?: number;
  has_active_prescription: boolean;
}

interface SessionData {
  sessions: Array<{
    student_name: string;
    auto_added?: boolean;
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

interface MergedStudent {
  student_name: string;
  recording_numbers: number[];
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

export function RecordGroupSessionDialog({
  open,
  onOpenChange,
  prescriptionId,
}: RecordGroupSessionDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>('selecting');
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [accumulatedRecordings, setAccumulatedRecordings] = useState<AccumulatedRecording[]>([]);
  const [currentRecordingNumber, setCurrentRecordingNumber] = useState(1);
  const [mergedStudents, setMergedStudents] = useState<MergedStudent[]>([]);
  const [validationIssues, setValidationIssues] = useState<{
    errors: string[];
    warnings: string[];
  }>({ errors: [], warnings: [] });

  const { data: students } = useStudents();
  const { data: assignments } = usePrescriptionAssignments(prescriptionId);
  const { data: prescriptionDetails } = usePrescriptionDetails(prescriptionId);
  const createGroupSessions = useCreateGroupWorkoutSessions();
  const { toast } = useToast();

  // Enriquecer lista de alunos com informação de prescrição ativa
  const enrichedStudents = students?.map((student) => ({
    ...student,
    has_active_prescription: assignments?.some(a => a.student_id === student.id) || false,
  })).sort((a, b) => {
    if (a.has_active_prescription && !b.has_active_prescription) return -1;
    if (!a.has_active_prescription && b.has_active_prescription) return 1;
    return a.name.localeCompare(b.name);
  });

  const toggleStudent = (student: Student) => {
    setSelectedStudents((prev) =>
      prev.find(s => s.id === student.id)
        ? prev.filter((s) => s.id !== student.id)
        : [...prev, student]
    );
  };

  const areSimilarObservations = (obs1: string, obs2: string): boolean => {
    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
    const n1 = normalize(obs1);
    const n2 = normalize(obs2);
    
    if (n1 === n2) return true;
    
    const shorter = n1.length < n2.length ? n1 : n2;
    const longer = n1.length >= n2.length ? n1 : n2;
    
    return longer.includes(shorter) && (shorter.length / longer.length) > 0.8;
  };

  const mergeAllRecordings = (recordings: AccumulatedRecording[]): MergedStudent[] => {
    const studentMap = new Map<string, MergedStudent>();

    recordings.forEach((recording) => {
      recording.data.sessions.forEach((session) => {
        const key = session.student_name.toLowerCase();
        
        if (!studentMap.has(key)) {
          studentMap.set(key, {
            student_name: session.student_name,
            recording_numbers: [],
            clinical_observations: [],
            exercises: []
          });
        }
        
        const merged = studentMap.get(key)!;
        
        if (!merged.recording_numbers.includes(recording.recordingNumber)) {
          merged.recording_numbers.push(recording.recordingNumber);
        }
        
        if (session.clinical_observations) {
          session.clinical_observations.forEach(newObs => {
            const isDuplicate = merged.clinical_observations.some(
              existingObs => areSimilarObservations(existingObs.observation_text, newObs.observation_text)
            );
            if (!isDuplicate) {
              merged.clinical_observations.push(newObs);
            }
          });
        }
        
        merged.exercises.push(...session.exercises);
      });
    });

    return Array.from(studentMap.values()).sort((a, b) => 
      a.student_name.localeCompare(b.student_name)
    );
  };

  const validateMergedData = (merged: MergedStudent[]) => {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    merged.forEach(student => {
      if (student.exercises.length === 0) {
        errors.push(`❌ ${student.student_name} foi mencionado mas não tem exercícios registrados`);
      }
      
      if (student.recording_numbers.length === 1 && accumulatedRecordings.length > 1) {
        warnings.push(`⚠️ ${student.student_name} só aparece na gravação ${student.recording_numbers[0]}`);
      }
      
      student.exercises.forEach((ex, idx) => {
        if (!ex.reps || ex.reps <= 0) {
          errors.push(`❌ ${student.student_name} - ${ex.executed_exercise_name || `Exercício ${idx + 1}`}: faltam repetições`);
        }
      });
    });
    
    selectedStudents.forEach(student => {
      const found = merged.find(
        m => m.student_name.toLowerCase() === student.name.toLowerCase()
      );
      if (!found) {
        warnings.push(`⚠️ ${student.name} não foi mencionado em nenhuma gravação`);
      }
    });
    
    return { errors, warnings };
  };

  const handleAutoAddStudents = async (data: SessionData) => {
    const newStudents: Student[] = [];
    
    for (let i = 0; i < data.sessions.length; i++) {
      const session = data.sessions[i];
      const existingStudent = selectedStudents.find(
        s => s.name.toLowerCase() === session.student_name.toLowerCase()
      );
      
      if (!existingStudent) {
        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .ilike('name', session.student_name)
          .single();
        
        if (studentData) {
          newStudents.push({
            id: studentData.id,
            name: studentData.name,
            weight_kg: studentData.weight_kg,
            has_active_prescription: false
          });
          data.sessions[i].auto_added = true;
        }
      }
    }
    
    if (newStudents.length > 0) {
      setSelectedStudents(prev => [...prev, ...newStudents]);
      toast({
        title: "Alunos adicionados automaticamente",
        description: `${newStudents.map(s => s.name).join(", ")} foram adicionados à sessão`,
      });
    }
  };

  const validateExerciseData = (data: SessionData) => {
    const errors: string[] = [];
    
    data.sessions?.forEach((session) => {
      if (!session.exercises || session.exercises.length === 0) {
        errors.push(`❌ ${session.student_name} não tem exercícios registrados`);
      }
      
      session.exercises?.forEach((ex, idx) => {
        if (!ex.reps || ex.reps <= 0) {
          errors.push(`❌ ${session.student_name} - ${ex.executed_exercise_name || `Exercício ${idx + 1}`}: faltam repetições`);
        }
      });
    });
    
    return errors;
  };

  const handleSessionData = async (data: SessionData) => {
    console.log("Received session data from recording", currentRecordingNumber, ":", data);
    
    await handleAutoAddStudents(data);
    
    const newRecording: AccumulatedRecording = {
      recordingNumber: currentRecordingNumber,
      timestamp: new Date().toISOString(),
      data
    };
    
    const updatedRecordings = [...accumulatedRecordings, newRecording];
    setAccumulatedRecordings(updatedRecordings);
    
    const merged = mergeAllRecordings(updatedRecordings);
    setMergedStudents(merged);
    
    const validation = validateMergedData(merged);
    setValidationIssues(validation);
    
    setDialogState('preview');
  };

  const handleError = (error: string) => {
    toast({
      title: "Erro na gravação",
      description: error,
      variant: "destructive"
    });
    setDialogState('selecting');
  };

  const handleSave = async () => {
    if (mergedStudents.length === 0 || !prescriptionId) return;

    const sessionsToSave = mergedStudents.map(merged => {
      const student = selectedStudents.find(
        s => s.name.toLowerCase() === merged.student_name.toLowerCase()
      );
      
      if (!student) {
        console.error(`Student not found: ${merged.student_name}`);
        return null;
      }

      const exercisesWithPrescribedSets = merged.exercises.map(ex => {
        const prescribedExercise = prescriptionDetails?.exercises?.find(
          pe => pe.exercises_library?.name.toLowerCase() === 
                (ex.prescribed_exercise_name || ex.executed_exercise_name).toLowerCase()
        );

        return {
          ...ex,
          prescribed_sets: prescribedExercise?.sets ? parseInt(prescribedExercise.sets) : undefined
        };
      });

      return {
        student_id: student.id,
        student_name: student.name,
        exercises: exercisesWithPrescribedSets
      };
    }).filter(Boolean);

    await createGroupSessions.mutateAsync({
      prescriptionId,
      date,
      time,
      sessions: sessionsToSave as any
    });

    for (const merged of mergedStudents) {
      if (merged.clinical_observations && merged.clinical_observations.length > 0) {
        const student = selectedStudents.find(
          s => s.name.toLowerCase() === merged.student_name.toLowerCase()
        );
        
        if (student) {
          const { data: sessionData } = await supabase
            .from('workout_sessions')
            .select('id')
            .eq('student_id', student.id)
            .eq('date', date)
            .eq('time', time)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (sessionData) {
            const observationsToInsert = merged.clinical_observations.map(obs => ({
              student_id: student.id,
              observation_text: obs.observation_text,
              category: obs.category,
              severity: obs.severity,
              session_id: sessionData.id,
              is_resolved: false
            }));
            
            const { error } = await supabase
              .from('student_observations')
              .insert(observationsToInsert);
              
            if (error) {
              console.error('Error saving clinical observations:', error);
              toast({
                title: "Aviso",
                description: `Observações clínicas de ${student.name} não foram salvas`,
                variant: "destructive"
              });
            }
          }
        }
      }
    }

    setSelectedStudents([]);
    setAccumulatedRecordings([]);
    setCurrentRecordingNumber(1);
    setMergedStudents([]);
    setValidationIssues({ errors: [], warnings: [] });
    setDialogState('selecting');
    onOpenChange(false);
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
    setDialogState('selecting');
    setAccumulatedRecordings([]);
    setCurrentRecordingNumber(1);
    setMergedStudents([]);
    setValidationIssues({ errors: [], warnings: [] });
  };

  // Auto-selecionar alunos agendados para este dia/horário
  useEffect(() => {
    if (open && assignments && enrichedStudents) {
      const currentDate = new Date();
      const weekdayMap: { [key: number]: string } = {
        0: 'sunday',
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday'
      };
      const currentWeekday = weekdayMap[currentDate.getDay()];
      const currentTime = currentDate.toTimeString().slice(0, 5);
      
      // Encontrar atribuições para hoje e horário próximo (±5 min)
      const relevantAssignments = assignments.filter(assignment => {
        const customAdaptations = assignment.custom_adaptations as any;
        if (!customAdaptations) return false;
        
        // Verificar se o dia da semana está incluído
        const hasWeekday = customAdaptations.weekdays?.includes(currentWeekday);
        if (!hasWeekday) return false;
        
        // Verificar se o horário está próximo (±5 minutos)
        if (customAdaptations.time) {
          const [assignedHour, assignedMin] = customAdaptations.time.split(':').map(Number);
          const [currentHour, currentMin] = currentTime.split(':').map(Number);
          const assignedMinutes = assignedHour * 60 + assignedMin;
          const currentMinutes = currentHour * 60 + currentMin;
          const diffMinutes = Math.abs(assignedMinutes - currentMinutes);
          return diffMinutes <= 5;
        }
        
        return true;
      });
      
      // Auto-selecionar os alunos das atribuições relevantes
      const studentsToSelect = enrichedStudents.filter(student =>
        relevantAssignments.some(assignment => assignment.student_id === student.id)
      );
      
      if (studentsToSelect.length > 0) {
        setSelectedStudents(studentsToSelect);
      }
    }
  }, [open, assignments, enrichedStudents]);

  useEffect(() => {
    if (!open) {
      setDialogState('selecting');
      setSelectedStudents([]);
      setAccumulatedRecordings([]);
      setCurrentRecordingNumber(1);
      setMergedStudents([]);
      setValidationIssues({ errors: [], warnings: [] });
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            {dialogState === 'selecting' && 'Registrar Sessão em Grupo (Voz)'}
            {dialogState === 'recording' && `🎤 Gravação ${currentRecordingNumber}`}
            {dialogState === 'processing' && 'Processando...'}
            {dialogState === 'preview' && 'Preview da Sessão'}
          </DialogTitle>
        </DialogHeader>

        {dialogState === 'selecting' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Hora *</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Selecione os Alunos</Label>
              <ScrollArea className="h-[200px] border rounded-md p-4">
                <div className="space-y-3">
                  {enrichedStudents?.map((student) => (
                    <div key={student.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={student.id}
                        checked={selectedStudents.some(s => s.id === student.id)}
                        onCheckedChange={() => toggleStudent(student)}
                      />
                      <label
                        htmlFor={student.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                      >
                        {student.name}
                        {student.has_active_prescription && (
                          <Badge variant="secondary" className="text-xs">Com prescrição</Badge>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {selectedStudents.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedStudents.length} aluno(s) selecionado(s)
                </p>
              )}
            </div>
          </div>
        )}

        {dialogState === 'recording' && prescriptionId && (
          <VoiceSessionRecorder
            prescriptionId={prescriptionId}
            selectedStudents={selectedStudents}
            date={date}
            time={time}
            onSessionData={handleSessionData}
            onError={handleError}
            autoStart={true}
          />
        )}

        {dialogState === 'preview' && mergedStudents.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base">
                {accumulatedRecordings.length} gravação(ões) realizada(s)
              </Badge>
            </div>

            {validationIssues.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Avisos</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {validationIssues.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validationIssues.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Erros</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {validationIssues.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="max-h-[500px]">
              {mergedStudents.map((student, idx) => (
                <Card key={idx} className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      <User className="h-5 w-5" />
                      {student.student_name}
                      <Badge variant="outline" className="text-xs">
                        Gravações: {student.recording_numbers.join(', ')}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {student.clinical_observations.length > 0 && (
                      <div>
                        <p className="font-semibold text-sm mb-2">
                          🩺 {student.clinical_observations.length} Observação(ões) Clínica(s)
                        </p>
                        <div className="space-y-2">
                          {student.clinical_observations.map((obs, obsIdx) => (
                            <div key={obsIdx} className="p-2 bg-muted/50 rounded-lg">
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
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="font-semibold text-sm mb-2">
                        💪 {student.exercises.length} Exercício(s)
                      </p>
                      <div className="space-y-2">
                        {student.exercises.map((ex, exIdx) => (
                          <div key={exIdx} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold">{ex.executed_exercise_name}</p>
                                {ex.prescribed_exercise_name && 
                                 ex.prescribed_exercise_name !== ex.executed_exercise_name && (
                                  <p className="text-xs text-muted-foreground">
                                    Substituindo: {ex.prescribed_exercise_name}
                                  </p>
                                )}
                              </div>
                              {ex.is_best_set && (
                                <Badge variant="secondary" className="text-xs">
                                  Melhor série
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
                              <p className="text-xs text-muted-foreground mt-2">
                                {ex.observations}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {dialogState === 'selecting' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => setDialogState('recording')}
                disabled={selectedStudents.length === 0}
              >
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
              <Button 
                onClick={handleSave}
                disabled={validationIssues.errors.length > 0 || createGroupSessions.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createGroupSessions.isPending ? "Salvando..." : "Salvar Sessão"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
