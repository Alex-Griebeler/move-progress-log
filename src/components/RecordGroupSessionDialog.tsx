import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ExerciseFirstSessionEntry } from "./ExerciseFirstSessionEntry";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MultiSegmentRecorder } from "./MultiSegmentRecorder";
import { ManualSessionEntry } from "./ManualSessionEntry";
import { SessionSetupForm } from "./SessionSetupForm";
import { useStudents } from "@/hooks/useStudents";
import { usePrescriptionAssignments, usePrescriptions } from "@/hooks/usePrescriptions";
import { useCreateGroupWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { usePrescriptionDetails } from "@/hooks/usePrescriptions";
import type { AssignmentScheduleAdaptations } from "@/hooks/usePrescriptions";
import { supabase } from "@/integrations/supabase/client";
import { Mic, User, Users, Save, Edit, Pencil, ChevronLeft, ChevronRight, Plus, BookOpen, UserPlus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { ExerciseSelectionDialog } from "./ExerciseSelectionDialog";
import { NAV_LABELS } from "@/constants/navigation";
import { useSessionDraft } from "@/hooks/useSessionDraft";
import { AddStudentDialog } from "./AddStudentDialog";
import { calculateLoadFromBreakdown } from "@/utils/loadCalculation";
import { logger } from "@/utils/logger";
import { buildErrorDescription } from "@/utils/errorParsing";
import { formatSessionTime, getCurrentSessionTimeHHmm } from "@/utils/sessionTime";
import { formatKg } from "@/utils/displayFormat";
import {
  normalizeExerciseLibraryMatchName,
  type ExerciseLibraryMatch,
} from "@/utils/exerciseLibraryMatching";
import { format } from "date-fns";

// Shared types, utilities & components
import {
  MAX_RECORDINGS,
  areSimilarObservations,
  getSeverityVariant,
  getCategoryIcon,
  type GroupObservation,
  type SessionExercise,
  type AccumulatedRecording,
} from "@/types/sessionRecording";
import { useExerciseReplacement } from "@/hooks/useExerciseReplacement";
import { ExerciseEditor } from "@/components/session/ExerciseEditor";
import { ObservationEditor } from "@/components/session/ObservationEditor";
import { ExercisePreviewCard } from "@/components/session/ExercisePreviewCard";
import { ObservationPreview } from "@/components/session/ObservationPreview";
import { ValidationAlerts } from "@/components/session/ValidationAlerts";
import { PrescriptionSidebar } from "@/components/session/PrescriptionSidebar";
import { DiscardSessionConfirm } from "@/components/session/DiscardSessionConfirm";
import { STICKY_FOOTER_CLASS } from "@/components/session/dialogLayout";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateSessionQueries } from "@/hooks/sessionQueryInvalidation";
import { describePartialGroupSave, type GroupSaveOutcome } from "@/components/session/groupSaveOutcome";
import {
  forgetLocallySaved,
  hasRecentGroupSession,
  readLocallySaved,
  rememberLocallySaved,
  type SessionsClient,
} from "@/components/session/groupSessionIdempotency";

// ─── Local Types ────────────────────────────────────────

interface PrescriptionExerciseDetail {
  id: string;
  exercise_library_id?: string | null;
  exercise_name?: string;
  sets: string;
  reps: string;
  rir?: string | null;
  interval_seconds: number | null;
  pse: string | null;
  training_method: string | null;
  observations: string | null;
  should_track?: boolean;
  category?: string | null;
  exercises_library?: { name: string; category: string | null } | null;
}

interface PrescriptionDetailsData {
  id: string;
  name: string;
  objective: string;
  exercises: PrescriptionExerciseDetail[];
}

interface ManualSavePayload {
  studentExercises: Array<{
    studentId: string;
      exercises: Array<{
        exercise_library_id?: string | null;
        exercise_name: string;
      sets: number;
      reps: number;
      reserve_reps?: string | null;
      load_kg: number | null;
      load_breakdown: string;
      observations: string;
    }>;
  }>;
}

interface SessionQueryRow {
  id: string;
  student_id: string;
  students: { id: string; name: string; weight_kg: number | null };
}

interface ExerciseRow {
  id: string;
  exercise_library_id: string | null;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  reserve_reps: string | null;
  load_kg: number | null;
  load_breakdown: string | null;
  observations: string | null;
  is_best_set: boolean | null;
}

interface GroupSessionToSave {
  student_id: string;
  student_name: string;
  exercises: SessionExercise[];
  clinical_observations: GroupObservation[];
}

const normalizeComparableText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isAssignmentScheduleAdaptations = (
  value: unknown
): value is AssignmentScheduleAdaptations => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const maybe = value as AssignmentScheduleAdaptations;

  const hasWeekdays =
    Array.isArray(maybe.weekdays) &&
    maybe.weekdays.every((day) => typeof day === "string");

  const hasTime = typeof maybe.time === "string" && maybe.time.length > 0;

  return hasWeekdays || hasTime;
};

/** Marcador estável do aviso "prescrito mas não citado" (liga o botão de incluir). */
const UNMENTIONED_MARKER = 'prescrito, mas não citado no áudio';

/** Erro de lote parcial já comunicado na tela; o chamador só preserva o rascunho. */
class PartialGroupSaveError extends Error {
  constructor() {
    super('Salvamento parcial');
    this.name = 'PartialGroupSaveError';
  }
}

// ─── Component Types ────────────────────────────────────────

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
    clinical_observations?: Array<GroupObservation>;
    exercises: Array<SessionExercise>;
  }>;
}

interface MergedStudent {
  student_name: string;
  recording_numbers: number[];
  clinical_observations: GroupObservation[];
  exercises: SessionExercise[];
}

// Toggle sub-component for manual entry mode
function ManualEntryWithToggle({
  prescriptionDetails,
  selectedStudents,
  date, time, trainer,
  prescriptionId,
  onSave,
  onCancel,
  onAddStudent,
}: {
  prescriptionDetails: PrescriptionDetailsData | null | undefined;
  selectedStudents: Array<{ id: string; name: string; weight_kg?: number; has_active_prescription: boolean }>;
  date: string; time: string; trainer: string;
  prescriptionId: string | null;
  onSave: (data: ManualSavePayload) => Promise<void>;
  onCancel: () => void;
  onAddStudent: () => void;
}) {
  const [entryMode, setEntryMode] = useState<'by-exercise' | 'by-student'>('by-exercise');
  const entryModes = [
    { key: 'by-exercise' as const, label: 'Por exercício' },
    { key: 'by-student' as const, label: 'Por pessoa' },
  ];

  const exercises = prescriptionDetails?.exercises?.filter((ex) => ex.should_track !== false).map((ex) => ({
    id: ex.id, exercise_name: ex.exercise_name, sets: ex.sets, reps: ex.reps,
    exercise_library_id: ex.exercise_library_id ?? null,
    rir: ex.rir ?? null,
    interval_seconds: ex.interval_seconds, pse: ex.pse, training_method: ex.training_method, observations: ex.observations,
    category: ex.category || null,
  })) || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="Forma de preenchimento">
        {entryModes.map((mode) => (
          <Button
            key={mode.key}
            type="button"
            variant={entryMode === mode.key ? 'default' : 'outline'}
            size="touch"
            aria-pressed={entryMode === mode.key}
            onClick={() => setEntryMode(mode.key)}
          >
            {mode.label}
          </Button>
        ))}
      </div>

      {entryMode === 'by-exercise' ? (
        <ExerciseFirstSessionEntry
          prescriptionExercises={exercises}
          selectedStudents={selectedStudents}
          date={date} time={time} trainer={trainer}
          prescriptionId={prescriptionId}
          onSave={onSave}
          onCancel={onCancel}
          onAddStudent={onAddStudent}
        />
      ) : (
        <ManualSessionEntry
          prescriptionExercises={exercises}
          selectedStudents={selectedStudents}
          date={date} time={time} trainer={trainer}
          prescriptionId={prescriptionId}
          onSave={onSave}
          onCancel={onCancel}
          onAddStudent={onAddStudent}
        />
      )}
    </div>
  );
}

export function RecordGroupSessionDialog({
  open,
  onOpenChange,
  prescriptionId,
  reopenDate,
  reopenTime,
}: RecordGroupSessionDialogProps) {
  const normalizedReopenTime = reopenTime ? formatSessionTime(reopenTime) : undefined;
  const isReopening = !!(reopenDate && normalizedReopenTime);
  const { hasUnsavedChanges, clearDraft } = useSessionDraft();
  const [dialogState, setDialogState] = useState<DialogState>(isReopening ? 'mode-selection' : 'context-setup');
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(reopenDate || format(new Date(), "yyyy-MM-dd"));
  const [isSaving, setIsSaving] = useState(false);
  const [time, setTime] = useState(normalizedReopenTime || getCurrentSessionTimeHHmm());
  const [accumulatedRecordings, setAccumulatedRecordings] = useState<AccumulatedRecording<SessionData>[]>([]);
  const [currentRecordingNumber, setCurrentRecordingNumber] = useState(1);
  const [mergedStudents, setMergedStudents] = useState<MergedStudent[]>([]);
  const [validationIssues, setValidationIssues] = useState<{ errors: string[]; warnings: string[] }>({ errors: [], warnings: [] });
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  
  // Edit states
  const [editingStudentIndex, setEditingStudentIndex] = useState<number>(0);
  const [editableObservations, setEditableObservations] = useState<GroupObservation[]>([]);
  const [editableExercises, setEditableExercises] = useState<SessionExercise[]>([]);
  const [trainer, setTrainer] = useState<string>('');
  const [showValidation, setShowValidation] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  // Salvamento manual em lote NÃO é atômico entre alunas. Guardamos quem já
  // foi salvo nesta abertura para o "tentar de novo" enviar só as que faltam
  // (sem duplicar) e para dizer isso na tela.
  const [manualSavedStudentIds, setManualSavedStudentIds] = useState<string[]>([]);
  // Registro incompleto de outra hora (mesma prescrição e data) — só informa;
  // o horário nunca é trocado sozinho (revisão da #369).
  const [pendingLocalRecord, setPendingLocalRecord] = useState<{ time: string; names: string[] } | null>(null);
  const [lastPartialSave, setLastPartialSave] = useState<GroupSaveOutcome | null>(null);
  // Guarda de saída: trechos de voz já transcritos e confirmação pendente.
  const [voiceSegmentCount, setVoiceSegmentCount] = useState(0);
  const [discardAction, setDiscardAction] = useState<null | 'close' | 'back'>(null);

  // When prop is provided (e.g. opened from /prescricoes), use it.
  // Otherwise, the user must pick a prescription explicitly in the context-setup step.
  const effectivePrescriptionId = prescriptionId ?? selectedPrescriptionId;

  // Ao entrar no registro manual, lê se há aula incompleta desta prescrição e
  // data em outro horário (registro local da aba) para avisar — sem trocar o
  // horário sozinho.
  useEffect(() => {
    if (!open || dialogState !== 'manual-entry' || isReopening) {
      setPendingLocalRecord(null);
      return;
    }
    const rec = readLocallySaved(effectivePrescriptionId ?? null, date);
    if (!rec || rec.ids.length === 0) {
      setPendingLocalRecord(null);
      return;
    }
    const names = rec.ids
      .map((id) => selectedStudents.find((st) => st.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    setPendingLocalRecord({ time: rec.time, names });
  }, [open, dialogState, isReopening, effectivePrescriptionId, date, selectedStudents]);
  const requiresPrescriptionSelection = !prescriptionId;

  // Shared hook for exercise replacement
  const {
    exerciseSelectionOpen,
    setExerciseSelectionOpen,
    selectedExerciseForReplacement,
    openExerciseSelection,
    handleExerciseSelected,
  } = useExerciseReplacement(editableExercises, setEditableExercises);

  const { data: students } = useStudents();
  const { data: prescriptionsList } = usePrescriptions();
  const { data: assignments } = usePrescriptionAssignments(effectivePrescriptionId);
  const { data: prescriptionDetails } = usePrescriptionDetails(effectivePrescriptionId);
  const createGroupSessions = useCreateGroupWorkoutSessions();
  const queryClient = useQueryClient();
  
  useEffect(() => { logger.debug("Dialog State mudou para:", dialogState); }, [dialogState]);
  useEffect(() => { logger.debug("Merged Students atualizado:", mergedStudents.length, "alunos"); }, [mergedStudents]);

  const groupPrescriptionOptions = useMemo(
    () => (prescriptionsList || []).filter((prescription) => prescription.prescription_type === 'group'),
    [prescriptionsList]
  );

  const assignedStudentIds = useMemo(
    () => new Set((assignments || []).map((assignment) => assignment.student_id)),
    [assignments]
  );

  const enrichedStudents = useMemo(() => {
    const mappedStudents = students?.map((student) => ({
      ...student,
      has_active_prescription: assignedStudentIds.has(student.id),
    })) || [];

    const visibleStudents = requiresPrescriptionSelection
      ? mappedStudents.filter((student) => assignedStudentIds.has(student.id))
      : mappedStudents;

    return visibleStudents.sort((a, b) => {
      if (a.has_active_prescription && !b.has_active_prescription) return -1;
      if (!a.has_active_prescription && b.has_active_prescription) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [students, assignedStudentIds, requiresPrescriptionSelection]);

  const handlePrescriptionChange = (value: string) => {
    setSelectedPrescriptionId(value);
    setSelectedStudents([]);
    setHasAutoSelected(false);
    setShowValidation(false);
  };

  const handleModeSelection = (mode: 'voice' | 'manual') => {
    if (!effectivePrescriptionId) { notify.error("Selecione uma prescrição antes de continuar"); return; }
    if (!trainer.trim()) { notify.error("Por favor, selecione o treinador antes de continuar"); return; }
    if (!date || !time) { notify.error("Por favor, preencha data e horário antes de continuar"); return; }
    if (selectedStudents.length === 0) { notify.error("Por favor, selecione pelo menos um aluno antes de continuar"); return; }
    setDialogState(mode === 'voice' ? 'recording' : 'manual-entry');
  };

  const loadExistingSessionsData = useCallback(async () => {
    if (!effectivePrescriptionId || !reopenDate || !normalizedReopenTime) return;
    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, student_id, students!inner(id, name, weight_kg)')
        .eq('prescription_id', effectivePrescriptionId)
        .eq('date', reopenDate)
        .eq('time', normalizedReopenTime);
      if (sessionsError) throw sessionsError;
      if (sessions && sessions.length > 0) {
        const typedSessions = (sessions ?? []) as SessionQueryRow[];
        const existingStudents = typedSessions.map((s) => ({
          id: s.student_id, name: s.students.name, weight_kg: s.students.weight_kg ?? undefined, has_active_prescription: true,
        }));
        setSelectedStudents(existingStudents);
        const allExercises = await Promise.all(
          typedSessions.map(async (session) => {
            const { data: exercises, error: exercisesError } = await supabase
              .from('exercises')
              .select('id, session_id, exercise_library_id, exercise_name, sets, reps, reserve_reps, load_kg, load_breakdown, observations, is_best_set')
              .eq('session_id', session.id);
            if (exercisesError) {
              throw exercisesError;
            }
            return { student_name: session.students.name, exercises: (exercises || []) as ExerciseRow[] };
          })
        );
        const merged: MergedStudent[] = allExercises.map((data) => ({
          student_name: data.student_name, recording_numbers: [0], clinical_observations: [],
          exercises: data.exercises.map((ex) => ({
            prescribed_exercise_name: null, executed_exercise_name: ex.exercise_name,
            sets: ex.sets, reps: ex.reps, reserve_reps: ex.reserve_reps || null, load_kg: ex.load_kg, load_breakdown: ex.load_breakdown || '',
            observations: ex.observations, is_best_set: ex.is_best_set || false,
          })),
        }));
        setMergedStudents(merged);
        notify.info("Sessão carregada", { description: `${typedSessions.length} aluno(s) carregado(s). Você pode adicionar mais gravações.` });
      }
    } catch (error) {
      logger.error("Erro ao carregar sessões existentes:", error);
      notify.error("Falha ao reabrir sessão", {
        description: "Não foi possível carregar os dados existentes da sessão. Você pode continuar manualmente.",
      });
    }
  }, [effectivePrescriptionId, reopenDate, normalizedReopenTime]);

  // Load existing sessions when reopening
  useEffect(() => {
    if (isReopening && effectivePrescriptionId && reopenDate && normalizedReopenTime && open) {
      loadExistingSessionsData();
    }
  }, [isReopening, effectivePrescriptionId, reopenDate, normalizedReopenTime, open, loadExistingSessionsData]);

  const toggleStudent = (student: Student) => {
    setSelectedStudents((prev) => {
      const isSelected = prev.find(s => s.id === student.id);
      if (isSelected) return prev.filter((s) => s.id !== student.id);
      if (prev.length >= 10) {
        notify.warning("Limite atingido", { description: "É possível selecionar no máximo 10 alunos por sessão" });
        return prev;
      }
      return [...prev, student];
    });
  };

  const handleStudentCreated = (newStudent: { id: string; name: string; weight_kg?: number }) => {
    toggleStudent({ ...newStudent, has_active_prescription: false });
  };

  const handleAddStudentToGroup = () => {
    if (requiresPrescriptionSelection) {
      notify.info("Aluno precisa estar atribuído", {
        description: "Para registrar por /sessoes, atribua o aluno à prescrição antes de incluí-lo na sessão em grupo.",
      });
      return;
    }
    setShowAddStudentDialog(true);
  };

  const isContextValid = !!effectivePrescriptionId && date && time && trainer && selectedStudents.length > 0;

  // ─── Merge & Validation Logic ────────────────────────────────────────

  const mergeAllRecordings = (recordings: AccumulatedRecording<SessionData>[], existingData?: MergedStudent[]): MergedStudent[] => {
    logger.debug('[Group] mergeAllRecordings chamado', { recordings: recordings.length, existing: existingData?.length || 0 });
    const studentMap = new Map<string, MergedStudent>();

    if (existingData) {
      existingData.forEach((existing) => {
        studentMap.set(existing.student_name.toLowerCase(), { ...existing, recording_numbers: [0] });
      });
    }

    recordings.forEach((recording) => {
      recording.data.sessions.forEach((session) => {
        const key = session.student_name.toLowerCase();
        if (!studentMap.has(key)) {
          studentMap.set(key, { student_name: session.student_name, recording_numbers: [], clinical_observations: [], exercises: [] });
        }
        const merged = studentMap.get(key)!;
        if (!merged.recording_numbers.includes(recording.recordingNumber)) merged.recording_numbers.push(recording.recordingNumber);
        
        if (session.clinical_observations) {
          session.clinical_observations.forEach(newObs => {
            if (!merged.clinical_observations.some(e => areSimilarObservations(e.observation_text, newObs.observation_text))) {
              merged.clinical_observations.push(newObs);
            }
          });
        }
        
        session.exercises.forEach((newEx) => {
          // Preserve exercises with null reps (needs_manual_input) for manual correction
          if (!merged.exercises.some(ex => ex.executed_exercise_name === newEx.executed_exercise_name && ex.reps === newEx.reps && ex.load_kg === newEx.load_kg)) {
            merged.exercises.push(newEx);
          }
        });
      });
    });

    const result = Array.from(studentMap.values()).sort((a, b) => a.student_name.localeCompare(b.student_name));
    logger.debug('[Group] Merge completo:', result.map(s => `${s.student_name}: ${s.exercises.length} exercícios`));
    return result;
  };

  const validateMergedData = (merged: MergedStudent[]) => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const prescribedExercises = prescriptionDetails?.exercises?.filter((ex: PrescriptionExerciseDetail) => ex.should_track !== false) || [];
    
    merged.forEach(student => {
      const matchingStudent = selectedStudents.find(s => s.name.toLowerCase() === student.student_name.toLowerCase());
      const studentWeight = matchingStudent?.weight_kg;
      
      if (student.exercises.length === 0) errors.push(`${student.student_name}: citado no áudio, mas sem exercícios registrados`);
      
      if (prescribedExercises.length > 0) {
        prescribedExercises.forEach((prescribed: PrescriptionExerciseDetail) => {
          const prescribedName = (prescribed.exercise_name || prescribed.exercises_library?.name || '').toLowerCase().trim();
          if (!prescribedName) return;
          const wasExecuted = student.exercises.some(ex => {
            const executedName = ex.executed_exercise_name.toLowerCase().trim();
            return executedName.includes(prescribedName) || prescribedName.includes(executedName) || executedName === prescribedName;
          });
          if (!wasExecuted) warnings.push(`${student.student_name}: "${prescribed.exercise_name || prescribed.exercises_library?.name}" ${UNMENTIONED_MARKER}`);
        });
      }
      
      student.exercises.forEach((ex, idx) => {
        const exName = ex.executed_exercise_name || `Exercício ${idx + 1}`;
        if (!ex.reps || ex.reps <= 0) errors.push(`${student.student_name} · ${exName}: faltam repetições`);
        if (!ex.load_breakdown || ex.load_breakdown.trim() === '') warnings.push(`${student.student_name} · ${exName}: sem descrição da carga`);
        if (ex.load_kg === null || ex.load_kg === 0) warnings.push(`${student.student_name} · ${exName}: sem carga calculada`);
        const isPesoCorporal = ex.load_breakdown?.toLowerCase().includes('peso corporal');
        if (isPesoCorporal && ex.load_kg === null && studentWeight) errors.push(`${student.student_name} · ${exName}: peso corporal não calculado (peso cadastrado: ${formatKg(studentWeight)})`);
      });

      student.clinical_observations.forEach((obs, idx) => {
        if (!obs.severity) errors.push(`${student.student_name}: observação clínica ${idx+1} sem severidade`);
        if (!obs.observation_text || obs.observation_text.trim() === '') errors.push(`${student.student_name}: observação clínica ${idx+1} sem texto`);
      });

      if (student.recording_numbers.length === 1 && accumulatedRecordings.length > 1) {
        warnings.push(`${student.student_name} só aparece na gravação ${student.recording_numbers[0]}`);
      }
    });

    selectedStudents.forEach(student => {
      if (!merged.find(m => m.student_name.toLowerCase() === student.name.toLowerCase())) {
        warnings.push(`${student.name}: não citado em nenhuma gravação`);
      }
    });
    
    return { errors, warnings };
  };

  // ─── Auto-Add Students ────────────────────────────────────────

  const handleAutoAddStudents = async (data: SessionData) => {
    try {
      const newStudents: Student[] = [];
      for (let i = 0; i < data.sessions.length; i++) {
        const session = data.sessions[i];
        const normalizedSessionName = normalizeComparableText(session.student_name);
        const existingStudent = selectedStudents.find(
          (student) => normalizeComparableText(student.name) === normalizedSessionName
        );
        const queuedStudent = newStudents.find(
          (student) => normalizeComparableText(student.name) === normalizedSessionName
        );
        if (!existingStudent && !queuedStudent) {
          const { data: candidateStudents, error } = await supabase
            .from('students')
            .select('id, name, weight_kg')
            .ilike('name', session.student_name)
            .order('created_at', { ascending: false })
            .limit(20);
          if (error) {
            logger.warn(`Falha ao buscar aluno "${session.student_name}":`, error);
            continue;
          }

          const targetName = normalizedSessionName;
          const studentData =
            candidateStudents?.find((candidate) => normalizeComparableText(candidate.name) === targetName) ||
            candidateStudents?.[0];

          if (!studentData) {
            logger.warn(`Aluno "${session.student_name}" não encontrado`);
            continue;
          }

          if (studentData) {
            newStudents.push({ id: studentData.id, name: studentData.name, weight_kg: studentData.weight_kg ?? undefined, has_active_prescription: false });
            data.sessions[i].auto_added = true;
          }
        }
      }
      if (newStudents.length > 0) {
        setSelectedStudents(prev => [...prev, ...newStudents]);
        notify.success(i18n.modules.workouts.studentsAutoAdded, { description: `${newStudents.map(s => s.name).join(", ")} ${i18n.modules.workouts.studentsWereAdded}` });
      }
    } catch (error) {
      logger.error("Erro em handleAutoAddStudents:", error);
      notify.warning("Autoassociação indisponível", {
        description: "Não foi possível sugerir alunos automaticamente neste áudio. Continue com seleção manual.",
      });
    }
  };

  // ─── Session Data Handlers ────────────────────────────────────────

  const handleSessionData = async (data: SessionData) => {
    logger.debug("Dados recebidos da gravação", currentRecordingNumber);
    try {
      await handleAutoAddStudents(data);
      const newRecording: AccumulatedRecording<SessionData> = { recordingNumber: currentRecordingNumber, timestamp: new Date().toISOString(), data };
      const updatedRecordings = [...accumulatedRecordings, newRecording];
      setAccumulatedRecordings(updatedRecordings);
      const existingData = isReopening && mergedStudents.length > 0 ? mergedStudents : undefined;
      const merged = mergeAllRecordings(updatedRecordings, existingData);
      setMergedStudents(merged);
      setValidationIssues(validateMergedData(merged));
      setTimeout(() => { setDialogState('preview'); }, 100);
    } catch (error) {
      logger.error("Erro em handleSessionData:", error);
      handleError(error);
    }
  };

  const handleError = (error: unknown) => {
    logger.error("handleError chamado:", error);
    notify.error(i18n.modules.workouts.recordingError, {
      description: buildErrorDescription(error, "Erro ao processar dados"),
    });
    setDialogState('recording');
  };

  const handleAddAnotherRecording = () => {
    if (accumulatedRecordings.length >= MAX_RECORDINGS) {
      notify.warning(i18n.modules.workouts.limitReached, { description: i18n.modules.workouts.maxRecordings.replace('{{max}}', MAX_RECORDINGS.toString()) });
      return;
    }
    setCurrentRecordingNumber(prev => prev + 1);
    setDialogState('recording');
  };

  const handleBack = () => {
    setDialogState('mode-selection');
    setAccumulatedRecordings([]);
    setCurrentRecordingNumber(1);
    setVoiceSegmentCount(0);
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
    const updatedMerged = [...mergedStudents];
    updatedMerged[editingStudentIndex] = { ...updatedMerged[editingStudentIndex], clinical_observations: editableObservations, exercises: editableExercises };
    setMergedStudents(updatedMerged);
    setValidationIssues(validateMergedData(updatedMerged));
    setDialogState('preview');
  };

  const handleNavigateStudent = (direction: 'prev' | 'next') => {
    const updatedMerged = [...mergedStudents];
    updatedMerged[editingStudentIndex] = { ...updatedMerged[editingStudentIndex], clinical_observations: editableObservations, exercises: editableExercises };
    setMergedStudents(updatedMerged);
    const newIndex = direction === 'next' ? Math.min(editingStudentIndex + 1, mergedStudents.length - 1) : Math.max(editingStudentIndex - 1, 0);
    setEditingStudentIndex(newIndex);
    setEditableObservations(updatedMerged[newIndex].clinical_observations || []);
    setEditableExercises(updatedMerged[newIndex].exercises || []);
  };

  // ─── Save Logic ────────────────────────────────────────

  const handleSave = async () => {
    if (mergedStudents.length === 0 || !effectivePrescriptionId) return;

    // Reabertura: captura os IDs antigos ANTES, mas só deleta DEPOIS do create
    // novo ter sucesso — a ordem antiga (delete→create) perdia o histórico se
    // qualquer criação falhasse no meio (achado CRÍTICO da auditoria R3).
    let staleSessions: Array<{ id: string; student_id: string }> = [];
    if (isReopening && reopenDate && normalizedReopenTime) {
      const { data: existingSessions, error: existingSessionsError } = await supabase
        .from('workout_sessions')
        .select('id, student_id')
        .eq('prescription_id', effectivePrescriptionId)
        .eq('date', reopenDate)
        .eq('time', normalizedReopenTime);
      if (existingSessionsError) {
        logger.error('Erro ao localizar sessões antigas:', existingSessionsError);
        notify.error("Erro ao consolidar dados", { description: "Não foi possível localizar as sessões existentes." });
        return;
      }
      staleSessions = existingSessions || [];
    }

    const sessionsToSave: GroupSessionToSave[] = mergedStudents.map(merged => {
      const student = selectedStudents.find(s => s.name.toLowerCase() === merged.student_name.toLowerCase());
      if (!student) { logger.error(`Student not found: ${merged.student_name}`); return null; }
      return { student_id: student.id, student_name: student.name, exercises: merged.exercises, clinical_observations: merged.clinical_observations || [] };
    }).filter((s): s is GroupSessionToSave => s !== null);

    const results = await createGroupSessions.mutateAsync({ prescriptionId: effectivePrescriptionId, date, time, sessions: sessionsToSave });
    // O hook já avisa quem salvou e quem falhou (toasts próprios). Aqui só
    // decidimos o que fazer com cada pessoa (revisão da #369).
    const succeededNames = new Set(results.filter(r => r.success).map(r => r.student.toLowerCase()));
    const failedNames = new Set(results.filter(r => !r.success).map(r => r.student.toLowerCase()));
    const succeededStudentIds = new Set(
      sessionsToSave.filter(s => succeededNames.has(s.student_name.toLowerCase())).map(s => s.student_id),
    );

    // Reabertura: remove as sessões antigas SÓ de quem gravou a nova — quem
    // falhou mantém o histórico (antes, uma falha parcial apagava as antigas
    // de todos). Se a limpeza falhar, sobra duplicata recuperável, nunca perda.
    const staleSessionIds = staleSessions.filter(s => succeededStudentIds.has(s.student_id)).map(s => s.id);
    if (staleSessionIds.length > 0) {
      const { error: deleteExercisesError } = await supabase
        .from('exercises')
        .delete()
        .in('session_id', staleSessionIds);
      const { error: deleteSessionsError } = deleteExercisesError
        ? { error: deleteExercisesError }
        : await supabase.from('workout_sessions').delete().in('id', staleSessionIds);
      if (deleteExercisesError || deleteSessionsError) {
        logger.error('Erro ao remover sessões antigas pós-consolidação:', deleteExercisesError || deleteSessionsError);
        notify.warning("Consolidação com pendência", {
          description: "As novas sessões foram salvas, mas as antigas não foram removidas — podem aparecer duplicadas. Remova-as manualmente.",
        });
      }
    }

    const sessionLookupStudentIds = selectedStudents.map((student) => student.id);
    const { data: savedSessions, error: savedSessionsError } = await supabase
      .from('workout_sessions')
      .select('id, student_id, created_at')
      .in('student_id', sessionLookupStudentIds)
      .eq('date', date)
      .eq('time', time)
      .order('created_at', { ascending: false });

    const latestSessionByStudent = new Map<string, { id: string }>();
    if (savedSessionsError) {
      logger.error('Error fetching saved sessions for post-processing:', savedSessionsError);
      notify.warning("Sessões salvas com pendências", {
        description: "Não foi possível vincular automaticamente observações e transcrições nesta gravação.",
      });
    } else {
      (savedSessions || []).forEach((row) => {
        if (!latestSessionByStudent.has(row.student_id)) {
          latestSessionByStudent.set(row.student_id, { id: row.id });
        }
      });
    }

    // Save clinical observations and audio segments per student
    let hasAudioSegmentsInsertError = false;
    for (const merged of mergedStudents) {
      const student = selectedStudents.find(s => s.name.toLowerCase() === merged.student_name.toLowerCase());
      if (!student || !succeededStudentIds.has(student.id)) continue;

      const sessionData = latestSessionByStudent.get(student.id);
      if (!sessionData) continue;

      // Save clinical observations
      if (merged.clinical_observations && merged.clinical_observations.length > 0) {
        const observationsToInsert = merged.clinical_observations.map(obs => ({
          student_id: student.id, observation_text: obs.observation_text, categories: obs.categories, severity: obs.severity, session_id: sessionData.id, is_resolved: false,
        }));
        const { error } = await supabase.from('student_observations').insert(observationsToInsert);
        if (error) {
          logger.error('Error saving clinical observations:', error);
          notify.error(i18n.modules.workouts.warning, { description: `${i18n.modules.workouts.clinicalObservationsNotSaved}: ${student.name}` });
        }
      }

      // Save audio segments (transcription data)
      if (accumulatedRecordings.length > 0) {
        const audioSegments = accumulatedRecordings
          .filter((recording) => recording.rawTranscription)
          .map((recording) => ({
            session_id: sessionData.id,
            segment_order: recording.recordingNumber,
            raw_transcription: recording.rawTranscription || 'Sem transcrição disponível',
            edited_transcription: recording.editedTranscription || null,
          }));
        if (audioSegments.length > 0) {
          const { error: segmentsError } = await supabase.from('session_audio_segments').insert(audioSegments);
          if (segmentsError) {
            logger.error('Error saving audio segments for group:', segmentsError);
            hasAudioSegmentsInsertError = true;
          }
        }
      }
    }

    if (hasAudioSegmentsInsertError) {
      notify.warning("Sessão salva com pendências", {
        description: "Algumas transcrições não foram salvas. Os exercícios da sessão foram preservados.",
      });
    }

    // Falha parcial: o diálogo continua aberto só com quem falhou — "Salvar"
    // de novo não regrava quem já entrou e ninguém perde a gravação.
    if (failedNames.size > 0) {
      setMergedStudents(prev => prev.filter(m => failedNames.has(m.student_name.toLowerCase())));
      return;
    }

    setVoiceSegmentCount(0);
    setSelectedStudents([]);
    setAccumulatedRecordings([]);
    setCurrentRecordingNumber(1);
    setMergedStudents([]);
    setValidationIssues({ errors: [], warnings: [] });
    setDialogState('context-setup');
    onOpenChange(false);
  };

  const handleSaveManual = async (data: ManualSavePayload): Promise<void> => {
    setIsSaving(true);
    try {
      if (!trainer || trainer.trim() === '') { notify.error("Campo obrigatório", { description: "Nome do treinador é obrigatório" }); throw new Error("Nome do treinador é obrigatório"); }
      if (data.studentExercises.length === 0) { notify.error("Nenhum aluno selecionado", { description: "É necessário ter pelo menos 1 aluno com exercícios" }); throw new Error("Nenhum aluno selecionado"); }

      const validationErrors: string[] = [];
      data.studentExercises.forEach((se, idx) => {
        const student = selectedStudents.find(s => s.id === se.studentId);
        const studentName = student?.name || `Aluno ${idx + 1}`;
        if (se.exercises.length === 0) validationErrors.push(`${studentName}: nenhum exercício registrado`);
        se.exercises.forEach((ex, exIdx) => {
          if (!ex.exercise_name || ex.exercise_name.trim() === '') validationErrors.push(`${studentName} - Exercício ${exIdx + 1}: nome obrigatório`);
          if (!ex.exercise_library_id) validationErrors.push(`${studentName} - ${ex.exercise_name || `Exercício ${exIdx + 1}`}: selecione um exercício cadastrado`);
          if (ex.sets <= 0) validationErrors.push(`${studentName} - ${ex.exercise_name}: séries deve ser maior que 0`);
          if (ex.reps <= 0) validationErrors.push(`${studentName} - ${ex.exercise_name}: reps deve ser maior que 0`);
          const matchedPrescribed = prescriptionDetails?.exercises?.find(
            (pe: PrescriptionExerciseDetail) =>
              (ex.exercise_library_id && pe.exercise_library_id === ex.exercise_library_id) ||
              pe.exercise_name === ex.exercise_name ||
              pe.exercises_library?.name === ex.exercise_name
          );
          const exCategory = matchedPrescribed?.category?.toLowerCase() || '';
          const isLoadExempt = exCategory === 'respiracao' || exCategory === 'lmf';
          if (!isLoadExempt && (!ex.load_breakdown || ex.load_breakdown.trim() === '')) validationErrors.push(`${studentName} - ${ex.exercise_name}: descrição da carga obrigatória`);
        });
      });

      if (validationErrors.length > 0) {
        notify.error("Dados incompletos", { description: validationErrors.slice(0, 3).join('; ') + (validationErrors.length > 3 ? '...' : '') });
        throw new Error("Dados incompletos");
      }

      // Quem já foi salvo numa tentativa anterior NÃO é reenviado — evita
      // sessão duplicada no "tentar de novo". Duas fontes:
      // - memória desta abertura do diálogo (confiável: mesma aula);
      // - registro local da aba, SÓ se for a mesma aula (mesmo horário) E o
      //   banco confirmar a sessão com exercícios — nunca pula gravação de
      //   outra aula da mesma pessoa no mesmo dia.
      const localRecord = readLocallySaved(effectivePrescriptionId ?? null, date);
      const confirmedFromLocal: string[] = [];
      if (localRecord && localRecord.time === time) {
        for (const id of localRecord.ids) {
          if (manualSavedStudentIds.includes(id)) continue;
          const inDb = await hasRecentGroupSession(
            supabase as unknown as SessionsClient,
            { studentId: id, date, time, prescriptionId: effectivePrescriptionId ?? null },
          );
          if (inDb) confirmedFromLocal.push(id);
        }
      }
      const alreadySaved = new Set([...manualSavedStudentIds, ...confirmedFromLocal]);
      const sessionsToCreate = data.studentExercises
        .filter(se => !alreadySaved.has(se.studentId))
        .map(se => {
          const student = selectedStudents.find(s => s.id === se.studentId);
          return {
            student_id: se.studentId, student_name: student?.name || '',
            exercises: se.exercises.map(ex => ({ exercise_library_id: ex.exercise_library_id ?? null, executed_exercise_name: ex.exercise_name, sets: ex.sets, reps: ex.reps, reserve_reps: ex.reserve_reps || null, load_kg: ex.load_kg, load_breakdown: ex.load_breakdown, observations: ex.observations, is_best_set: false }))
          };
        });

      const saveOneStudent = async (session: (typeof sessionsToCreate)[number]): Promise<"created" | "existing"> => {
        // Idempotência: não regrava quem já entrou (fechar/reabrir após falha
        // parcial, ou outro aparelho com o mesmo rascunho).
        const alreadyInDb = await hasRecentGroupSession(
          supabase as unknown as SessionsClient,
          { studentId: session.student_id, date, time, prescriptionId: effectivePrescriptionId ?? null },
        );
        if (alreadyInDb) return "existing";
        const { data: workoutSession, error: sessionError } = await supabase.from("workout_sessions").insert({ student_id: session.student_id, prescription_id: effectivePrescriptionId, date, time, session_type: 'group', trainer_name: trainer, is_finalized: true, can_reopen: true }).select("id").single();
        if (sessionError) throw sessionError;
        const exercisesToInsert = session.exercises.map((ex) => ({ session_id: workoutSession.id, exercise_library_id: ex.exercise_library_id ?? null, exercise_name: ex.executed_exercise_name, sets: ex.sets, reps: ex.reps, reserve_reps: ex.reserve_reps || null, load_kg: ex.load_kg, load_breakdown: ex.load_breakdown, observations: ex.observations || null }));
        const { error: exercisesError } = await supabase.from("exercises").insert(exercisesToInsert);
        if (exercisesError) {
          // Atomicidade (#5): reverte a sessão recém-criada deste aluno se os
          // exercícios falharem, evitando sessão órfã (sem exercícios).
          const { error: rollbackError } = await supabase.from("workout_sessions").delete().eq("id", workoutSession.id);
          if (rollbackError) logger.error("Falha ao reverter sessão órfã (grupo manual):", rollbackError);
          throw exercisesError;
        }
        return "created";
      };

      // Cada pessoa é salva e contabilizada separadamente; uma falha não
      // esconde as que já entraram.
      const outcome: GroupSaveOutcome = {
        saved: selectedStudents
          .filter(s => alreadySaved.has(s.id))
          .map(s => (confirmedFromLocal.includes(s.id) ? `${s.name} (já registrada)` : s.name)),
        failed: [],
      };
      const newlySavedIds: string[] = [];
      for (const session of sessionsToCreate) {
        try {
          const result = await saveOneStudent(session);
          newlySavedIds.push(session.student_id);
          outcome.saved.push(result === "existing" ? `${session.student_name} (já registrada)` : session.student_name);
        } catch (studentError) {
          logger.error(`Erro ao salvar a sessão de ${session.student_name}:`, studentError);
          outcome.failed.push({ name: session.student_name, reason: buildErrorDescription(studentError) || 'erro desconhecido' });
        }
      }

      if (outcome.failed.length > 0) {
        if (newlySavedIds.length > 0) {
          setManualSavedStudentIds(prev => [...prev, ...newlySavedIds]);
          rememberLocallySaved(effectivePrescriptionId ?? null, date, time, newlySavedIds);
          // Quem entrou aparece na tela mesmo com o lote incompleto.
          await invalidateSessionQueries(queryClient, { includeStudentsData: true, studentIds: newlySavedIds });
        }
        setLastPartialSave(outcome);
        notify.error(
          outcome.saved.length === 0 ? "Sessões não salvas" : "Algumas sessões não foram salvas",
          { description: describePartialGroupSave(outcome) },
        );
        // Mantém o rascunho (ExerciseFirstSessionEntry só limpa em sucesso).
        throw new PartialGroupSaveError();
      }

      // Gravação direta no banco (sem hook de mutação): quem escreve invalida,
      // senão a aba Sessões e os indicadores seguem mostrando o estado velho.
      await invalidateSessionQueries(queryClient, {
        includeStudentsData: true,
        studentIds: selectedStudents.map(s => s.id),
      });

      const total = outcome.saved.length;
      notify.success(total === 1 ? "1 sessão salva" : `${total} sessões salvas`, { description: outcome.saved.join(", ") });
      setManualSavedStudentIds([]);
      forgetLocallySaved(effectivePrescriptionId ?? null, date);
      setLastPartialSave(null);
      setDialogState('context-setup');
      setSelectedStudents([]);
      setTrainer('');
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTime(getCurrentSessionTimeHHmm());
      setHasAutoSelected(false);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof PartialGroupSaveError) throw error;
      logger.error("Erro no salvamento manual:", error);
      let errorMessage = "Erro desconhecido";
      if (error instanceof Error) {
        if (error.message.includes('connection')) errorMessage = "Erro de conexão com o banco de dados";
        else if (error.message.includes('foreign key')) errorMessage = "Pessoa ou prescrição não encontrada";
        else errorMessage = error.message;
      }
      if (!(error instanceof Error && ['Dados incompletos', 'Nenhum aluno selecionado', 'Nome do treinador é obrigatório'].includes(error.message))) {
        notify.error("Não foi possível salvar as sessões", { description: errorMessage });
      }
      throw error;
    } finally { setIsSaving(false); }
  };

  // ─── Close Protection ────────────────────────────────────────

  // O que se perde ao fechar/voltar agora. A entrada manual tem rascunho
  // automático (volta ao reabrir); gravações e revisão de voz, não.
  const pendingLoss: string | null = (() => {
    const recordings = Math.max(voiceSegmentCount, accumulatedRecordings.length);
    if (['recording', 'preview', 'edit'].includes(dialogState) && recordings > 0) {
      return recordings === 1
        ? 'A gravação transcrita e a revisão serão descartadas.'
        : `As ${recordings} gravações transcritas e a revisão serão descartadas.`;
    }
    return null;
  })();

  const closeDialog = () => {
    // Reset internal prescription selection so the next open starts clean
    setSelectedPrescriptionId(null);
    onOpenChange(false);
  };

  const handleCloseAttempt = (shouldClose: boolean) => {
    if (shouldClose) {
      onOpenChange(true);
      return;
    }
    if (pendingLoss && !createGroupSessions.isPending) {
      setDiscardAction('close');
      return;
    }
    if (dialogState === 'manual-entry' && hasUnsavedChanges({ date, time, trainer, prescriptionId: effectivePrescriptionId, selectedStudents, studentExercises: {} })) {
      notify.info("Rascunho guardado", { description: "Os dados digitados voltam quando você reabrir o registro desta prescrição." });
    }
    closeDialog();
  };

  const handleBackFromVoice = () => {
    if (pendingLoss) {
      setDiscardAction('back');
      return;
    }
    handleBack();
  };

  const handleConfirmDiscard = () => {
    const action = discardAction;
    setDiscardAction(null);
    if (action === 'close') closeDialog();
    else if (action === 'back') handleBack();
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dialogState === 'manual-entry' && hasUnsavedChanges({ date, time, trainer, prescriptionId: effectivePrescriptionId, selectedStudents, studentExercises: {} })) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    if (open) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [open, dialogState, date, time, trainer, effectivePrescriptionId, selectedStudents, hasUnsavedChanges]);

  // Auto-select students
  useEffect(() => {
    if (open && assignments && enrichedStudents && !hasAutoSelected) {
      const currentDate = new Date();
      const weekdayMap: { [key: number]: string } = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
      const currentWeekday = weekdayMap[currentDate.getDay()];
      const currentTime = getCurrentSessionTimeHHmm();
      const relevantAssignments = assignments.filter(assignment => {
        const customAdaptations = assignment.custom_adaptations;
        if (!isAssignmentScheduleAdaptations(customAdaptations)) return false;
        const hasWeekday = customAdaptations.weekdays?.includes(currentWeekday);
        if (!hasWeekday) return false;
        if (customAdaptations.time) {
          const [assignedHour, assignedMin] = customAdaptations.time.split(':').map(Number);
          const [currentHour, currentMin] = currentTime.split(':').map(Number);
          return Math.abs((assignedHour * 60 + assignedMin) - (currentHour * 60 + currentMin)) <= 5;
        }
        return true;
      });
      const studentsToSelect = enrichedStudents.filter(student => relevantAssignments.some(a => a.student_id === student.id));
      if (studentsToSelect.length > 0) {
        setSelectedStudents(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newStudents = studentsToSelect.filter(s => !existingIds.has(s.id));
          return newStudents.length > 0 ? [...prev, ...newStudents] : prev;
        });
        setHasAutoSelected(true);
      }
    }
  }, [open, assignments, enrichedStudents, hasAutoSelected]);

  useEffect(() => {
    if (!open) {
      setDialogState('context-setup');
      setSelectedStudents([]);
      setAccumulatedRecordings([]);
      setCurrentRecordingNumber(1);
      setMergedStudents([]);
      setValidationIssues({ errors: [], warnings: [] });
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTime(getCurrentSessionTimeHHmm());
      setHasAutoSelected(false);
      setTrainer('');
      setManualSavedStudentIds([]);
      setLastPartialSave(null);
      setVoiceSegmentCount(0);
      setDiscardAction(null);
    }
  }, [open]);

  // ─── Add Unmentioned Exercises ────────────────────────────────────────

  const handleAddUnmentionedExercises = () => {
    const prescribedExercises = prescriptionDetails?.exercises?.filter((ex: PrescriptionExerciseDetail) => ex.should_track !== false) || [];
    const updatedMergedStudents = mergedStudents.map(student => {
      const unmentionedExercises = prescribedExercises.filter((prescribed: PrescriptionExerciseDetail) => {
        const prescribedName = (prescribed.exercise_name || prescribed.exercises_library?.name || '').toLowerCase().trim();
        return !student.exercises.some(ex => {
          const executedName = ex.executed_exercise_name.toLowerCase().trim();
          return executedName.includes(prescribedName) || prescribedName.includes(executedName) || executedName === prescribedName;
        }) && prescribedName;
      });
      const newExercises: SessionExercise[] = unmentionedExercises.map((prescribed: PrescriptionExerciseDetail) => ({
        prescribed_exercise_name: prescribed.exercise_name || prescribed.exercises_library?.name,
        exercise_library_id: prescribed.exercise_library_id ?? null,
        executed_exercise_name: prescribed.exercise_name || prescribed.exercises_library?.name || '',
        sets: parseInt(prescribed.sets) || null, reps: null, reserve_reps: prescribed.pse || null, load_kg: null, load_breakdown: '',
        observations: 'Prescrito, não citado no áudio: preencher', is_best_set: false,
      }));
      return { ...student, exercises: [...student.exercises, ...newExercises] };
    });
    setMergedStudents(updatedMergedStudents);
    setValidationIssues(validateMergedData(updatedMergedStudents));
    notify.success('Exercícios não citados incluídos para preenchimento');
  };

  // ─── Render ────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleCloseAttempt}>
      <DialogContent
        forceMount
        className="max-w-7xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {dialogState === 'context-setup' && NAV_LABELS.recordGroupSession}
            {dialogState === 'mode-selection' && (<><User className="h-5 w-5" />Escolher modo de registro</>)}
            {dialogState === 'recording' && (<><Mic className="h-5 w-5" aria-hidden="true" />Gravação {currentRecordingNumber}</>)}
            {dialogState === 'manual-entry' && (<><BookOpen className="h-5 w-5" aria-hidden="true" />Registro manual da sessão</>)}
            {dialogState === 'processing' && 'Processando…'}
            {dialogState === 'preview' && 'Revisar sessão'}
            {dialogState === 'edit' && `Corrigindo: ${mergedStudents[editingStudentIndex]?.student_name}`}
          </DialogTitle>
        </DialogHeader>

        {dialogState === 'context-setup' && (
          <div className="space-y-6">
            {requiresPrescriptionSelection && (
              <div className="space-y-2">
                <Label htmlFor="prescription-select">Prescrição *</Label>
                <Select value={selectedPrescriptionId ?? ''} onValueChange={handlePrescriptionChange}>
                  <SelectTrigger
                    id="prescription-select"
                    className={showValidation && !effectivePrescriptionId ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="Selecione uma prescrição em grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupPrescriptionOptions.map((prescription) => (
                      <SelectItem key={prescription.id} value={prescription.id}>
                        {prescription.name}
                        {prescription.assigned_students_count ? ` · ${prescription.assigned_students_count} aluno(s)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {effectivePrescriptionId && enrichedStudents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Esta prescrição não tem alunos atribuídos. Atribua alunos antes de registrar a sessão em grupo.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Apenas alunos atribuídos à prescrição selecionada aparecem na lista abaixo.
                  </p>
                )}
              </div>
            )}

            <SessionSetupForm
              date={date}
              time={time}
              trainerName={trainer}
              selectedStudents={selectedStudents}
              onDateChange={setDate}
              onTimeChange={setTime}
              onTrainerNameChange={setTrainer}
              onStudentToggle={toggleStudent}
              prescriptionId={effectivePrescriptionId}
              showValidation={showValidation}
              availableStudents={requiresPrescriptionSelection ? enrichedStudents : undefined}
              allowNewStudent={!requiresPrescriptionSelection}
              emptyStudentsMessage={
                !effectivePrescriptionId
                  ? "Selecione uma prescrição para listar os alunos atribuídos"
                  : "Nenhum aluno atribuído a esta prescrição"
              }
            />
          </div>
        )}

        {dialogState === 'mode-selection' && (
          <div className="space-y-6 py-8">
            <p className="text-center text-muted-foreground">Escolha como deseja registrar a sessão em grupo:</p>
            <div className="grid gap-4 md:grid-cols-2">
              <Button variant="outline" size="lg" className="h-32 flex flex-col gap-4 items-center justify-center" onClick={() => handleModeSelection('voice')}>
                <Mic className="h-12 w-12" />
                <div className="text-center">
                  <div className="font-semibold">{NAV_LABELS.recordByVoice}</div>
                  <div className="text-xs text-muted-foreground mt-1">Grave uma única sessão contínua e processe no final</div>
                </div>
              </Button>
              <Button variant="outline" size="lg" className="h-32 flex flex-col gap-4 items-center justify-center" onClick={() => handleModeSelection('manual')}>
                <BookOpen className="h-12 w-12" />
                <div className="text-center">
                  <div className="font-semibold">{NAV_LABELS.fillManually}</div>
                  <div className="text-xs text-muted-foreground mt-1">Preencha os dados da sessão manualmente</div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {dialogState === 'recording' && (
          <div className="space-y-4">
            {/* Students Header */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" aria-hidden="true" /> Participantes
                  <Badge variant="secondary" className="ml-auto">{selectedStudents.length}</Badge>
                  <Button type="button" variant="ghost" size="sm" onClick={handleAddStudentToGroup} className="min-h-10 gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" /> Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedStudents.map(student => {
                    const initials = student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <Badge key={student.id} variant="outline" className="px-3 py-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">{initials}</div>
                          <span>{student.name}</span>
                        </div>
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Prescription Sidebar + Recorder */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <PrescriptionSidebar exercises={prescriptionDetails?.exercises || []} />
              </div>
              <div className="lg:col-span-3">
                <MultiSegmentRecorder
                  onSegmentsChange={setVoiceSegmentCount}
                  prescriptionId={effectivePrescriptionId || undefined}
                  selectedStudents={selectedStudents.map(s => ({ id: s.id, name: s.name, weight_kg: s.weight_kg }))}
                  date={date} time={time}
                  onComplete={(segments) => {
                    // Auditoria R3 #3: a edge de voz não devolve exercise_library_id;
                    // sem resolução, TODO exercício ditado caía na validação
                    // "selecione um exercício cadastrado" e exigia remap manual.
                    // O LLM enxerga os nomes da prescrição, então casar por nome
                    // normalizado contra a própria prescrição resolve o caso real.
                    const prescLibByName = new Map<string, ExerciseLibraryMatch>();
                    for (const pex of prescriptionDetails?.exercises || []) {
                      if (!pex.exercise_library_id || !pex.exercise_name) continue;
                      const key = normalizeExerciseLibraryMatchName(pex.exercise_name);
                      if (key) prescLibByName.set(key, { id: pex.exercise_library_id, name: pex.exercise_name });
                    }
                    const resolveByPrescriptionName = (...names: Array<string | undefined>): string | null => {
                      for (const n of names) {
                        if (!n) continue;
                        const hit = prescLibByName.get(normalizeExerciseLibraryMatchName(n));
                        if (hit) return hit.id;
                      }
                      return null;
                    };
                    // Map raw audio data to typed SessionExercise/GroupObservation
                    const mapRawExercise = (raw: {
                      name?: string;
                      executed_exercise_name?: string;
                      exercise_library_id?: string | null;
                      reps?: number | null;
                      reserve_reps?: string | null;
                      load_kg?: number | null;
                      load_breakdown?: string | null;
                      observations?: string | null;
                    }): SessionExercise => ({
                      executed_exercise_name: raw.executed_exercise_name ?? raw.name ?? '',
                      exercise_library_id: raw.exercise_library_id
                        ?? resolveByPrescriptionName(raw.executed_exercise_name, raw.name),
                      reps: raw.reps ?? null,
                      reserve_reps: raw.reserve_reps ?? null,
                      load_kg: raw.load_kg ?? null,
                      load_breakdown: raw.load_breakdown ?? '',
                      observations: raw.observations ?? null,
                      is_best_set: false,
                    });
                    const mapRawObs = (raw: { observation: string }): GroupObservation => ({
                      observation_text: raw.observation,
                      categories: ['geral'],
                      severity: 'média',
                    });

                    const sessionsByStudent = segments.reduce((acc, segment) => {
                      if (!segment.extractedData?.sessions) return acc;
                      segment.extractedData.sessions.forEach(session => {
                        const mappedExercises = session.exercises.map(mapRawExercise);
                        const mappedObs = session.clinical_observations.map(mapRawObs);
                        const existing = acc.find(s => s.student_name.toLowerCase() === session.student_name.toLowerCase());
                        if (existing) {
                          mappedExercises.forEach(newEx => {
                            const newExName = newEx.executed_exercise_name.toLowerCase().trim();
                            const duplicateIndex = existing.exercises.findIndex(existingEx => {
                              const existingExName = existingEx.executed_exercise_name.toLowerCase().trim();
                              return existingExName === newExName || existingExName.includes(newExName) || newExName.includes(existingExName);
                            });
                            if (duplicateIndex >= 0) {
                              if ((newEx.load_kg || 0) >= (existing.exercises[duplicateIndex].load_kg || 0)) existing.exercises[duplicateIndex] = newEx;
                            } else { existing.exercises.push(newEx); }
                          });
                          existing.clinical_observations = [...existing.clinical_observations, ...mappedObs];
                        } else {
                          acc.push({ student_name: session.student_name, exercises: [...mappedExercises], clinical_observations: [...mappedObs] });
                        }
                      });
                      return acc;
                    }, [] as Array<{ student_name: string; exercises: SessionExercise[]; clinical_observations: GroupObservation[] }>);
                    handleSessionData({ sessions: sessionsByStudent });
                  }}
                  onError={handleError}
                />
              </div>
            </div>
          </div>
        )}

        {dialogState === 'manual-entry' && !lastPartialSave && pendingLocalRecord && pendingLocalRecord.time !== time && (
          <Alert variant="info" className="mb-4" aria-live="polite">
            <AlertDescription className="flex flex-wrap items-center gap-2">
              <span>
                Há um registro não concluído desta prescrição às {pendingLocalRecord.time}
                {pendingLocalRecord.names.length > 0 ? ` (${pendingLocalRecord.names.join(", ")} já salvas)` : ""}.
                Para retomar essa aula, use o mesmo horário.
              </span>
              <Button type="button" size="sm" variant="outline" className="min-h-10" onClick={() => setTime(pendingLocalRecord.time)}>
                Usar {pendingLocalRecord.time}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {dialogState === 'manual-entry' && lastPartialSave && (
          <Alert variant="warning" className="mb-4" aria-live="polite">
            <AlertDescription>{describePartialGroupSave(lastPartialSave)}</AlertDescription>
          </Alert>
        )}

        {dialogState === 'manual-entry' && (
          <ManualEntryWithToggle
            prescriptionDetails={prescriptionDetails}
            selectedStudents={selectedStudents}
            date={date} time={time} trainer={trainer}
            prescriptionId={effectivePrescriptionId || null}
            onSave={handleSaveManual}
            onCancel={() => setDialogState('mode-selection')}
            onAddStudent={handleAddStudentToGroup}
          />
        )}

        {dialogState === 'preview' && mergedStudents.length > 0 && (
          <div className="space-y-4">
            {accumulatedRecordings.length > 1 && (
              <p className="text-sm text-muted-foreground">{accumulatedRecordings.length} gravações consolidadas</p>
            )}

            <ValidationAlerts
              errors={validationIssues.errors}
              warnings={validationIssues.warnings}
              showAddUnmentioned={validationIssues.warnings.some(w => w.includes(UNMENTIONED_MARKER))}
              onAddUnmentionedExercises={handleAddUnmentionedExercises}
            />

            {/* A rolagem é a do próprio diálogo (sem scroll dentro de scroll) */}
            <div>
              {mergedStudents.map((student, idx) => (
                <Card key={idx} className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      <User className="h-5 w-5" aria-hidden="true" /> {student.student_name}
                      {accumulatedRecordings.length > 1 && (
                        <Badge variant="outline" className="text-xs">Gravações: {student.recording_numbers.join(', ')}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {student.clinical_observations.length > 0 && (
                      <ObservationPreview observations={student.clinical_observations} />
                    )}
                    <div>
                      <p className="font-semibold text-sm mb-2">{student.exercises.length === 1 ? '1 exercício' : `${student.exercises.length} exercícios`}</p>
                      <div className="space-y-2">
                        {student.exercises.map((ex, exIdx) => (
                          <ExercisePreviewCard key={exIdx} exercise={ex} />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {dialogState === 'edit' && mergedStudents[editingStudentIndex] && (
          <div>
            <div className="space-y-6">
              <ObservationEditor
                observations={editableObservations}
                onObservationsChange={setEditableObservations}
                createEmpty={() => ({ observation_text: '', categories: ['geral'], severity: 'média' as const })}
                renderCategorySelector={(obs, _idx, onChange) => (
                  <Select value={obs.categories?.[0] || 'geral'} onValueChange={(value) => onChange({ ...obs, categories: [value] })}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dor">Dor</SelectItem>
                      <SelectItem value="mobilidade">Mobilidade</SelectItem>
                      <SelectItem value="força">Força</SelectItem>
                      <SelectItem value="técnica">Técnica</SelectItem>
                      <SelectItem value="geral">Geral</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />

              <ExerciseEditor
                exercises={editableExercises}
                onExercisesChange={setEditableExercises}
                onOpenExerciseSelection={openExerciseSelection}
              />
            </div>
          </div>
        )}

        {/* CTA sempre à vista: rodapé fixo no fundo do diálogo que rola (a entrada
            manual tem rodapé próprio). */}
        <DialogFooter className={dialogState === 'manual-entry' ? "hidden" : STICKY_FOOTER_CLASS}>
          {dialogState === 'context-setup' && (
            <>
              <Button variant="ghost" size="touch" onClick={closeDialog}>Cancelar</Button>
              <Button size="touch" onClick={() => {
                if (!isContextValid) {
                  setShowValidation(true);
                  notify.error(
                    !effectivePrescriptionId
                      ? "Selecione uma prescrição antes de continuar"
                      : "Preencha todos os campos obrigatórios"
                  );
                  return;
                }
                setShowValidation(false);
                setDialogState('mode-selection');
              }}>Continuar</Button>
            </>
          )}
          
          {dialogState === 'mode-selection' && (
            <Button variant="ghost" size="touch" onClick={() => setDialogState('context-setup')}>Voltar</Button>
          )}

          {dialogState === 'recording' && (
            <Button variant="ghost" size="touch" onClick={handleBackFromVoice}>Voltar</Button>
          )}

          {dialogState === 'preview' && (
            <>
              <Button variant="ghost" size="touch" onClick={handleBackFromVoice} disabled={createGroupSessions.isPending}>Voltar</Button>
              <Button variant="ghost" size="touch" onClick={handleStartEditing} disabled={createGroupSessions.isPending}><Pencil className="h-4 w-4" aria-hidden="true" />Corrigir dados</Button>
              <Button size="touch" onClick={handleSave} disabled={validationIssues.errors.length > 0 || createGroupSessions.isPending}>
                <Save className="h-4 w-4" aria-hidden="true" />{createGroupSessions.isPending ? "Salvando…" : "Salvar sessão"}
              </Button>
            </>
          )}

          {dialogState === 'edit' && (
            <>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon-touch" aria-label="Pessoa anterior" onClick={() => handleNavigateStudent('prev')} disabled={editingStudentIndex === 0}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm text-muted-foreground">{editingStudentIndex + 1} de {mergedStudents.length}</span>
                <Button variant="outline" size="icon-touch" aria-label="Próxima pessoa" onClick={() => handleNavigateStudent('next')} disabled={editingStudentIndex === mergedStudents.length - 1}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <Button variant="ghost" size="touch" onClick={() => setDialogState('preview')}>Descartar correções</Button>
              <Button size="touch" onClick={handleSaveEdits}>Concluir correção</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      <DiscardSessionConfirm
        open={discardAction !== null}
        onOpenChange={(next) => { if (!next) setDiscardAction(null); }}
        onConfirm={handleConfirmDiscard}
        description={pendingLoss ?? 'Os dados desta sessão ainda não foram salvos.'}
      />

      <ExerciseSelectionDialog open={exerciseSelectionOpen} onOpenChange={setExerciseSelectionOpen}
        currentExerciseName={selectedExerciseForReplacement?.currentName || ""} onExerciseSelected={handleExerciseSelected} autoSuggest={true} />
      <AddStudentDialog open={showAddStudentDialog} onOpenChange={setShowAddStudentDialog} onStudentCreated={handleStudentCreated} />
    </Dialog>
  );
}
