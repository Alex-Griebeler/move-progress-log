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
import { MultiSegmentRecorder } from "./MultiSegmentRecorder";
import { SessionContextForm } from "./SessionContextForm";
import { usePrescriptionAssignments } from "@/hooks/usePrescriptions";
import { useCreateWorkoutSession } from "@/hooks/useWorkoutSessions";
import { supabase } from "@/integrations/supabase/client";
import { Mic, Save, BookOpen } from "lucide-react";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { useQuery } from "@tanstack/react-query";
import { ExerciseSelectionDialog } from "./ExerciseSelectionDialog";

interface RecordIndividualSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  existingSessionId?: string | null;
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
  existingSessionId,
}: RecordIndividualSessionDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>('setup');
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [trainerName, setTrainerName] = useState<string>('');
  const [accumulatedRecordings, setAccumulatedRecordings] = useState<AccumulatedRecording[]>([]);
  const [currentRecordingNumber, setCurrentRecordingNumber] = useState(1);
  const [mergedData, setMergedData] = useState<MergedData | null>(null);
  const [editableObservations, setEditableObservations] = useState<MergedData['clinical_observations']>([]);
  const [editableExercises, setEditableExercises] = useState<MergedData['exercises']>([]);
  const [existingExercises, setExistingExercises] = useState<MergedData['exercises']>([]);

  // Validation states
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [exercisesNeedingValidation, setExercisesNeedingValidation] = useState<number[]>([]);

  // Exercise selection state
  const [exerciseSelectionOpen, setExerciseSelectionOpen] = useState(false);
  const [selectedExerciseForReplacement, setSelectedExerciseForReplacement] = useState<{
    exerciseIndex: number;
    currentName: string;
  } | null>(null);

  const { data: assignments } = usePrescriptionAssignments(studentId);
  const createSession = useCreateWorkoutSession();
  
  const isReopening = !!existingSessionId;

  // Carregar dados da sessão existente quando reabrindo
  const { data: existingSessionData } = useQuery({
    queryKey: ['existing-session', existingSessionId],
    queryFn: async () => {
      if (!existingSessionId) return null;
      
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', existingSessionId)
        .single();
      
      if (sessionError) throw sessionError;
      
      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('*')
        .eq('session_id', existingSessionId);
      
      if (exercisesError) throw exercisesError;
      
      const { data: segments, error: segmentsError } = await supabase
        .from('session_audio_segments')
        .select('*')
        .eq('session_id', existingSessionId)
        .order('segment_order');
      
      if (segmentsError) throw segmentsError;
      
      return { session, exercises, segments };
    },
    enabled: !!existingSessionId,
  });
  
  // Preencher form com dados da sessão existente
  useEffect(() => {
    if (existingSessionData) {
      const { session, exercises } = existingSessionData;
      setDate(session.date);
      setTime(session.time);
      setTrainerName(session.trainer_name || '');
      setSelectedPrescriptionId(session.prescription_id || null);
      
      // Converter exercícios existentes para formato editável
      if (exercises && exercises.length > 0) {
        const convertedExercises = exercises.map(ex => ({
          executed_exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps || 0,
          load_kg: ex.load_kg,
          load_breakdown: ex.load_breakdown || '',
          observations: ex.observations,
          is_best_set: ex.is_best_set || false,
        }));
        
        console.log('✅ Carregando exercícios existentes:', convertedExercises.length);
        setExistingExercises(convertedExercises);
        setMergedData({
          clinical_observations: [],
          exercises: convertedExercises
        });
        setEditableExercises(convertedExercises);
      }
    }
  }, [existingSessionData]);

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
    console.log('🔍 [Individual] mergeAllRecordings chamado com', recordings.length, 'recordings');
    
    const allObservations: Array<{
      observation_text: string;
      category: 'dor' | 'mobilidade' | 'força' | 'técnica' | 'geral';
      severity: 'baixa' | 'média' | 'alta';
    }> = [];
    const allExercises: Array<any> = [];

    recordings.forEach((recording, recIdx) => {
      console.log(`🔍 [Individual] Processando recording ${recIdx + 1}/${recordings.length}`);
      const session = recording.data.sessions[0];
      if (!session) {
        console.warn(`⚠️ [Individual] Recording ${recIdx + 1} não tem sessão`);
        return;
      }

      console.log(`🔍 [Individual] Recording ${recIdx + 1} - Aluno: ${session.student_name}`);
      console.log(`   - Observações: ${session.clinical_observations?.length || 0}`);
      console.log(`   - Exercícios: ${session.exercises?.length || 0}`);

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

      if (session.exercises && session.exercises.length > 0) {
        console.log(`🔍 [Individual] Adicionando ${session.exercises.length} exercícios do recording ${recIdx + 1}`);
        allExercises.push(...session.exercises);
      }
    });

    console.log(`✅ [Individual] Merge completo: ${allObservations.length} observações, ${allExercises.length} exercícios`);

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
      setTrainerName('');
      setAccumulatedRecordings([]);
      setCurrentRecordingNumber(1);
      setMergedData(null);
      setExistingExercises([]);
      setEditableObservations([]);
      setEditableExercises([]);
    }
  }, [open]);

  const handleSessionData = (data: SessionData) => {
    console.log('🔍 [Individual] ========== handleSessionData CHAMADO ==========');
    console.log(`🔍 [Individual] Recording número: ${currentRecordingNumber}`);
    console.log('🔍 [Individual] Data recebida:', JSON.stringify(data, null, 2));
    console.log(`🔍 [Individual] Recordings acumulados antes: ${accumulatedRecordings.length}`);
    console.log(`🔍 [Individual] Exercícios existentes: ${existingExercises.length}`);
    
    const newRecording: AccumulatedRecording = {
      recordingNumber: currentRecordingNumber,
      timestamp: new Date().toISOString(),
      data
    };
    
    const updatedRecordings = [...accumulatedRecordings, newRecording];
    setAccumulatedRecordings(updatedRecordings);
    console.log(`🔍 [Individual] Recordings acumulados depois: ${updatedRecordings.length}`);
    
    const merged = mergeAllRecordings(updatedRecordings);
    console.log(`🔍 [Individual] Merge retornou: ${merged.exercises.length} exercícios`);
    
    // ✅ CONSOLIDAR: Exercícios existentes + novos (sem duplicatas)
    const consolidatedExercises = [...existingExercises];
    console.log(`🔍 [Individual] Iniciando consolidação: ${consolidatedExercises.length} já existentes`);
    
    let addedCount = 0;
    merged.exercises.forEach((newEx, idx) => {
      const isDuplicate = consolidatedExercises.some(
        ex => ex.executed_exercise_name === newEx.executed_exercise_name &&
              ex.reps === newEx.reps &&
              ex.load_kg === newEx.load_kg
      );
      if (!isDuplicate) {
        consolidatedExercises.push(newEx);
        addedCount++;
        console.log(`✅ [Individual] Exercício ${idx + 1} adicionado: ${newEx.executed_exercise_name}`);
      } else {
        console.log(`⚠️ [Individual] Exercício ${idx + 1} duplicado, ignorado: ${newEx.executed_exercise_name}`);
      }
    });
    
    console.log(`✅ [Individual] Consolidação final: ${existingExercises.length} existentes + ${addedCount} novos = ${consolidatedExercises.length} total`);
    
    setMergedData({
      ...merged,
      exercises: consolidatedExercises
    });
    setEditableObservations(merged.clinical_observations);
    setEditableExercises(consolidatedExercises);
    
    console.log('🔍 [Individual] ========== handleSessionData CONCLUÍDO ==========');
    setDialogState('preview');
  };

  const handleError = (error: string) => {
    console.error("❌ handleError chamado:", error);
    notify.error(i18n.modules.workouts.recordingError, {
      description: error,
    });
    // Não voltar para 'setup' imediatamente - permitir retry
    setDialogState('recording');
  };

  const handleSave = async () => {
    if (!mergedData) return;

    // ✅ Validar ANTES de salvar
    if (!validateExercisesBeforeSave()) {
      return;
    }

    try {
      let sessionId: string;
      
      if (isReopening && existingSessionId) {
        // Reabrindo sessão existente - deletar exercícios antigos primeiro
        const { error: deleteError } = await supabase
          .from('exercises')
          .delete()
          .eq('session_id', existingSessionId);

        if (deleteError) {
          console.error('Error deleting old exercises:', deleteError);
          throw deleteError;
        }
        
        const { error: updateError } = await supabase
          .from('workout_sessions')
          .update({
            trainer_name: trainerName,
            is_finalized: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSessionId);

        if (updateError) throw updateError;
        sessionId = existingSessionId;
        
        console.log(`✅ Sessão ${existingSessionId} atualizada - exercícios antigos deletados`);
        
        notify.info("Atualizando sessão existente", {
          description: "Substituindo exercícios com dados consolidados",
        });
      } else {
        // Criando nova sessão
        const workoutSession = {
          student_id: studentId,
          prescription_id: selectedPrescriptionId,
          date,
          time,
          trainer_name: trainerName,
          is_finalized: true,
        };

        const { data: session, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert(workoutSession)
          .select()
          .single();

        if (sessionError) throw sessionError;
        sessionId = session.id;
      }

      // ✅ USAR OS DADOS EDITADOS MAIS RECENTES
      const exercises = editableExercises.map(ex => ({
        session_id: sessionId,
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

      // ✅ SALVAR SEGMENTOS DE ÁUDIO (se houver gravações)
      if (accumulatedRecordings.length > 0) {
        const audioSegments = accumulatedRecordings
          .filter((recording: any) => recording.rawTranscription)
          .map((recording: any) => ({
            session_id: sessionId,
            segment_order: recording.recordingNumber,
            raw_transcription: recording.rawTranscription || 'Sem transcrição disponível',
            edited_transcription: recording.editedTranscription || null,
          }));

        if (audioSegments.length > 0) {
          const { error: segmentsError } = await supabase
            .from('session_audio_segments')
            .insert(audioSegments);

          if (segmentsError) {
            console.error('Error saving audio segments:', segmentsError);
            // Não falhar a sessão por causa disso, apenas avisar
            notify.warning("Aviso", {
              description: "Segmentos de áudio não foram salvos, mas a sessão foi criada com sucesso",
            });
          } else {
            console.log(`✅ ${audioSegments.length} segmento(s) de áudio salvos com sucesso`);
          }
        }
      }

      // ✅ CORRIGIR: categories deve ser array, não string
      if (editableObservations && editableObservations.length > 0) {
        const observations = editableObservations.map(obs => ({
          student_id: studentId,
          session_id: sessionId,
          observation_text: obs.observation_text,
          categories: obs.category ? [obs.category] : null,
          severity: obs.severity,
        }));

        const { error: observationsError } = await supabase
          .from('student_observations')
          .insert(observations);

        if (observationsError) throw observationsError;
      }

      notify.success(
        isReopening ? "Sessão atualizada com sucesso" : i18n.modules.workouts.sessionCreated,
        {
          description: isReopening 
            ? "Novos dados adicionados à sessão"
            : `${accumulatedRecordings.length} ${i18n.modules.workouts.recording}`,
        }
      );

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving session:', error);
      notify.error(i18n.feedback.genericError, {
        description: error.message,
      });
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent forceMount className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            {dialogState === 'setup' && (isReopening ? `Continuar Sessão - ${studentName}` : `Registrar Sessão Individual (Voz) - ${studentName}`)}
            {dialogState === 'recording' && `🎤 Gravação ${currentRecordingNumber} - ${studentName}`}
            {dialogState === 'preview' && (isReopening ? `Atualizando Sessão - ${studentName}` : `Preview da Sessão - ${studentName}`)}
          </DialogTitle>
        </DialogHeader>

        {dialogState === 'setup' && (
          <div className="space-y-4">
            <SessionContextForm
              trainerName={trainerName}
              date={date}
              time={time}
              onTrainerNameChange={setTrainerName}
              onDateChange={setDate}
              onTimeChange={setTime}
            />

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
          <MultiSegmentRecorder
            prescriptionId={selectedPrescriptionId || undefined}
            selectedStudents={[{ id: studentId, name: studentName, weight_kg: undefined }]}
            date={date}
            time={time}
            onComplete={(segments) => {
              console.log('📦 Segmentos recebidos do MultiSegmentRecorder:', segments);
              
              // Consolidar dados de todos os segmentos
              const allObservations: any[] = [];
              const allExercises: any[] = [];
              
              segments.forEach(segment => {
                if (segment.extractedData?.sessions) {
                  segment.extractedData.sessions.forEach(session => {
                    if (session.clinical_observations) {
                      allObservations.push(...session.clinical_observations);
                    }
                    if (session.exercises) {
                      allExercises.push(...session.exercises);
                    }
                  });
                }
              });
              
              console.log('✅ Dados consolidados:', { allObservations, allExercises });
              
              // Armazenar segmentos para salvar na tabela session_audio_segments
              const recordingsData = segments.map((seg) => ({
                recordingNumber: seg.segmentOrder,
                timestamp: new Date().toISOString(),
                rawTranscription: seg.rawTranscription,
                editedTranscription: seg.editedTranscription,
                data: {
                  sessions: [{
                    student_name: studentName,
                    clinical_observations: [],
                    exercises: []
                  }]
                }
              }));
              
              setAccumulatedRecordings(recordingsData as any);
              
              // Processar consolidação com dados REAIS
              handleSessionData({
                sessions: [{
                  student_name: studentName,
                  clinical_observations: allObservations,
                  exercises: allExercises
                }]
              });
            }}
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
                    <div className="flex items-center gap-2">
                      <Input
                        value={ex.executed_exercise_name}
                        onChange={(e) => {
                          const updated = [...editableExercises];
                          updated[idx].executed_exercise_name = e.target.value;
                          setEditableExercises(updated);
                        }}
                        placeholder="Nome do exercício..."
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
                        Substituir
                      </Button>
                    </div>
                    
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
              <Button 
                onClick={() => {
                  // ✅ Validar antes de salvar
                  if (!validateExercisesBeforeSave()) {
                    return;
                  }
                  handleSave();
                }}
              >
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
                  // Restaurar dados originais de mergedData
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
                    return;
                  }
                  
                  // ✅ CRÍTICO: Atualizar mergedData E os estados editáveis simultaneamente
                  setMergedData({
                    clinical_observations: editableObservations,
                    exercises: editableExercises
                  });
                  
                  setDialogState('preview');
                  notify.success("Edições aplicadas", {
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
                      notify.error("Corrija os campos obrigatórios", {
                        description: "Complete todos os dados antes de salvar",
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
