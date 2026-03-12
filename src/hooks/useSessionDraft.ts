import { useState, useEffect, useCallback, useRef } from 'react';
import { notify } from '@/lib/notify';
import { logger } from '@/utils/logger';
import { useSessionDraftHistory } from './useSessionDraftHistory';

interface Student {
  id: string;
  name: string;
  weight_kg?: number;
}

interface StudentExercises {
  [studentId: string]: Array<{
    exercise_name: string;
    sets: number;
    reps: number;
    load_kg: number | null;
    load_breakdown: string;
    observations: string;
  }>;
}

interface SessionDraft {
  timestamp: string;
  date: string;
  time: string;
  trainer: string;
  prescriptionId: string | null;
  selectedStudents: Student[];
  studentExercises: StudentExercises;
}

// INC-006: Key is no longer hardcoded — uses prescriptionId when available
const DRAFT_KEY_PREFIX = 'session_draft_v2_';
const DEBOUNCE_MS = 1000;
const SAVE_TO_HISTORY_INTERVAL = 60000; // Salvar no histórico a cada 60 segundos

export function useSessionDraft(entityId: string = 'default') {
  const draftKey = `${DRAFT_KEY_PREFIX}${entityId}`;
  const { saveDraftToHistory } = useSessionDraftHistory();
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastHistorySave, setLastHistorySave] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Carregar rascunho ao montar
  useEffect(() => {
    const stored = localStorage.getItem(draftKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SessionDraft;
        setDraft(parsed);
        setLastSaved(new Date(parsed.timestamp));
        
        notify.info("Rascunho encontrado", {
          description: "Seus dados foram restaurados automaticamente",
        });
      } catch (error) {
        logger.error('Erro ao carregar rascunho:', error);
        localStorage.removeItem(draftKey);
      }
    }
  }, [draftKey]);

  // Salvar rascunho com debounce
  const saveDraft = useCallback((data: Partial<SessionDraft>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);

    saveTimeoutRef.current = setTimeout(() => {
      const draftData: SessionDraft = {
        timestamp: new Date().toISOString(),
        date: data.date || '',
        time: data.time || '',
        trainer: data.trainer || '',
        prescriptionId: data.prescriptionId || null,
        selectedStudents: data.selectedStudents || [],
        studentExercises: data.studentExercises || {},
      };

      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setDraft(draftData);
      setLastSaved(new Date());
      setIsSaving(false);

      // Verificar se deve salvar no histórico (a cada 60 segundos)
      const now = Date.now();
      const shouldSaveToHistory = !lastHistorySave || 
        (now - lastHistorySave.getTime() > SAVE_TO_HISTORY_INTERVAL);

      if (shouldSaveToHistory && Object.keys(draftData.studentExercises).length > 0) {
        saveDraftToHistory(draftData);
        setLastHistorySave(new Date());
      }
    }, DEBOUNCE_MS);
  }, [draftKey, lastHistorySave, saveDraftToHistory]);

  // Limpar rascunho
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setDraft(null);
    setLastSaved(null);
    setLastHistorySave(null);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }
  }, [draftKey]);

  // INC-007: Compare individual fields instead of JSON.stringify for stability
  const hasUnsavedChanges = useCallback((currentData: Partial<SessionDraft>) => {
    if (!draft) return false;
    
    return (
      currentData.date !== draft.date ||
      currentData.time !== draft.time ||
      currentData.trainer !== draft.trainer ||
      currentData.prescriptionId !== draft.prescriptionId ||
      (currentData.selectedStudents?.length ?? 0) !== (draft.selectedStudents?.length ?? 0) ||
      JSON.stringify(currentData.studentExercises) !== JSON.stringify(draft.studentExercises)
    );
  }, [draft]);

  // Restaurar de um rascunho do histórico
  const restoreDraft = useCallback((draftData: SessionDraft) => {
    localStorage.setItem(draftKey, JSON.stringify(draftData));
    setDraft(draftData);
    setLastSaved(new Date(draftData.timestamp));
    notify.success("Rascunho restaurado", {
      description: "Os dados foram carregados do histórico",
    });
  }, [draftKey]);

  // Cleanup ao desmontar
  useEffect(() => {
    const saveTimeout = saveTimeoutRef.current;
    const historyTimeout = historyTimeoutRef.current;

    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      if (historyTimeout) {
        clearTimeout(historyTimeout);
      }
    };
  }, []);

  return {
    draft,
    saveDraft,
    clearDraft,
    restoreDraft,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
  };
}
