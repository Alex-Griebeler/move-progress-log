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
import { Mic, User, AlertTriangle, XCircle, Save, Edit, Trash, Pencil, ChevronLeft, ChevronRight, Plus, CheckCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";

interface RecordGroupSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescriptionId?: string | null;
}

type DialogState = 'selecting' | 'recording' | 'processing' | 'preview' | 'edit';

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
      categories: string[];
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
    categories: string[];
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
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  
  // Estados para edição manual
  const [editingStudentIndex, setEditingStudentIndex] = useState<number>(0);
  const [editableObservations, setEditableObservations] = useState<Array<{
    observation_text: string;
    categories: string[];
    severity: 'baixa' | 'média' | 'alta';
  }>>([]);
  const [editableExercises, setEditableExercises] = useState<Array<{
    prescribed_exercise_name?: string | null;
    executed_exercise_name: string;
    sets?: number | null;
    reps: number | null;
    load_kg?: number | null;
    load_breakdown: string | null;
    observations?: string | null;
    is_best_set: boolean;
  }>>([]);

  const { data: students } = useStudents();
  const { data: assignments } = usePrescriptionAssignments(prescriptionId);
  const { data: prescriptionDetails } = usePrescriptionDetails(prescriptionId);
  const createGroupSessions = useCreateGroupWorkoutSessions();
  
  // 🔍 DEBUG: Monitorar mudanças de estado
  useEffect(() => {
    console.log("🔄 Dialog State mudou para:", dialogState);
  }, [dialogState]);

  useEffect(() => {
    console.log("📊 Merged Students atualizado:", mergedStudents.length, "alunos");
  }, [mergedStudents]);

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

  const getSeverityVariant = (severity: string): "destructive" | "default" | "secondary" => {
    switch (severity) {
      case 'alta': return 'destructive';
      case 'média': return 'default';
      case 'baixa': return 'secondary';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    return category.charAt(0).toUpperCase();
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
      const matchingStudent = selectedStudents.find(
        s => s.name.toLowerCase() === student.student_name.toLowerCase()
      );
      const studentWeight = matchingStudent?.weight_kg;
      
      if (student.exercises.length === 0) {
        errors.push(`❌ ${student.student_name} foi mencionado mas não tem exercícios registrados`);
      }
      
      if (student.recording_numbers.length === 1 && accumulatedRecordings.length > 1) {
        warnings.push(`⚠️ ${student.student_name} só aparece na gravação ${student.recording_numbers[0]}`);
      }
      
      // VALIDAR OBSERVAÇÕES CLÍNICAS
      student.clinical_observations.forEach((obs, idx) => {
        if (!obs.severity) {
          errors.push(`❌ ${student.student_name}: Observação clínica ${idx+1} sem severidade`);
        }
        if (!obs.observation_text || obs.observation_text.trim() === '') {
          errors.push(`❌ ${student.student_name}: Observação clínica ${idx+1} sem texto`);
        }
      });
      
      // VALIDAR EXERCÍCIOS
      student.exercises.forEach((ex, idx) => {
        const exName = ex.executed_exercise_name || `Exercício ${idx + 1}`;
        
        if (!ex.reps || ex.reps <= 0) {
          errors.push(`❌ ${student.student_name} - ${exName}: faltam repetições`);
        }
        
        if (!ex.load_breakdown || ex.load_breakdown.trim() === '') {
          warnings.push(`⚠️ ${student.student_name} - ${exName}: sem descrição de carga`);
        }
        
        if (ex.load_kg === null || ex.load_kg === 0) {
          warnings.push(`⚠️ ${student.student_name} - ${exName}: sem carga calculada`);
        }
        
        // CRÍTICO: Verificar se é peso corporal mas não calculou automaticamente
        const isPesoCorporal = ex.load_breakdown?.toLowerCase().includes('peso corporal');
        if (isPesoCorporal && ex.load_kg === null && studentWeight) {
          errors.push(`❌ ${student.student_name} - ${exName}: peso corporal não foi calculado automaticamente (aluno tem ${studentWeight} kg cadastrado)`);
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
    try {
      const newStudents: Student[] = [];
      
      for (let i = 0; i < data.sessions.length; i++) {
        const session = data.sessions[i];
        const existingStudent = selectedStudents.find(
          s => s.name.toLowerCase() === session.student_name.toLowerCase()
        );
        
        if (!existingStudent) {
          const { data: studentData, error } = await supabase
            .from('students')
            .select('*')
            .ilike('name', session.student_name)
            .single();
          
          if (error) {
            console.error(`⚠️ Aluno "${session.student_name}" não encontrado:`, error);
            continue;
          }
          
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
        notify.success(i18n.modules.workouts.studentsAutoAdded, {
          description: `${newStudents.map(s => s.name).join(", ")} ${i18n.modules.workouts.studentsWereAdded}`,
        });
      }
    } catch (error) {
      console.error("❌ Erro em handleAutoAddStudents:", error);
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
    console.log("📥 Dados recebidos da gravação", currentRecordingNumber, ":", data);
    
    try {
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
      
      console.log("✅ Dados processados, transitando para preview...");
      
      // Garantir que React processe todos os setStates antes de mudar dialogState
      setTimeout(() => {
        setDialogState('preview');
        console.log("🎯 Estado mudou para preview");
      }, 100);
      
    } catch (error) {
      console.error("❌ Erro em handleSessionData:", error);
      handleError(error instanceof Error ? error.message : "Erro ao processar dados");
    }
  };

  const handleError = (error: string) => {
    console.error("❌ handleError chamado:", error);
    notify.error(i18n.modules.workouts.recordingError, {
      description: error,
    });
    // Não voltar para 'selecting' imediatamente - permitir retry
    setDialogState('recording');
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
              categories: obs.categories,
              severity: obs.severity,
              session_id: sessionData.id,
              is_resolved: false
            }));
            
            const { error } = await supabase
              .from('student_observations')
              .insert(observationsToInsert);
              
            if (error) {
              console.error('Error saving clinical observations:', error);
              notify.error(i18n.modules.workouts.warning, {
                description: `${i18n.modules.workouts.clinicalObservationsNotSaved}: ${student.name}`,
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
      notify.warning(i18n.modules.workouts.limitReached, {
        description: i18n.modules.workouts.maxRecordings.replace('{{max}}', MAX_RECORDINGS.toString()),
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

  const handleStartEditing = () => {
    if (mergedStudents.length === 0) return;
    
    setEditingStudentIndex(0);
    setEditableObservations(mergedStudents[0].clinical_observations || []);
    setEditableExercises(mergedStudents[0].exercises || []);
    setDialogState('edit');
  };

  const handleSaveEdits = () => {
    // Atualizar o aluno sendo editado com os dados editáveis
    const updatedMerged = [...mergedStudents];
    updatedMerged[editingStudentIndex] = {
      ...updatedMerged[editingStudentIndex],
      clinical_observations: editableObservations,
      exercises: editableExercises
    };
    
    setMergedStudents(updatedMerged);
    
    // Revalidar dados após edição
    const validation = validateMergedData(updatedMerged);
    setValidationIssues(validation);
    
    setDialogState('preview');
  };

  const handleNavigateStudent = (direction: 'prev' | 'next') => {
    // Salvar edições atuais antes de navegar
    const updatedMerged = [...mergedStudents];
    updatedMerged[editingStudentIndex] = {
      ...updatedMerged[editingStudentIndex],
      clinical_observations: editableObservations,
      exercises: editableExercises
    };
    setMergedStudents(updatedMerged);
    
    // Navegar para o próximo/anterior aluno
    const newIndex = direction === 'next' 
      ? Math.min(editingStudentIndex + 1, mergedStudents.length - 1)
      : Math.max(editingStudentIndex - 1, 0);
    
    setEditingStudentIndex(newIndex);
    setEditableObservations(updatedMerged[newIndex].clinical_observations || []);
    setEditableExercises(updatedMerged[newIndex].exercises || []);
  };

  const calculateLoadFromBreakdown = (breakdown: string): number | null => {
    try {
      let total = 0;
      let processedEachSide = false;
      
      const eachSideMatch = breakdown.match(/\((.*?)\)\s*de cada lado/i);
      if (eachSideMatch) {
        const content = eachSideMatch[1];
        processedEachSide = true;
        
        const kgMatches = content.matchAll(/(\d+(?:\.\d+)?)\s*kg/gi);
        for (const m of kgMatches) {
          total += parseFloat(m[1]) * 2;
        }
        
        const lbMatches = content.matchAll(/(\d+(?:\.\d+)?)\s*lb/gi);
        for (const m of lbMatches) {
          total += parseFloat(m[1]) * 0.45 * 2;
        }
      }
      
      const multiKbMatch = breakdown.match(/(2\s*kettlebells?|duplo\s*kettlebell|kettlebell\s*duplo|dois\s*halteres|2\s*halteres).*?(\d+(?:\.\d+)?)\s*(kg|lb)/i);
      if (multiKbMatch && !processedEachSide) {
        const value = parseFloat(multiKbMatch[2]);
        const unit = multiKbMatch[3].toLowerCase();
        total += (unit === 'lb' ? value * 0.45 : value) * 2;
      }
      
      const barraMatch = breakdown.match(/barra\s*(\d+(?:\.\d+)?)\s*kg/i);
      if (barraMatch) {
        total += parseFloat(barraMatch[1]);
      }
      
      if (!processedEachSide && !multiKbMatch) {
        const kgMatches = breakdown.matchAll(/(\d+(?:\.\d+)?)\s*kg/gi);
        for (const m of kgMatches) {
          if (!breakdown.substring(m.index!).includes('barra')) {
            total += parseFloat(m[1]);
          }
        }
        
        const lbMatches = breakdown.matchAll(/(\d+(?:\.\d+)?)\s*lb/gi);
        for (const m of lbMatches) {
          total += parseFloat(m[1]) * 0.45;
        }
      }
      
      return total > 0 ? Math.round(total * 10) / 10 : null;
    } catch (err) {
      console.error('Erro ao calcular carga:', err);
      return null;
    }
  };

  // Auto-selecionar alunos agendados para este dia/horário (apenas na primeira vez)
  useEffect(() => {
    if (open && assignments && enrichedStudents && !hasAutoSelected) {
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
        setHasAutoSelected(true);
      }
    }
  }, [open, assignments, enrichedStudents, hasAutoSelected]);

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
      setHasAutoSelected(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent forceMount className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            {dialogState === 'selecting' && 'Registrar Sessão em Grupo (Voz)'}
            {dialogState === 'recording' && `🎤 Gravação ${currentRecordingNumber}`}
            {dialogState === 'processing' && 'Processando...'}
            {dialogState === 'preview' && 'Preview da Sessão'}
            {dialogState === 'edit' && `Editando: ${mergedStudents[editingStudentIndex]?.student_name}`}
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

        {dialogState === 'recording' && (
          <VoiceSessionRecorder
            key={`recording-${currentRecordingNumber}`}
            prescriptionId={prescriptionId}
            selectedStudents={selectedStudents}
            date={date}
            time={time}
            onSessionData={handleSessionData}
            onError={handleError}
            autoStart={true}
            onRecordingStarted={() => {
              console.log('🟢 Dialog: Callback onRecordingStarted recebido do filho');
            }}
          />
        )}

        {dialogState === 'preview' && mergedStudents.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <span>📅 {new Date(date).toLocaleDateString('pt-BR')}</span>
              <span>🕐 {time}</span>
            </div>
            
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
                <AlertTitle>Erros Críticos</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {validationIssues.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validationIssues.warnings.length === 0 && validationIssues.errors.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Tudo pronto!</AlertTitle>
                <AlertDescription>
                  Todos os dados críticos foram preenchidos corretamente.
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
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant={getSeverityVariant(obs.severity)}>
                                  {obs.severity}
                                </Badge>
                                {obs.categories?.map((cat, catIdx) => (
                                  <Badge key={catIdx} variant="outline" className="text-xs">
                                    <span className="mr-1">{getCategoryIcon(cat)}</span>
                                    {cat}
                                  </Badge>
                                ))}
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
                                <div className="flex flex-col">
                                  {ex.load_kg !== null && ex.load_kg !== undefined && (
                                    <span className="font-bold text-primary">{ex.load_kg} kg</span>
                                  )}
                                  {ex.load_breakdown && (
                                    <span className="text-xs text-muted-foreground">{ex.load_breakdown}</span>
                                  )}
                                </div>
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

        {dialogState === 'edit' && mergedStudents[editingStudentIndex] && (
          <ScrollArea className="max-h-[600px] pr-4">
            <div className="space-y-6">
              {/* Observações Clínicas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🩺 Observações Clínicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editableObservations.map((obs, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">Observação {idx + 1}</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditableObservations(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`obs-text-${idx}`}>Texto</Label>
                        <Textarea
                          id={`obs-text-${idx}`}
                          value={obs.observation_text}
                          onChange={(e) => {
                            const updated = [...editableObservations];
                            updated[idx].observation_text = e.target.value;
                            setEditableObservations(updated);
                          }}
                          rows={2}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`obs-severity-${idx}`}>Severidade</Label>
                        <Select
                          value={obs.severity}
                          onValueChange={(value: 'baixa' | 'média' | 'alta') => {
                            const updated = [...editableObservations];
                            updated[idx].severity = value;
                            setEditableObservations(updated);
                          }}
                        >
                          <SelectTrigger id={`obs-severity-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="média">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditableObservations(prev => [
                      ...prev,
                      { observation_text: '', categories: ['geral'], severity: 'média' }
                    ])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Observação
                  </Button>
                </CardContent>
              </Card>

              {/* Exercícios */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">💪 Exercícios Executados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editableExercises.map((ex, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">Exercício {idx + 1}</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditableExercises(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`ex-name-${idx}`}>Nome do Exercício *</Label>
                          <Input
                            id={`ex-name-${idx}`}
                            value={ex.executed_exercise_name}
                            onChange={(e) => {
                              const updated = [...editableExercises];
                              updated[idx].executed_exercise_name = e.target.value;
                              setEditableExercises(updated);
                            }}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`ex-reps-${idx}`}>Repetições *</Label>
                          <Input
                            id={`ex-reps-${idx}`}
                            type="number"
                            value={ex.reps ?? ''}
                            onChange={(e) => {
                              const updated = [...editableExercises];
                              updated[idx].reps = e.target.value ? parseInt(e.target.value) : null;
                              setEditableExercises(updated);
                            }}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`ex-sets-${idx}`}>Séries</Label>
                          <Input
                            id={`ex-sets-${idx}`}
                            type="number"
                            value={ex.sets ?? ''}
                            onChange={(e) => {
                              const updated = [...editableExercises];
                              updated[idx].sets = e.target.value ? parseInt(e.target.value) : null;
                              setEditableExercises(updated);
                            }}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`ex-load-${idx}`}>Carga (kg)</Label>
                          <Input
                            id={`ex-load-${idx}`}
                            type="number"
                            step="0.1"
                            value={ex.load_kg ?? ''}
                            onChange={(e) => {
                              const updated = [...editableExercises];
                              updated[idx].load_kg = e.target.value ? parseFloat(e.target.value) : null;
                              setEditableExercises(updated);
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`ex-breakdown-${idx}`}>Descrição da Carga</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`ex-breakdown-${idx}`}
                            value={ex.load_breakdown ?? ''}
                            onChange={(e) => {
                              const updated = [...editableExercises];
                              updated[idx].load_breakdown = e.target.value;
                              setEditableExercises(updated);
                            }}
                            placeholder="Ex: (25 lb) de cada lado + barra 10 kg"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (ex.load_breakdown) {
                                const calculated = calculateLoadFromBreakdown(ex.load_breakdown);
                                if (calculated !== null) {
                                  const updated = [...editableExercises];
                                  updated[idx].load_kg = calculated;
                                  setEditableExercises(updated);
                                  notify.info("Carga calculada", {
                                    description: `${calculated} kg`
                                  });
                                }
                              }
                            }}
                          >
                            Calcular
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`ex-obs-${idx}`}>Observações</Label>
                        <Textarea
                          id={`ex-obs-${idx}`}
                          value={ex.observations ?? ''}
                          onChange={(e) => {
                            const updated = [...editableExercises];
                            updated[idx].observations = e.target.value || null;
                            setEditableExercises(updated);
                          }}
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditableExercises(prev => [
                      ...prev,
                      {
                        executed_exercise_name: '',
                        sets: null,
                        reps: null,
                        load_kg: null,
                        load_breakdown: null,
                        observations: null,
                        is_best_set: true
                      }
                    ])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Exercício
                  </Button>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
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
              <Button variant="outline" onClick={handleBack} disabled={createGroupSessions.isPending}>
                Voltar
              </Button>
              <Button variant="outline" onClick={handleStartEditing}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar Dados
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

          {dialogState === 'edit' && (
            <>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleNavigateStudent('prev')}
                  disabled={editingStudentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Aluno {editingStudentIndex + 1} de {mergedStudents.length}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleNavigateStudent('next')}
                  disabled={editingStudentIndex === mergedStudents.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" onClick={() => setDialogState('preview')}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdits}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Edições
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
