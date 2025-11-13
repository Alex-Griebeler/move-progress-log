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
import { MultiSegmentRecorder } from "./MultiSegmentRecorder";
import { ManualSessionEntry } from "./ManualSessionEntry";
import { SessionSetupForm } from "./SessionSetupForm";
import { useStudents } from "@/hooks/useStudents";
import { usePrescriptionAssignments } from "@/hooks/usePrescriptions";
import { useCreateGroupWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { usePrescriptionDetails } from "@/hooks/usePrescriptions";
import { supabase } from "@/integrations/supabase/client";
import { Mic, User, Users, AlertTriangle, XCircle, Save, Edit, Trash, Pencil, ChevronLeft, ChevronRight, Plus, CheckCircle, BookOpen } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { ExerciseSelectionDialog } from "./ExerciseSelectionDialog";

interface RecordGroupSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescriptionId?: string | null;
  reopenDate?: string;
  reopenTime?: string;
}

type DialogState = 'context-setup' | 'mode-selection' | 'recording' | 'processing' | 'preview' | 'edit' | 'manual-entry';

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
  reopenDate,
  reopenTime,
}: RecordGroupSessionDialogProps) {
  const isReopening = !!(reopenDate && reopenTime);
  const [dialogState, setDialogState] = useState<DialogState>(isReopening ? 'mode-selection' : 'context-setup');
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(reopenDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(reopenTime || new Date().toTimeString().slice(0, 5));
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

  // Estados para registro manual
  const [trainer, setTrainer] = useState<string>('');

  // Exercise selection state
  const [exerciseSelectionOpen, setExerciseSelectionOpen] = useState(false);
  const [selectedExerciseForReplacement, setSelectedExerciseForReplacement] = useState<{
    exerciseIndex: number;
    currentName: string;
  } | null>(null);

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

  // Carregar sessões existentes quando reabrindo
  useEffect(() => {
    if (isReopening && prescriptionId && reopenDate && reopenTime && open) {
      loadExistingSessionsData();
    }
  }, [isReopening, prescriptionId, reopenDate, reopenTime, open]);

  const loadExistingSessionsData = async () => {
    if (!prescriptionId || !reopenDate || !reopenTime) return;

    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, student_id, students!inner(id, name, weight_kg)')
        .eq('prescription_id', prescriptionId)
        .eq('date', reopenDate)
        .eq('time', reopenTime);

      if (sessionsError) throw sessionsError;

      if (sessions && sessions.length > 0) {
        // Auto-selecionar alunos das sessões existentes
        const existingStudents = sessions.map((s: any) => ({
          id: s.student_id,
          name: s.students.name,
          weight_kg: s.students.weight_kg,
          has_active_prescription: true,
        }));
        setSelectedStudents(existingStudents);

        // Carregar exercícios existentes de todas as sessões
        const allExercises = await Promise.all(
          sessions.map(async (session: any) => {
            const { data: exercises } = await supabase
              .from('exercises')
              .select('*')
              .eq('session_id', session.id);
            
            return {
              student_name: session.students.name,
              exercises: exercises || [],
            };
          })
        );

        // Converter para formato MergedStudent
        const merged: MergedStudent[] = allExercises.map((data) => ({
          student_name: data.student_name,
          recording_numbers: [0], // Marcador de que são dados existentes
          clinical_observations: [],
          exercises: data.exercises.map((ex: any) => ({
            prescribed_exercise_name: null,
            executed_exercise_name: ex.exercise_name,
            sets: ex.sets,
            reps: ex.reps,
            load_kg: ex.load_kg,
            load_breakdown: ex.load_breakdown || '',
            observations: ex.observations,
            is_best_set: ex.is_best_set || false,
          })),
        }));

        setMergedStudents(merged);
        
        notify.info("Sessão carregada", {
          description: `${sessions.length} aluno(s) carregado(s). Você pode adicionar mais gravações.`,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar sessões existentes:", error);
    }
  };

  const toggleStudent = (student: Student) => {
    setSelectedStudents((prev) => {
      const isSelected = prev.find(s => s.id === student.id);
      
      if (isSelected) {
        return prev.filter((s) => s.id !== student.id);
      } else {
        if (prev.length >= 10) {
          notify.warning("Limite atingido", {
            description: "É possível selecionar no máximo 10 alunos por sessão",
          });
          return prev;
        }
        return [...prev, student];
      }
    });
  };

  const isContextValid = date && time && trainer && selectedStudents.length > 0;

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

  const mergeAllRecordings = (recordings: AccumulatedRecording[], existingData?: MergedStudent[]): MergedStudent[] => {
    console.log('🔍 [Group] mergeAllRecordings chamado');
    console.log(`   - Recordings: ${recordings.length}`);
    console.log(`   - Dados existentes: ${existingData?.length || 0} alunos`);
    
    const studentMap = new Map<string, MergedStudent>();

    // Primeiro, adicionar dados existentes ao mapa
    if (existingData) {
      console.log('🔍 [Group] Carregando dados existentes no mapa...');
      existingData.forEach((existing, idx) => {
        const key = existing.student_name.toLowerCase();
        console.log(`   ${idx + 1}. ${existing.student_name}: ${existing.exercises.length} exercícios`);
        studentMap.set(key, {
          ...existing,
          recording_numbers: [0], // Marcador de dados existentes
        });
      });
    }

    // Depois, mesclar com novas gravações
    console.log('🔍 [Group] Processando novos recordings...');
    recordings.forEach((recording, recIdx) => {
      console.log(`🔍 [Group] Recording ${recIdx + 1}/${recordings.length} (número ${recording.recordingNumber})`);
      console.log(`   - Sessões no recording: ${recording.data.sessions.length}`);
      
      recording.data.sessions.forEach((session, sessIdx) => {
        const key = session.student_name.toLowerCase();
        console.log(`   🔍 Sessão ${sessIdx + 1}: ${session.student_name}`);
        console.log(`      - Observações: ${session.clinical_observations?.length || 0}`);
        console.log(`      - Exercícios: ${session.exercises?.length || 0}`);
        
        if (!studentMap.has(key)) {
          console.log(`      ➕ Criando novo aluno no mapa: ${session.student_name}`);
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
        
        // Adicionar exercícios sem duplicatas
        let addedExercises = 0;
        session.exercises.forEach((newEx, exIdx) => {
          // ✅ VALIDAÇÃO: exercício deve ter reps para ser válido
          if (!newEx.reps || newEx.reps === 0) {
            console.log(`      ⚠️ Exercício ${exIdx + 1} sem repetições, IGNORADO: ${newEx.executed_exercise_name}`);
            return;
          }
          
          const isDuplicate = merged.exercises.some(
            ex => ex.executed_exercise_name === newEx.executed_exercise_name &&
                  ex.reps === newEx.reps &&
                  ex.load_kg === newEx.load_kg
          );
          if (!isDuplicate) {
            merged.exercises.push(newEx);
            addedExercises++;
            console.log(`      ✅ Exercício ${exIdx + 1} adicionado: ${newEx.executed_exercise_name} (${newEx.reps} reps)`);
          } else {
            console.log(`      ⚠️ Exercício ${exIdx + 1} duplicado, ignorado: ${newEx.executed_exercise_name}`);
          }
        });
        console.log(`      Total adicionado para ${session.student_name}: ${addedExercises} exercícios`);
      });
    });

    const result = Array.from(studentMap.values()).sort((a, b) => 
      a.student_name.localeCompare(b.student_name)
    );
    
    console.log('✅ [Group] Merge completo:');
    result.forEach((student, idx) => {
      console.log(`   ${idx + 1}. ${student.student_name}: ${student.exercises.length} exercícios, ${student.clinical_observations.length} observações`);
    });
    
    return result;
  };

  const validateMergedData = (merged: MergedStudent[]) => {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // 🆕 FASE 1: Validação de exercícios prescritos não mencionados
    const prescribedExercises = prescriptionDetails?.exercises?.filter(
      (ex: any) => ex.should_track !== false
    ) || [];
    
    merged.forEach(student => {
      const matchingStudent = selectedStudents.find(
        s => s.name.toLowerCase() === student.student_name.toLowerCase()
      );
      const studentWeight = matchingStudent?.weight_kg;
      
      if (student.exercises.length === 0) {
        errors.push(`❌ ${student.student_name} foi mencionado mas não tem exercícios registrados`);
      }
      
      // 🆕 VALIDAR EXERCÍCIOS PRESCRITOS vs EXECUTADOS
      if (prescribedExercises.length > 0) {
        prescribedExercises.forEach((prescribed: any) => {
          const prescribedName = (
            prescribed.exercise_name || 
            prescribed.exercises_library?.name || 
            ''
          ).toLowerCase().trim();
          
          if (!prescribedName) return;
          
          const wasExecuted = student.exercises.some(ex => {
            const executedName = ex.executed_exercise_name.toLowerCase().trim();
            // Verificar se os nomes são semelhantes (contém um ao outro)
            return executedName.includes(prescribedName) || 
                   prescribedName.includes(executedName) ||
                   executedName === prescribedName;
          });
          
          if (!wasExecuted) {
            warnings.push(
              `⚠️ ${student.student_name}: "${prescribed.exercise_name || prescribed.exercises_library?.name}" prescrito mas NÃO mencionado no áudio`
            );
          }
        });
      }
      
      // ✅ NOVA VALIDAÇÃO: verificar se há exercícios sem dados essenciais (provavelmente não mencionados)
      student.exercises.forEach((ex, idx) => {
        if (!ex.reps || ex.reps === 0) {
          errors.push(`❌ ${student.student_name} - ${ex.executed_exercise_name || `Exercício ${idx + 1}`}: sem repetições registradas (exercício não foi mencionado?)`);
        }
      });
      
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
      
      // ✅ Passar dados existentes (se houver) para consolidação
      const existingData = isReopening && mergedStudents.length > 0 ? mergedStudents : undefined;
      const merged = mergeAllRecordings(updatedRecordings, existingData);
      setMergedStudents(merged);
      
      const validation = validateMergedData(merged);
      setValidationIssues(validation);
      
      console.log("✅ Dados processados (consolidados com existentes), transitando para preview...");
      
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

    // Se estiver reabrindo, deletar sessões antigas antes de criar novas consolidadas
    if (isReopening && reopenDate && reopenTime) {
      try {
        // Buscar IDs das sessões existentes
        const { data: existingSessions } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('prescription_id', prescriptionId)
          .eq('date', reopenDate)
          .eq('time', reopenTime);

        if (existingSessions && existingSessions.length > 0) {
          const sessionIds = existingSessions.map(s => s.id);
          
          // Deletar exercícios das sessões
          await supabase
            .from('exercises')
            .delete()
            .in('session_id', sessionIds);
          
          // Deletar as sessões
          await supabase
            .from('workout_sessions')
            .delete()
            .in('id', sessionIds);
          
          console.log(`✅ ${sessionIds.length} sessão(ões) antiga(s) deletada(s) para consolidação`);
        }
      } catch (error) {
        console.error('Erro ao deletar sessões antigas:', error);
        notify.error("Erro ao consolidar dados", {
          description: "Não foi possível atualizar as sessões existentes.",
        });
        return;
      }
    }

    const sessionsToSave = mergedStudents.map(merged => {
      const student = selectedStudents.find(
        s => s.name.toLowerCase() === merged.student_name.toLowerCase()
      );
      
      if (!student) {
        console.error(`Student not found: ${merged.student_name}`);
        return null;
      }

      return {
        student_id: student.id,
        student_name: student.name,
        exercises: merged.exercises, // Apenas exercícios mencionados no áudio
        clinical_observations: merged.clinical_observations || []
      };
    }).filter(Boolean);

    await createGroupSessions.mutateAsync({
      prescriptionId,
      date,
      time,
      sessions: sessionsToSave as any
    });

    // Adicionar exercícios prescritos não mencionados para edição posterior
    for (const sessionData of sessionsToSave) {
      // Buscar a sessão criada para este aluno
      const { data: createdSession } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('student_id', sessionData.student_id)
        .eq('date', date)
        .eq('time', time)
        .eq('prescription_id', prescriptionId)
        .maybeSingle();
      
      if (!createdSession) continue;
      
      // Buscar exercícios prescritos QUE DEVEM SER RASTREADOS
      const prescribedExercises = prescriptionDetails?.exercises?.filter(
        (ex: any) => ex.should_track !== false
      ) || [];
      
      // Buscar exercícios já salvos para este aluno (vindos do áudio)
      const { data: savedExercises } = await supabase
        .from('exercises')
        .select('exercise_name')
        .eq('session_id', createdSession.id);
      
      const savedExerciseNames = new Set(
        (savedExercises || []).map(ex => ex.exercise_name.toLowerCase())
      );
      
      // Identificar exercícios prescritos não mencionados
      const unmentionedExercises = prescribedExercises.filter(prescribed => {
        const prescribedName = (
          prescribed.exercise_name || 
          prescribed.exercises_library?.name
        ).toLowerCase();
        return !savedExerciseNames.has(prescribedName);
      });
      
      // Inserir exercícios não mencionados com valores zero
      if (unmentionedExercises.length > 0) {
        const exercisesToInsert = unmentionedExercises.map(ex => ({
          session_id: createdSession.id,
          exercise_name: ex.exercise_name || ex.exercises_library?.name,
          sets: 0,
          reps: 0,
          load_kg: null,
          load_description: null,
          load_breakdown: null,
          observations: '⚠️ Exercício prescrito não registrado no áudio - preencher manualmente',
          is_best_set: false
        }));
        
        const { error: insertError } = await supabase
          .from('exercises')
          .insert(exercisesToInsert);
        
        if (insertError) {
          console.error('Erro ao inserir exercícios não mencionados:', insertError);
        }
      }
    }

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
    setDialogState('context-setup');
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
    setDialogState('mode-selection');
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

  const openExerciseSelection = (exerciseIndex: number) => {
    const exercise = editableExercises[exerciseIndex];
    if (!exercise) return;
    
    setSelectedExerciseForReplacement({
      exerciseIndex,
      currentName: exercise.executed_exercise_name,
    });
    setExerciseSelectionOpen(true);
  };

  const handleExerciseSelected = (exerciseId: string, exerciseName: string) => {
    if (!selectedExerciseForReplacement) return;
    
    const { exerciseIndex } = selectedExerciseForReplacement;
    const updated = [...editableExercises];
    updated[exerciseIndex].executed_exercise_name = exerciseName;
    setEditableExercises(updated);
    
    setSelectedExerciseForReplacement(null);
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

  const handleSaveManual = async (data: {
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
  }) => {
    try {
      const sessionsToCreate = data.studentExercises.map(se => {
        const student = selectedStudents.find(s => s.id === se.studentId);
        return {
          student_id: se.studentId,
          student_name: student?.name || '',
          exercises: se.exercises.map(ex => ({
            executed_exercise_name: ex.exercise_name,
            sets: ex.sets,
            reps: ex.reps,
            load_kg: ex.load_kg,
            load_breakdown: ex.load_breakdown,
            observations: ex.observations,
            is_best_set: false
          }))
        };
      });

      // Criar sessões com os novos campos
      for (const session of sessionsToCreate) {
        const { data: workoutSession, error: sessionError } = await supabase
          .from("workout_sessions")
          .insert({
            student_id: session.student_id,
            prescription_id: prescriptionId,
            date,
            time,
            trainer_name: trainer,
            is_finalized: true,
            can_reopen: true,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        const exercisesToInsert = session.exercises.map((ex) => ({
          session_id: workoutSession.id,
          exercise_name: ex.executed_exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          load_kg: ex.load_kg,
          load_breakdown: ex.load_breakdown,
          observations: ex.observations || null,
        }));

        const { error: exercisesError } = await supabase
          .from("exercises")
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      notify.success("Sessões registradas com sucesso", {
        description: `${sessionsToCreate.length} sessão(ões) criada(s) manualmente`,
      });

      // Reset completo de estados
      setDialogState('context-setup');
      setSelectedStudents([]);
      setTrainer('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setHasAutoSelected(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving manual sessions:", error);
      notify.error("Erro ao salvar sessões", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  useEffect(() => {
    if (!open) {
      setDialogState('context-setup');
      setSelectedStudents([]);
      setAccumulatedRecordings([]);
      setCurrentRecordingNumber(1);
      setMergedStudents([]);
      setValidationIssues({ errors: [], warnings: [] });
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setHasAutoSelected(false);
      setTrainer('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent forceMount className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
            {dialogState === 'context-setup' && "Configurar Sessão"}
            {dialogState === 'mode-selection' && (
              <>
                <User className="h-5 w-5" />
                Escolher Modo de Registro
              </>
            )}
            {dialogState === 'recording' && (
              <>
                <Mic className="h-5 w-5" />
                🎤 Gravação {currentRecordingNumber}
              </>
            )}
            {dialogState === 'manual-entry' && (
              <>
                <BookOpen className="h-5 w-5" />
                Registro Manual da Sessão
              </>
            )}
            {dialogState === 'processing' && 'Processando...'}
            {dialogState === 'preview' && 'Preview da Sessão'}
            {dialogState === 'edit' && `Editando: ${mergedStudents[editingStudentIndex]?.student_name}`}
          </DialogTitle>
        </DialogHeader>

        {dialogState === 'context-setup' && (
          <SessionSetupForm
            date={date}
            time={time}
            trainerName={trainer}
            selectedStudents={selectedStudents}
            onDateChange={setDate}
            onTimeChange={setTime}
            onTrainerNameChange={setTrainer}
            onStudentToggle={toggleStudent}
          />
        )}

        {dialogState === 'mode-selection' && (
          <div className="space-y-6 py-8">
            <p className="text-center text-muted-foreground">
              Escolha como deseja registrar a sessão em grupo:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Button
                variant="outline"
                size="lg"
                className="h-32 flex flex-col gap-4 items-center justify-center"
                onClick={() => setDialogState('recording')}
              >
                <Mic className="h-12 w-12" />
                <div className="text-center">
                  <div className="font-semibold">Registro por Voz Contínuo</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Grave uma única sessão contínua e processe no final
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-32 flex flex-col gap-4 items-center justify-center"
                onClick={() => setDialogState('manual-entry')}
              >
                <BookOpen className="h-12 w-12" />
                <div className="text-center">
                  <div className="font-semibold">Registro Manual</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Preencha os dados da sessão manualmente
                  </div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {dialogState === 'recording' && (
          <div className="space-y-4">
            {/* Header com Alunos Participantes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Alunos Participantes
                  <Badge variant="secondary" className="ml-auto">
                    {selectedStudents.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedStudents.map(student => {
                    const initials = student.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    
                    return (
                      <Badge 
                        key={student.id}
                        variant="outline"
                        className="px-3 py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {initials}
                          </div>
                          <span>{student.name}</span>
                        </div>
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Grid de Exercícios + Gravador */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Coluna Esquerda - Prescrição */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Prescrição - Exercícios a Registrar</CardTitle>
                    <Badge variant="secondary">
                      {prescriptionDetails?.exercises?.filter((ex: any) => ex.should_track !== false).length || 0} exercícios
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full px-6 pb-6">
                    {prescriptionDetails?.exercises
                      ?.filter((ex: any) => ex.should_track !== false)
                      .map((exercise: any, index: number) => (
                        <div 
                          key={exercise.id || index} 
                          className="mb-4 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium text-sm mb-1">
                            {exercise.exercise_name || exercise.exercises_library?.name}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {exercise.sets && exercise.reps && (
                              <div>📊 {exercise.sets} x {exercise.reps}</div>
                            )}
                            {exercise.training_method && (
                              <div>🎯 {exercise.training_method}</div>
                            )}
                            {exercise.observations && (
                              <div className="mt-1 text-xs italic">💬 {exercise.observations}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    {(!prescriptionDetails?.exercises || 
                      prescriptionDetails.exercises.filter((ex: any) => ex.should_track !== false).length === 0) && (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Nenhum exercício para registrar nesta prescrição
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita - Gravador Multi-Segmento */}
            <div className="lg:col-span-3">
              <MultiSegmentRecorder
                key={`recording-${currentRecordingNumber}`}
                prescriptionId={prescriptionId}
                selectedStudents={selectedStudents}
                date={date}
                time={time}
                onComplete={(segments) => {
                  console.log('🎯 Total de segmentos recebidos:', segments.length);
                  
                  // Consolidar todos os exercícios e observações de todos os segmentos
                  const allSessions = segments.flatMap(seg => {
                    console.log(`📼 Segmento ${seg.segmentOrder}:`, seg.extractedData?.sessions);
                    return seg.extractedData?.sessions || [];
                  });
                  
                  // 🆕 FASE 2: Agrupar por aluno e consolidar exercícios com deduplicação inteligente
                  const sessionsByStudent = allSessions.reduce((acc, session) => {
                    const existing = acc.find(s => 
                      s.student_name.toLowerCase() === session.student_name.toLowerCase()
                    );
                    
                    if (existing) {
                      // 🆕 DEDUPLICAÇÃO INTELIGENTE DE EXERCÍCIOS
                      session.exercises.forEach(newEx => {
                        const newExName = newEx.executed_exercise_name.toLowerCase().trim();
                        
                        // Verificar se já existe um exercício com nome semelhante
                        const duplicateIndex = existing.exercises.findIndex((existingEx: any) => {
                          const existingExName = existingEx.executed_exercise_name.toLowerCase().trim();
                          // Considerar duplicata se os nomes são idênticos ou contêm um ao outro
                          return existingExName === newExName || 
                                 existingExName.includes(newExName) || 
                                 newExName.includes(existingExName);
                        });
                        
                        if (duplicateIndex >= 0) {
                          // ⚠️ CONFLITO DETECTADO - aplicar estratégia de resolução
                          const existingEx = existing.exercises[duplicateIndex];
                          
                          // Estratégia 1: Manter o exercício com maior carga
                          const newLoad = newEx.load_kg || 0;
                          const existingLoad = existingEx.load_kg || 0;
                          
                          if (newLoad > existingLoad) {
                            console.log(`🔄 [${session.student_name}] Substituindo "${newExName}" (carga: ${existingLoad}kg → ${newLoad}kg)`);
                            existing.exercises[duplicateIndex] = newEx;
                          } else if (newLoad === existingLoad && newLoad > 0) {
                            // Estratégia 2: Se cargas iguais, manter o mais recente (último segmento)
                            console.log(`🔄 [${session.student_name}] Substituindo "${newExName}" (mesma carga ${newLoad}kg, mantendo versão mais recente)`);
                            existing.exercises[duplicateIndex] = newEx;
                          } else {
                            // Manter o existente (tinha carga maior ou ambos sem carga)
                            console.log(`⚠️ [${session.student_name}] Duplicata ignorada "${newExName}" (carga menor: ${newLoad}kg vs ${existingLoad}kg)`);
                          }
                        } else {
                          // ✅ Não é duplicata, adicionar normalmente
                          existing.exercises.push(newEx);
                        }
                      });
                      
                      // Observações clínicas sem deduplicação (podem ser diferentes e todas são válidas)
                      existing.clinical_observations = [
                        ...existing.clinical_observations, 
                        ...session.clinical_observations
                      ];
                    } else {
                      // Primeiro registro deste aluno
                      acc.push({
                        student_name: session.student_name,
                        exercises: [...session.exercises],
                        clinical_observations: [...session.clinical_observations]
                      });
                    }
                    
                    return acc;
                  }, [] as Array<{
                    student_name: string;
                    exercises: any[];
                    clinical_observations: any[];
                  }>);
                  
                  const consolidatedData = {
                    sessions: sessionsByStudent
                  };
                  
                  console.log('📦 Dados consolidados (alunos agrupados):', consolidatedData);
                  console.log('➡️ Enviando para tela de validação manual...');
                  
                  // handleSessionData já faz a transição para 'preview' (tela de edição)
                  handleSessionData(consolidatedData);
                }}
                onError={handleError}
              />
            </div>
            </div>
          </div>
        )}

        {dialogState === 'manual-entry' && (
          <ManualSessionEntry
            prescriptionExercises={
              prescriptionDetails?.exercises
                ?.filter((ex: any) => ex.should_track !== false)
                .map((ex: any) => ({
                  id: ex.id,
                  exercise_name: ex.exercise_name,
                  sets: ex.sets,
                  reps: ex.reps,
                  interval_seconds: ex.interval_seconds,
                  pse: ex.pse,
                  training_method: ex.training_method,
                observations: ex.observations,
              })) || []
            }
            selectedStudents={selectedStudents}
            onSave={handleSaveManual}
            onCancel={() => setDialogState('mode-selection')}
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

            {/* 🆕 FASE 1: Alertas de Validação Melhorados */}
            {(validationIssues.errors.length > 0 || validationIssues.warnings.length > 0) && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-100">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                    Alertas de Validação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Erros Críticos (bloqueiam salvamento) */}
                  {validationIssues.errors.length > 0 && (
                    <div className="space-y-2">
                      {validationIssues.errors.map((err, idx) => (
                        <Alert key={`error-${idx}`} variant="destructive" className="py-2">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">{err}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                  
                  {/* Avisos (não bloqueiam, mas alertam) */}
                  {validationIssues.warnings.length > 0 && (
                    <div className="space-y-2">
                      {validationIssues.warnings.map((warn, idx) => (
                        <Alert 
                          key={`warning-${idx}`} 
                          className="border-amber-300 bg-amber-100 dark:bg-amber-950/50 dark:border-amber-700 py-2"
                        >
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                          <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">
                            {warn}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                  
                  {/* 🆕 Botão para adicionar exercícios não mencionados */}
                  {validationIssues.warnings.some(w => w.includes('NÃO mencionado no áudio')) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full border-amber-400 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/30"
                      onClick={() => {
                        // Identificar exercícios não mencionados e adicionar com valores zero
                        const prescribedExercises = prescriptionDetails?.exercises?.filter(
                          (ex: any) => ex.should_track !== false
                        ) || [];
                        
                        const updatedMergedStudents = mergedStudents.map(student => {
                          const unmentionedExercises = prescribedExercises.filter((prescribed: any) => {
                            const prescribedName = (
                              prescribed.exercise_name || 
                              prescribed.exercises_library?.name || 
                              ''
                            ).toLowerCase().trim();
                            
                            const wasExecuted = student.exercises.some(ex => {
                              const executedName = ex.executed_exercise_name.toLowerCase().trim();
                              return executedName.includes(prescribedName) || 
                                     prescribedName.includes(executedName) ||
                                     executedName === prescribedName;
                            });
                            
                            return !wasExecuted && prescribedName;
                          });
                          
                          const newExercises = unmentionedExercises.map((prescribed: any) => ({
                            prescribed_exercise_name: prescribed.exercise_name || prescribed.exercises_library?.name,
                            executed_exercise_name: prescribed.exercise_name || prescribed.exercises_library?.name,
                            sets: prescribed.sets || null,
                            reps: 0,
                            load_kg: null,
                            load_breakdown: '',
                            observations: '⚠️ Exercício prescrito mas não mencionado - preencher manualmente',
                            is_best_set: false,
                          }));
                          
                          return {
                            ...student,
                            exercises: [...student.exercises, ...newExercises],
                          };
                        });
                        
                        setMergedStudents(updatedMergedStudents);
                        const issues = validateMergedData(updatedMergedStudents);
                        setValidationIssues(issues);
                        notify.success('Exercícios não mencionados adicionados para edição manual');
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Exercícios Não Mencionados para Edição
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {validationIssues.warnings.length === 0 && validationIssues.errors.length === 0 && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                <AlertTitle className="text-green-900 dark:text-green-100">Tudo pronto!</AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200">
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
                          <div className="flex gap-2">
                            <Input
                              id={`ex-name-${idx}`}
                              value={ex.executed_exercise_name}
                              onChange={(e) => {
                                const updated = [...editableExercises];
                                updated[idx].executed_exercise_name = e.target.value;
                                setEditableExercises(updated);
                              }}
                              readOnly
                              className="flex-1"
                              title="Use o botão ao lado para substituir o exercício"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openExerciseSelection(idx)}
                              className="gap-1 shrink-0"
                              title="Substituir por exercício cadastrado"
                            >
                              <BookOpen className="h-4 w-4" />
                            </Button>
                          </div>
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
        {dialogState === 'context-setup' && (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => setDialogState('mode-selection')}
              disabled={!date || !time || !trainer || selectedStudents.length === 0}
            >
              Continuar
            </Button>
          </>
        )}
        
        {dialogState === 'mode-selection' && (
            <Button variant="outline" onClick={() => setDialogState('context-setup')}>
              Voltar
            </Button>
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

      {/* Dialog de seleção de exercício */}
      <ExerciseSelectionDialog
        open={exerciseSelectionOpen}
        onOpenChange={setExerciseSelectionOpen}
        currentExerciseName={selectedExerciseForReplacement?.currentName || ""}
        onExerciseSelected={handleExerciseSelected}
        autoSuggest={true}
      />
    </Dialog>
  );
}
