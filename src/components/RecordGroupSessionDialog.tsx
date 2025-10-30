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
  prescriptionId: string | null;
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

export function RecordGroupSessionDialog({
  open,
  onOpenChange,
  prescriptionId,
}: RecordGroupSessionDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>('selecting');
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [extractedData, setExtractedData] = useState<SessionData | null>(null);
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

  const validateSelectedStudents = (data: SessionData) => {
    const warnings: string[] = [];
    
    selectedStudents.forEach(student => {
      const found = data.sessions?.find(
        (s) => s.student_name.toLowerCase() === student.name.toLowerCase()
      );
      if (!found) {
        warnings.push(`⚠️ ${student.name} não foi mencionado no áudio`);
      }
    });
    
    return warnings;
  };

  const handleAutoAddStudents = async (data: SessionData) => {
    const newStudents: Student[] = [];
    const updatedSessions = [...data.sessions];
    
    for (let i = 0; i < data.sessions.length; i++) {
      const session = data.sessions[i];
      const existingStudent = selectedStudents.find(
        s => s.name.toLowerCase() === session.student_name.toLowerCase()
      );
      
      if (!existingStudent) {
        // Buscar aluno no banco
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
          updatedSessions[i].auto_added = true;
        }
      }
    }
    
    if (newStudents.length > 0) {
      setSelectedStudents(prev => [...prev, ...newStudents]);
      setExtractedData({ sessions: updatedSessions });
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
    console.log("Received session data:", data);
    
    // Auto-adicionar alunos mencionados não selecionados
    await handleAutoAddStudents(data);
    
    // Validar dados
    const warnings = validateSelectedStudents(data);
    const errors = validateExerciseData(data);
    
    setValidationIssues({ errors, warnings });
    setExtractedData(data);
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
    if (!extractedData || !prescriptionId) return;

    // Mapear dados para formato do hook
    const sessionsToSave = extractedData.sessions.map(session => {
      const student = selectedStudents.find(
        s => s.name.toLowerCase() === session.student_name.toLowerCase()
      );
      
      if (!student) {
        console.error(`Student not found: ${session.student_name}`);
        return null;
      }

      // Buscar sets prescritos para cada exercício
      const exercisesWithPrescribedSets = session.exercises.map(ex => {
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

    // Salvar observações clínicas
    for (const session of extractedData.sessions) {
      if (session.clinical_observations && session.clinical_observations.length > 0) {
        const student = selectedStudents.find(
          s => s.name.toLowerCase() === session.student_name.toLowerCase()
        );
        
        if (student) {
          // Buscar o session_id recém-criado
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
            const observationsToInsert = session.clinical_observations.map(obs => ({
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

    // Reset e fechar
    setSelectedStudents([]);
    setExtractedData(null);
    setValidationIssues({ errors: [], warnings: [] });
    setDialogState('selecting');
    onOpenChange(false);
  };

  const handleBack = () => {
    setDialogState('selecting');
    setExtractedData(null);
    setValidationIssues({ errors: [], warnings: [] });
  };

  useEffect(() => {
    if (!open) {
      setDialogState('selecting');
      setSelectedStudents([]);
      setExtractedData(null);
      setValidationIssues({ errors: [], warnings: [] });
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {dialogState === 'selecting' && 'Registrar Sessão em Grupo'}
            {dialogState === 'recording' && 'Gravando...'}
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
          />
        )}

        {dialogState === 'preview' && extractedData && (
          <div className="space-y-4">
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
              {extractedData.sessions.map((session, sessionIdx) => (
                <Card key={sessionIdx} className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {session.student_name}
                      {session.auto_added && (
                        <Badge variant="secondary">Adicionado automaticamente</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {session.exercises.map((ex, idx) => (
                      <div key={idx} className="mb-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">{ex.executed_exercise_name}</p>
                            {ex.prescribed_exercise_name && ex.prescribed_exercise_name !== ex.executed_exercise_name && (
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
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Séries: </span>
                            <span className="font-semibold">
                              {ex.sets !== null && ex.sets !== undefined ? ex.sets : <Badge variant="outline" className="text-xs">Prescrito</Badge>}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Reps: </span>
                            <span className="font-semibold">{ex.reps}</span>
                          </div>
                          <div className="col-span-2">
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
